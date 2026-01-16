import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import Constants from 'expo-constants';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import { environment } from '../config/environment';
import configService from './configService';
import { SessionContext, contextToString } from '../types/sessionContext';

// Global type for hot-reload persistence
declare global {
  var __audioCallService: AudioCallService | undefined;
}

export interface AudioCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';
}

export interface AudioCallEvents {
  onStateChange: (state: AudioCallState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onError: (error: string) => void;
  onCallAnswered: () => void;
  onCallRejected: () => void;
  onCallTimeout: () => void;
}

class AudioCallService {
  private static instanceCounter = 0;
  private static activeInstance: AudioCallService | null = null;
  private instanceId: number;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: WebSocket | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private events: AudioCallEvents | null = null;
  private callTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reofferTimer: ReturnType<typeof setInterval> | null = null;
  private isCallAnswered: boolean = false;
  private appointmentId: string | null = null; // Legacy: kept for backward compatibility
  private context: SessionContext | null = null; // New: session context (preferred)
  private userId: string | null = null;
  private doctorName: string | null = null;
  private doctorProfilePicture: string | null = null;
  private processedMessages: Set<string> = new Set();
  private isProcessingIncomingCall: boolean = false;
  private isIncoming: boolean = false;
  // Incoming-call gating and lifecycle guards
  private isIncomingMode: boolean = false;
  private hasAccepted: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private pendingOffer: RTCSessionDescription | null = null;
  private hasEnded: boolean = false;
  // Idempotency guards
  private didConnect: boolean = false;
  private didEmitAnswered: boolean = false;
  // Graceful disconnect guard
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  // Reconnection state
  private isReconnecting: boolean = false;
  private reconnectionTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectionAttempts: number = 0;
  // Queue for signaling messages before WebSocket opens
  private messageQueue: any[] = [];
  private signalingFlushTimer: ReturnType<typeof setInterval> | null = null;
  // Avoid duplicate re-notify calls per instance
  private reNotifyAttempted: boolean = false;
  // Offer creation guard (separate from overall initialization)
  private creatingOffer: boolean = false;
  // Backend start/re-notify guard per call attempt
  private callStartAttempted: boolean = false;
  // Additional state properties
  private isInitializing: boolean = false;
  private offerCreated: boolean = false;
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';
  constructor() {
    this.instanceId = ++AudioCallService.instanceCounter;
    console.log(`🏗️ [AudioCallService] Instance ${this.instanceId} created`);
  }

  /**
   * Get or create singleton instance with hot-reload persistence
   */
  static getInstance(): AudioCallService {
    if (global.__audioCallService) {
      console.log(`🔄 [AudioCallService] Reusing global persistent instance ${global.__audioCallService.instanceId}`);
      return global.__audioCallService;
    }

    if (!AudioCallService.activeInstance) {
      AudioCallService.activeInstance = new AudioCallService();
      global.__audioCallService = AudioCallService.activeInstance;
      console.log(`🏗️ [AudioCallService] Created new singleton instance ${AudioCallService.activeInstance.instanceId}`);
    } else {
      console.log(`🔄 [AudioCallService] Reusing existing static instance ${AudioCallService.activeInstance.instanceId}`);
    }
    return AudioCallService.activeInstance;
  }

  /**
   * Clear active instance
   */
  static clearInstance(): void {
    const instance = global.__audioCallService || AudioCallService.activeInstance;
    if (instance) {
      console.log(`🧹 [AudioCallService] Clearing active instance ${instance.instanceId}`);
      instance.endCall();
      AudioCallService.activeInstance = null;
      global.__audioCallService = undefined;
    }
  }

  // STUN servers for NAT traversal
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // Current call state
  private state: AudioCallState = {
    isConnected: false,
    isAudioEnabled: true,
    callDuration: 0,
    connectionState: 'disconnected',
  };

  /**
   * Initialize for incoming call (when answering)
   */
  async initializeForIncomingCall(appointmentId: string, userId: string, events: AudioCallEvents): Promise<void> {
    try {
      console.log(`📞 [AudioCallService ${this.instanceId}] Initializing for incoming call...`);
      this.isIncoming = true;
      // Set audio as current to suppress any video init while ringing
      const g: any = global as any;
      g.currentCallType = 'audio';
      console.log(`📞 [AudioCallService ${this.instanceId}] Parameters:`, { appointmentId, userId });

      if (!appointmentId || appointmentId === 'null' || appointmentId === 'undefined') {
        throw new Error('Invalid appointmentId: ' + appointmentId);
      }

      // Update events even if already processing (crucial for hot-reloads)
      this.events = events;

      // Prevent multiple initializations of the connection logic
      if (this.isProcessingIncomingCall && this.state.connectionState === 'connected') {
        console.log(`⚠️ [AudioCallService ${this.instanceId}] Already connected, updated events and skipping...`);
        return;
      }

      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isCallAnswered = false;


      // After hot reload, ensure stale state is cleared
      // If we have a stale peer connection or stream from a previous session, reset them
      if (this.peerConnection && (this.state.connectionState === 'disconnected' || this.state.connectionState === 'failed')) {
        console.log('🧹 [AudioCallService] Clearing stale peer connection after hot reload');
        try {
          this.peerConnection.close();
        } catch (e) { }
        this.peerConnection = null;
      }
      if (this.localStream && (this.state.connectionState === 'disconnected' || this.state.connectionState === 'failed')) {
        console.log('🧹 [AudioCallService] Clearing stale local stream after hot reload');
        try {
          this.localStream.getTracks().forEach(track => track.stop());
        } catch (e) { }
        this.localStream = null;
      }
      // ALWAYS reset hasAccepted for a new incoming call (critical after hot reload)
      // This ensures stale state from previous sessions doesn't interfere
      this.hasAccepted = false;

      // Reset stale flags that might persist after hot reload
      if (this.state.connectionState !== 'connected' && this.state.connectionState !== 'disconnected') {
        console.log('🧹 [AudioCallService] Resetting stale connection state after hot reload');
        this.updateState({ connectionState: 'disconnected' });
      }

      // Restore pending offer from global to instance (survives reset() calls)
      if ((global as any).pendingOffer && !this.pendingOffer) {
        this.pendingOffer = (global as any).pendingOffer;
        console.log('📞 [AudioCallService] Restored pending offer from global to instance');
      }

      // Update state after events are set
      this.updateState({ connectionState: 'connecting' });

      // Set flag after basic setup is complete
      this.isProcessingIncomingCall = true;

      // Incoming mode gating: do not get media or create PC until accept
      this.isIncomingMode = true;
      this.pendingCandidates = [];
      this.hasEnded = false;

      // Connect to signaling only; buffer offer/ICE until accept
      await this.connectSignaling(appointmentId, userId);
      console.log('📞 Signaling connected for incoming call - waiting for user to accept');

      // Check both global and instance - instance survives reset() calls
      const globalPendingOffer = (global as any).pendingOffer;
      const instancePendingOffer = this.pendingOffer;
      const pendingOffer = instancePendingOffer || globalPendingOffer;
      if (pendingOffer) {
        console.log('📞 Pending offer found - waiting for user acceptance');
      } else {
        console.warn('⚠️ No pending offer found for incoming call');
        // Request re-offer from caller
        this.sendSignalingMessage({
          type: 'resend-offer-request',
          appointmentId: this.appointmentId,
          userId: this.userId,
        });
      }

      // Do not auto-create PC or answer yet; will proceed on accept

    } catch (error) {
      console.error('❌ Failed to initialize incoming call:', error);
      this.events?.onError(`Failed to initialize incoming call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
    } finally {
      this.isProcessingIncomingCall = false; // Reset flag in all cases
    }
  }

  /**
   * Check if user has remaining voice calls
   */
  private async checkCallAvailability(): Promise<boolean> {
    try {
      const authToken = await this.getAuthToken();
      const apiUrl = `${environment.LARAVEL_API_URL}/api/call-sessions/check-availability`;

      console.log('🔍 [AudioCallService] Checking call availability:', {
        apiUrl,
        hasToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          call_type: 'voice'
        })
      });

      console.log('📡 [AudioCallService] API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      let data: any = null;
      try {
        const text = await response.text();
        console.log('📄 [AudioCallService] Raw response:', text);
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Failed to parse availability response as JSON:', parseErr);
        const errorMessage = 'Failed to check call availability. Please try again.';
        this.events?.onError(errorMessage);
        return false;
      }

      console.log('📊 [AudioCallService] Parsed response:', data);

      if (data.success && data.can_make_call) {
        console.log('✅ Voice call availability confirmed:', data.remaining_calls, 'calls remaining');
        return true;
      } else {
        console.log('❌ Voice call not available:', data.message);
        this.events?.onError(data.message || 'No remaining voice calls in your subscription');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking call availability:', error);
      const errorMessage = error.message?.includes('Network request failed')
        ? 'Network error. Please check your internet connection and try again.'
        : 'Failed to check call availability. Please try again.';
      this.events?.onError(errorMessage);
      return false;
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 [AudioCallService] Retrieved auth token:', token ? 'Present' : 'Missing');
      return token || '';
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to get auth token:', error);
      return '';
    }
  }

  /**
   * Initialize audio call service
   * @param appointmentIdOrContext - Either appointmentId (legacy) or SessionContext (preferred)
   */
  async initialize(appointmentIdOrContext: string | SessionContext, userId: string, doctorId: string | number | undefined, events: AudioCallEvents, doctorName?: string, doctorProfilePicture?: string): Promise<void> {
    try {
      // Prevent multiple initializations
      if (this.isInitializing) {
        console.warn('⚠️ [AudioCallService] Already initializing - preventing duplicate');
        return;
      }

      if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
        console.warn('⚠️ [AudioCallService] Call already active - preventing duplicate initialization');
        return;
      }

      this.isInitializing = true;

      // Mark audio flow as current immediately to suppress any video init
      const g: any = global as any;
      if (g.activeVideoCall) {
        console.warn('⚠️ [AudioCallService] Video call already active; aborting audio initialization');
        events?.onError?.('Another call is active');
        this.updateState({ connectionState: 'failed' });
        this.isInitializing = false;
        return;
      }
      g.activeAudioCall = true;
      g.currentCallType = 'audio';

      this.isIncoming = false;
      this.events = events;
      
      // Determine if we received a context or appointmentId
      if (typeof appointmentIdOrContext === 'string') {
        // Legacy: appointmentId string
        this.appointmentId = appointmentIdOrContext;
        this.context = null;
        console.log(`🔌 [AudioCallService] Initializing with appointmentId (legacy): ${appointmentIdOrContext}`);
      } else {
        // New: SessionContext
        this.context = appointmentIdOrContext;
        this.appointmentId = contextToString(appointmentIdOrContext); // Use context string for backward compatibility checks
        console.log(`🔌 [AudioCallService] Initializing with session context: ${contextToString(appointmentIdOrContext)}`);
      }
      
      this.userId = userId;
      this.doctorName = doctorName || null;
      this.doctorProfilePicture = doctorProfilePicture || null;
      this.isCallAnswered = false;
      this.updateState({ connectionState: 'connecting' });

      // Note: Call availability is now checked in the UI before calling this service
      // No need to check availability here as it's already validated

      // Resolve doctorId: must not skip backend start-call
      let finalDoctorId: number | null = null;
      if (doctorId !== undefined && doctorId !== null && String(doctorId).trim() !== '') {
        // Improved number conversion with better error handling
        const parsedId = Number(doctorId);
        if (!Number.isNaN(parsedId) && parsedId > 0) {
          finalDoctorId = parsedId;
        } else {
          console.warn('⚠️ [AudioCallService] Invalid doctorId format:', doctorId);
        }
      } else {
        // Try to infer from appointment for non-direct sessions
        try {
          if (!appointmentId.startsWith('direct_session_')) {
            const resp = await fetch(`${environment.LARAVEL_API_URL}/api/appointments/${appointmentId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getAuthToken()}`
              }
            });
            if (resp.ok) {
              const data = await resp.json().catch(() => ({} as any));
              const inferred = data?.data?.doctor_id ?? data?.doctor_id;
              if (inferred) {
                const parsedInferred = Number(inferred);
                if (!Number.isNaN(parsedInferred) && parsedInferred > 0) {
                  finalDoctorId = parsedInferred;
                }
              }
            } else {
              console.warn('⚠️ Could not fetch appointment to infer doctorId (audio):', resp.status);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error inferring doctorId from appointment (audio):', e);
        }
      }

      // Add debug logging before the validation
      console.log('🔍 [AudioCallService] doctorId resolution:', {
        originalDoctorId: doctorId,
        finalDoctorId,
        appointmentId,
        isDirectSession: appointmentId.startsWith('direct_session_')
      });

      if (finalDoctorId == null || Number.isNaN(finalDoctorId) || finalDoctorId <= 0) {
        const msg = 'Doctor ID is required to start call session';
        console.error('❌ [AudioCallService] ' + msg, {
          originalDoctorId: doctorId,
          finalDoctorId,
          appointmentId
        });
        this.events?.onError?.(msg);
        this.updateState({ connectionState: 'failed' });
        return;
      }

      // Start call session on backend to trigger push notification to the doctor
      // Always attempt start; if already active, continue without error so both flows work
      try {
        if (!this.callStartAttempted) {
          this.callStartAttempted = true;
        } else {
          console.log('ℹ️ [AudioCallService] Call session start already attempted; skipping duplicate');
          // still proceed with signaling/media even if backend start was attempted
        }
        const startResp = !this.callStartAttempted ? null : await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({
            call_type: 'voice',
            appointment_id: appointmentId,
            doctor_id: finalDoctorId
          })
        });
        if (startResp && !startResp.ok) {
          const body = await startResp.text().catch(() => '');
          // Treat "already active" as benign (e.g., another flow already started the session)
          if (startResp.status === 400 && body.includes('already have an active call session')) {
            console.log('ℹ️ [AudioCallService] Backend reports existing active call session; continuing');
            // Proactively request a re-notify to ensure the callee gets the push (only once per instance)
            if (!this.reNotifyAttempted) {
              this.reNotifyAttempted = true;
              try {
                const rn = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/re-notify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                  },
                  body: JSON.stringify({ appointment_id: appointmentId, doctor_id: finalDoctorId })
                });
                const rnText = await rn.text().catch(() => '');
                console.log('ℹ️ [AudioCallService] Re-notify response:', rn.status, rnText);
              } catch (e) {
                console.warn('⚠️ [AudioCallService] Re-notify failed:', e);
              }
            } else {
              console.log('ℹ️ [AudioCallService] Re-notify already attempted; skipping');
            }
          } else {
            console.error('❌ Failed to start call session on backend:', startResp.status, body);
          }
        } else if (startResp) {
          const startData = await startResp.json().catch(() => ({} as any));
          console.log('✅ Call session started on backend:', startData?.data?.session_id ?? startData);
        }
      } catch (e) {
        console.error('❌ Error starting call session on backend:', e);
      }

      // Ensure signaling is connected BEFORE creating and sending an offer
      // This prevents lost offers and ensures the callee can receive it (and any re-offer requests)
      try {
        await this.connectSignaling(appointmentId, userId);
        console.log('📞 Signaling connected for outgoing call - proceeding to media and offer');
      } catch (wsErr) {
        console.error('❌ Failed to connect signaling for outgoing call:', wsErr);
        this.events?.onError('Unable to connect to call signaling. Please try again.');
        this.updateState({ connectionState: 'failed' });
        this.isInitializing = false;
        return;
      }

      // Get user media (audio only) with specific constraints
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        } as any,
      });

      // Log audio stream details
      console.log('🎵 [AudioCallService] Local audio stream captured:', {
        streamId: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        audioTrackLabel: this.localStream.getAudioTracks()[0]?.label,
        audioTrackSettings: this.localStream.getAudioTracks()[0]?.getSettings(),
        audioTrackConstraints: this.localStream.getAudioTracks()[0]?.getConstraints()
      });

      // Configure audio routing for phone calls (caller side)
      await this.configureAudioRouting();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.getIceServers(),
      });

      // Add local audio track to peer connection
      this.localStream.getAudioTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.addEventListener('track', (event) => {
        console.log('🎵 [AudioCallService] Remote audio stream received:', {
          streamId: event.streams[0].id,
          audioTracks: event.streams[0].getAudioTracks().length,
          audioTrackLabel: event.streams[0].getAudioTracks()[0]?.label,
          audioTrackSettings: event.streams[0].getAudioTracks()[0]?.getSettings()
        });
        this.remoteStream = event.streams[0];
        this.events?.onRemoteStream(event.streams[0]);
      });

      // Handle ICE candidates
      this.peerConnection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            senderId: this.userId,
          });
        }
      });

      // Handle connection state changes (outgoing path)
      this.peerConnection.addEventListener('connectionstatechange', () => {
        const connectionState = this.peerConnection?.connectionState;
        console.log('🔗 Connection state changed:', connectionState);
        console.log('🔗 Current call state:', {
          isCallAnswered: this.isCallAnswered,
          connectionState: this.state.connectionState
        });

        if (connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
          // Clear any pending disconnect grace timer
          if (this.disconnectGraceTimer) {
            clearTimeout(this.disconnectGraceTimer);
            this.disconnectGraceTimer = null;
          }
          // Clear reconnection state if reconnecting
          if (this.isReconnecting) {
            console.log('🔄 Reconnection successful');
            this.isReconnecting = false;
            if (this.reconnectionTimer) {
              clearTimeout(this.reconnectionTimer);
              this.reconnectionTimer = null;
            }
            this.reconnectionAttempts = 0;
          }
          this.markConnectedOnce();
        } else if (connectionState === 'connecting') {
          // Never downgrade UI back to connecting once connected (unless reconnecting)
          if (!this.isReconnecting) {
            console.log('🔄 WebRTC connection in progress (ignored if already connected)');
            // No state change here to avoid UI regressions
          }
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
          // If call is already answered/connected, trigger reconnection
          if (this.isCallAnswered && !this.hasEnded && !this.isReconnecting) {
            console.log('🔄 WebRTC disconnected/failed during active call - starting reconnection');
            this.attemptReconnection();
          } else {
            console.log('❌ WebRTC connection lost (grace period):', connectionState);
            // Start a short grace period before ending the call to absorb brief drops
            if (this.disconnectGraceTimer) {
              clearTimeout(this.disconnectGraceTimer);
              this.disconnectGraceTimer = null;
            }
            this.disconnectGraceTimer = setTimeout(() => {
              const cs = this.peerConnection?.connectionState;
              if (cs === 'disconnected' || cs === 'failed') {
                this.updateState({
                  isConnected: false,
                  connectionState: 'disconnected'
                });
                this.endCall();
              }
            }, 2500);
          }
        }
      });
      try {
        console.log('📞 [AudioCallService] About to create offer...');
        await this.createOffer();
        console.log('📞 Offer sent successfully, starting call timeout...');
        this.startReofferLoop();
      } catch (error) {
        console.error('❌ [AudioCallService] Failed to create offer:', error);
        throw error; // Re-throw to be caught by outer try-catch
      }

      // Start call timeout (60 seconds for doctor to answer)
      this.startCallTimeout();
      console.log('⏰ Call timeout started (60 seconds)');

      console.log('📞 [AudioCallService] Call initialization complete:', {
        appointmentId: this.appointmentId,
        userId: this.userId,
        connectionState: this.state.connectionState,
        isCallAnswered: this.isCallAnswered,
        hasEnded: this.hasEnded
      });

      this.isInitializing = false;

    } catch (error) {
      console.error('❌ Failed to initialize audio call:', error);
      this.events?.onError(`Failed to initialize call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
      this.isInitializing = false;
    }
  }

  /**
   * Connect to WebSocket signaling server
   * Architecture: Uses session context if available, falls back to appointmentId for backward compatibility
   */
  private async connectSignaling(appointmentId: string, userId: string, useFallback: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to our WebRTC signaling server
      let signalingUrl =
        process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        Constants.expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        Constants.expoConfig?.extra?.webRtcSignalingUrl ||
        environment.WEBRTC_SIGNALING_URL;

      // Handle explicit fallback request (e.g. after SSL failure)
      if (useFallback) {
        console.warn('🔄 [AudioCallService] Using fallback signaling URL due to previous error');
        signalingUrl = environment.WEBRTC_FALLBACK_SIGNALING_URL || 'ws://46.101.123.123:8081/call-signaling';
      }

      // Architecture: Use context envelope if available, fallback to appointmentId for backward compatibility
      let contextParam: string;
      if (this.context) {
        // Use context envelope: context_type:context_id
        contextParam = `context=${encodeURIComponent(contextToString(this.context))}`;
        console.log('🔌 [AudioCallService] Using session context:', contextToString(this.context));
      } else {
        // Legacy: use appointmentId (read-only appointment context)
        contextParam = `appointmentId=${encodeURIComponent(appointmentId)}`;
        console.log('⚠️ [AudioCallService] Using legacy appointmentId (read-only):', appointmentId);
      }

      const wsUrl = `${signalingUrl}?${contextParam}&userId=${encodeURIComponent(userId)}`;

      console.log(`🔧 [AudioCallService] ${useFallback ? 'Fallback ' : ''}WebSocket URL:`, wsUrl);
      console.log(`🔧 [AudioCallService] ${useFallback ? 'Fallback ' : ''}Signaling URL:`, signalingUrl);
      console.log('🔧 [AudioCallService] Context/Appointment ID:', this.context ? contextToString(this.context) : appointmentId);
      console.log('🔧 [AudioCallService] User ID:', userId);

      let connectionTimeout: ReturnType<typeof setTimeout> | undefined;

      // Cleanup existing channel handlers before replacing
      if (this.signalingChannel) {
        console.log('🧹 [AudioCallService] Cleaning up old signaling handlers');
        this.signalingChannel.onopen = null;
        this.signalingChannel.onmessage = null;
        this.signalingChannel.onerror = null;
        this.signalingChannel.onclose = null;
      }

      try {
        const currentChannel = new WebSocket(wsUrl);
        this.signalingChannel = currentChannel;

        connectionTimeout = setTimeout(() => {
          if (currentChannel.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ [AudioCallService] Signaling connection timed out');
            currentChannel.close();
            // Only retry if this is still the active channel
            if (this.signalingChannel === currentChannel) {
              if (!useFallback) {
                this.connectSignaling(appointmentId, userId, true).then(resolve).catch(reject);
              } else {
                reject(new Error('Signaling connection timed out'));
              }
            }
          }
        }, 10000);

        currentChannel.onopen = () => {
          if (this.signalingChannel !== currentChannel) {
            console.log('🔌 [AudioCallService] Stale signaling onopen ignored');
            return;
          }
          clearTimeout(connectionTimeout);
          console.log('🔌 Connected to signaling server');
          try { this.flushSignalingQueue(); } catch (e) { console.warn('⚠️ [AudioCallService] Failed to flush signaling queue on open:', e); }
          resolve();
        };

        currentChannel.onmessage = async (event) => {
          if (this.signalingChannel !== currentChannel) {
            console.log('📨 [AudioCallService] Stale signaling message ignored');
            return;
          }
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Signaling message received:', message.type);

            switch (message.type) {
              case 'offer':
                console.log('📞 [AudioCallService] Received offer:', {
                  isIncomingMode: this.isIncomingMode,
                  hasAccepted: this.hasAccepted,
                  isIncoming: this.isIncoming,
                  messageSenderId: message.senderId,
                  currentUserId: this.userId
                });

                // Always store offers for incoming calls, regardless of mode
                if (this.isIncoming || this.isIncomingMode) {
                  (global as any).pendingOffer = message.offer;
                  this.pendingOffer = message.offer; // Also store in instance to prevent loss during reset

                  // If user has already accepted, process the offer immediately
                  // BUT only if we're actually in incoming mode and have an appointmentId (not stale state)
                  if (this.hasAccepted && this.isIncomingMode && this.appointmentId) {
                    console.log('📞 [AudioCallService] Received offer after user accepted - processing immediately');
                    // Ensure media and PC are ready
                    if (!this.localStream) {
                      this.localStream = await mediaDevices.getUserMedia({
                        video: false,
                        audio: {
                          echoCancellation: true,
                          noiseSuppression: true,
                          autoGainControl: true,
                          sampleRate: 44100,
                          channelCount: 1,
                        } as any
                      });
                      await this.configureAudioRouting();
                    }
                    if (!this.peerConnection) {
                      await this.initializePeerConnection();
                    }
                    // Process the offer immediately
                    await this.handleOffer(message.offer);
                    // Drain queued ICE candidates
                    if (this.peerConnection && this.pendingCandidates.length > 0) {
                      for (const c of this.pendingCandidates) {
                        try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
                      }
                      this.pendingCandidates = [];
                    }
                    // Clear pending offer after processing
                    (global as any).pendingOffer = null;
                    this.pendingOffer = null;
                    return; // Don't continue with normal offer handling
                  } else {
                    console.log('📞 [AudioCallService] Stored pending offer for incoming call; awaiting user acceptance');
                  }
                } else if (!this.hasAccepted) {
                  // For outgoing calls, handle offer immediately
                  await this.handleOffer(message.offer);
                } else {
                  console.log('📞 [AudioCallService] Ignoring offer - call already accepted');
                }
                break;
              case 'answer':
                await this.handleAnswer(message.answer);
                break;
              case 'ice-candidate':
                if (this.isIncomingMode && (!this.peerConnection || !this.peerConnection.remoteDescription)) {
                  this.pendingCandidates.push(message.candidate);
                  console.log('⏸️ [AudioCallService] Queued ICE candidate (awaiting remoteDescription)');
                } else {
                  await this.handleIceCandidate(message.candidate);
                }
                break;
              case 'call-ended':
                console.log('📞 [AudioCallService] Received call-ended message:', {
                  message,
                  currentState: this.state.connectionState,
                  isCallAnswered: this.isCallAnswered,
                  hasEnded: this.hasEnded
                });
                this.endCall();
                break;
              case 'call-answered':
                this.handleCallAnswered();
                break;
              case 'call-rejected':
                this.handleCallRejected(message.reason);
                break;
              case 'call-timeout':
                this.handleCallTimeout();
                break;
              case 'resend-offer-request':
                if (this.peerConnection) {
                  if (!this.peerConnection.localDescription) {
                    try {
                      console.log('📨 [AudioCallService] Resend requested but no localDescription; creating fresh offer');
                      await this.createOffer();
                    } catch (e) {
                      console.warn('⚠️ [AudioCallService] Failed to create fresh offer on resend request:', e);
                    }
                  }
                  if (this.peerConnection?.localDescription) {
                    console.log('📨 [AudioCallService] Received resend-offer-request; resending offer');
                    this.sendSignalingMessage({
                      type: 'offer',
                      offer: this.peerConnection.localDescription,
                      senderId: this.userId,
                      appointmentId: this.appointmentId,
                      userId: this.userId,
                    });
                  } else {
                    console.warn('⚠️ [AudioCallService] Cannot resend offer - still no localDescription available');
                  }
                }
                break;
            }
          } catch (error) {
            console.error('❌ Error handling signaling message:', error);
          }
        };

        currentChannel.onerror = (error) => {
          if (this.signalingChannel !== currentChannel) {
            console.log('❌ [AudioCallService] Stale signaling onerror ignored');
            return;
          }
          clearTimeout(connectionTimeout);
          console.error('❌ Signaling WebSocket error:', error);

          const errorMessage = (error as any).message || '';
          if (!useFallback && (
            errorMessage.includes('Chain validation failed') ||
            errorMessage.includes('ssl') ||
            errorMessage.includes('TLS') ||
            errorMessage.includes('SSL') ||
            errorMessage.includes('Connection closed by peer') ||
            errorMessage.includes('Expected HTTP 101 response but was \'400 Bad Request\'') ||
            !errorMessage // Some RN environments have empty error messages for SSL failures
          )) {
            console.warn('🔄 [AudioCallService] SSL/TLS or configuration error detected, trying IP fallback...');
            this.connectSignaling(appointmentId, userId, true).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        };

        currentChannel.onclose = () => {
          if (this.signalingChannel !== currentChannel) {
            console.log('🔌 [AudioCallService] Stale signaling onclose ignored');
            return;
          }
          clearTimeout(connectionTimeout);
          console.log('🔌 Signaling connection closed');
          if (this.signalingFlushTimer) {
            clearInterval(this.signalingFlushTimer);
            this.signalingFlushTimer = null;
          }
          this.updateState({ connectionState: 'disconnected' });
        };

      } catch (error) {
        // Clear timeout if we hit a creation error
        if (typeof connectionTimeout !== 'undefined') {
          clearTimeout(connectionTimeout);
        }
        console.error('❌ Failed to create signaling connection:', error);
        if (!useFallback) {
          this.connectSignaling(appointmentId, userId, true).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Process offer when user accepts incoming call
   */
  async processIncomingOffer(): Promise<void> {
    // Check both global and instance - instance survives reset() calls
    const globalPendingOffer = (global as any).pendingOffer;
    const instancePendingOffer = this.pendingOffer;
    const pendingOffer = instancePendingOffer || globalPendingOffer;
    if (pendingOffer) {
      console.log('📞 Processing pending offer for incoming call');
      console.log('📞 Pending offer details:', {
        type: pendingOffer.type,
        sdpLength: pendingOffer.sdp?.length,
        hasSdp: !!pendingOffer.sdp
      });

      // Wait for WebSocket connection to be established
      let retryCount = 0;
      const maxRetries = 50; // 5 seconds max wait
      const retryInterval = 100; // 100ms

      while (!this.isConnectedToSignaling() && retryCount < maxRetries) {
        console.log(`⏳ Waiting for WebSocket connection... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        retryCount++;
      }

      if (!this.isConnectedToSignaling()) {
        console.log('⚠️ WebSocket connection not established after waiting, but proceeding anyway');
      } else {
        console.log('✅ WebSocket connection established, proceeding with offer processing');
      }

      // Ensure peer connection is ready
      if (!this.peerConnection) {
        console.log('📞 Peer connection not ready, initializing...');
        await this.initializePeerConnection();
      }

      console.log('📞 About to handle offer - signaling state:', this.peerConnection?.signalingState);
      await this.handleOffer(pendingOffer);
      console.log('📞 Offer handled successfully');

      // Clear the pending offer after successful processing (both global and instance)
      (global as any).pendingOffer = null;
      this.pendingOffer = null;
    } else {
      console.log('📞 No pending offer found');
    }
  }


  /**
   * Initialize peer connection
   */
  private async initializePeerConnection(): Promise<void> {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.getIceServers(),
    });

    // Add local audio track to peer connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.addEventListener('track', (event) => {
      console.log('🎵 Remote audio stream received');
      this.remoteStream = event.streams[0];
      this.events?.onRemoteStream(event.streams[0]);
      // Fallback: mark connected on receiving remote track (RN WebRTC may delay connectionstatechange)
      this.markConnectedOnce();
    });

    // Handle ICE candidates
    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          senderId: this.userId,
        });
      }
    });

    // Handle connection state changes (incoming path)
    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection?.connectionState;
      console.log('🔗 Connection state changed:', state);
      console.log('🔗 Current call state:', {
        connectionState: this.state.connectionState,
        isCallAnswered: this.isCallAnswered,
        hasEnded: this.hasEnded
      });

      if (state === 'connected') {
        console.log('🔗 WebRTC connected - updating call state');
        // Clear any pending disconnect grace timer
        if (this.disconnectGraceTimer) {
          clearTimeout(this.disconnectGraceTimer);
          this.disconnectGraceTimer = null;
        }
        // Clear reconnection state if reconnecting
        if (this.isReconnecting) {
          console.log('🔄 Reconnection successful');
          this.isReconnecting = false;
          if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
          }
          this.reconnectionAttempts = 0;
        }
        this.markConnectedOnce();
      } else if (state === 'disconnected' || state === 'failed') {
        // If call is already answered/connected, trigger reconnection
        if (this.isCallAnswered && !this.hasEnded && !this.isReconnecting) {
          console.log('🔄 WebRTC disconnected/failed during active call - starting reconnection');
          this.attemptReconnection();
        } else if (!this.isCallAnswered && !this.hasEnded && !this.hasAccepted) {
          // Only start grace timer if call is not being answered and not already ended
          console.log('🔗 WebRTC disconnected/failed - starting grace timer');
          if (this.disconnectGraceTimer) {
            clearTimeout(this.disconnectGraceTimer);
            this.disconnectGraceTimer = null;
          }
          this.disconnectGraceTimer = setTimeout(() => {
            const cs = this.peerConnection?.connectionState;
            // Only end call if still disconnected/failed AND not answered AND not already ended AND not accepted
            if ((cs === 'disconnected' || cs === 'failed') && !this.isCallAnswered && !this.hasEnded && !this.hasAccepted) {
              console.log('🔗 Grace timer expired - ending call due to persistent disconnection');
              this.updateState({
                isConnected: false,
                connectionState: 'disconnected'
              });
              this.stopCallTimer();
              this.endCall();
            }
          }, 5000); // Increased grace period to 5 seconds
        } else {
          console.log('🔗 WebRTC disconnected/failed but call is answered, already ended, or being accepted - ignoring');
        }
      }
    });
  }

  /**
   * Attempt to reconnect after disconnection during active call
   * Frontend-only transport recovery (WhatsApp-style)
   */
  private async attemptReconnection(): Promise<void> {
    if (this.isReconnecting || !this.appointmentId || !this.userId || this.hasEnded) {
      console.log('🔄 Reconnection already in progress or call ended - skipping');
      return;
    }

    console.log('🔄 Starting reconnection attempt...');
    this.isReconnecting = true;
    this.reconnectionAttempts++;

    // Update UI to show reconnecting state
    this.updateState({ connectionState: 'reconnecting' });

    // Set 30s timeout - if reconnection fails, end call normally
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }
    this.reconnectionTimer = setTimeout(() => {
      if (this.isReconnecting) {
        console.log('🔄 Reconnection timeout (30s) - ending call');
        this.isReconnecting = false;
        this.endCall();
      }
    }, 30000);

    try {
      // Close old peer connection
      if (this.peerConnection) {
        console.log('🔄 Closing old peer connection...');
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Recreate peer connection
      console.log('🔄 Recreating peer connection...');
      await this.initializePeerConnection();

      // Ensure signaling connection is still active
      if (!this.isConnectedToSignaling()) {
        console.log('🔄 Signaling connection lost - reconnecting...');
        if (this.appointmentId && this.userId) {
          await this.connectSignaling(this.appointmentId, this.userId);
        }
      }

      // Ensure we have local stream
      if (!this.localStream) {
        console.log('🔄 Recreating local audio stream...');
        this.localStream = await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Add local audio track to peer connection
        this.localStream.getAudioTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      // Renegotiate based on call direction
      if (this.isIncoming) {
        // For incoming calls, wait for new offer from caller
        console.log('🔄 Waiting for new offer from caller...');
        // The signaling server will handle re-offer
      } else {
        // For outgoing calls, create new offer
        console.log('🔄 Creating new offer for reconnection...');
        this.offerCreated = false; // Reset flag to allow new offer
        this.creatingOffer = false; // Reset flag
        await this.createOffer();
      }

      console.log('🔄 Reconnection attempt initiated');
    } catch (error) {
      console.error('🔄 Reconnection error:', error);
      // If reconnection fails, end call after timeout
      // The timeout will handle ending the call
    }
  }

  /**
   * Set event listeners without initializing the call
   * Used for incoming calls where the service is already initialized
   */
  setEvents(events: AudioCallEvents): void {
    console.log('📞 Setting event listeners for incoming call');
    this.events = events;
  }

  /**
   * Check if already connected to signaling server
   */
  isConnectedToSignaling(): boolean {
    return this.signalingChannel?.readyState === WebSocket.OPEN &&
      this.appointmentId !== null &&
      this.userId !== null;
  }

  /**
   * Configure audio routing for phone calls
   */
  private async configureAudioRouting(): Promise<void> {
    try {
      console.log('📞 Configuring audio routing for earpiece (default)...');

      // Set audio mode for phone calls (earpiece by default like normal phone calls)
      // Note: shouldDuckAndroid: false prevents Android from lowering audio volume
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false, // Don't duck audio - prevents volume issues
        playThroughEarpieceAndroid: true, // Start with earpiece mode
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('✅ Audio routing configured for earpiece (default)');
    } catch (error) {
      console.warn('⚠️ Could not configure audio routing:', error);
    }
  }

  /**
   * Reset audio routing to default
   */
  private async resetAudioRouting(): Promise<void> {
    try {
      console.log('📞 Resetting audio routing to default...');

      // Reset audio mode to default
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('✅ Audio routing reset to default');
    } catch (error) {
      console.warn('⚠️ Could not reset audio routing:', error);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection available for offer handling');
      return;
    }

    // Prevent duplicate offer handling, BUT allow re-offers if remote description isn't set yet
    // This handles the case where the original offer was lost and a re-offer arrives after hasAccepted=true
    if (this.hasAccepted && this.peerConnection?.remoteDescription) {
      console.warn('⚠️ [handleOffer] Call already accepted and remote description set - ignoring duplicate offer');
      return;
    }

    // If hasAccepted is true but no remote description, this is a re-offer that needs processing
    if (this.hasAccepted && !this.peerConnection?.remoteDescription) {
      console.log('📞 [handleOffer] Processing re-offer after hasAccepted=true (original offer was lost)');
    }

    try {
      // Check if we're in the right state to set remote description
      const currentState = this.peerConnection.signalingState;
      console.log('📞 [handleOffer] Current signaling state:', currentState);
      console.log('📞 [handleOffer] Offer details:', {
        type: offer.type,
        sdpLength: offer.sdp?.length,
        hasSdp: !!offer.sdp
      });
      console.log('📞 [handleOffer] Peer connection state:', {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState
      });

      // Handle offer if we're in 'stable' state (incoming call)
      if (currentState === 'stable') {
        console.log('📞 Setting remote description (offer)...');
        await this.peerConnection.setRemoteDescription(offer);
        console.log('📞 Creating answer...');
        const answer = await this.peerConnection.createAnswer();
        console.log('📞 Answer created:', {
          type: answer.type,
          sdpLength: answer.sdp?.length,
          hasSdp: !!answer.sdp
        });
        console.log('📞 Setting local description (answer)...');
        const mungedAnswer = {
          type: answer.type,
          sdp: this.mungeSdpForAudio(answer.sdp || '')
        } as RTCSessionDescriptionInit;
        await this.peerConnection.setLocalDescription(mungedAnswer as any);

        console.log('📞 Sending answer message...');
        this.sendSignalingMessage({
          type: 'answer',
          answer: mungedAnswer,
          senderId: this.userId,
          appointmentId: this.appointmentId,
          userId: this.userId,
        });
        // Notify caller that call has been answered
        this.isCallAnswered = true;
        this.sendSignalingMessage({
          type: 'call-answered',
          callType: 'voice',
          userId: this.userId,
          appointmentId: this.appointmentId
        });
        // Mark callee UI connected once we answered
        if (!this.state.isConnected) {
          this.updateState({ isConnected: true, connectionState: 'connected' });
          this.startCallTimer();
        }
        // Fallback in case UI event ordering delays connection
        this.ensureConnectedSoon();

        console.log('✅ Offer handled and answer sent successfully');
        // For receiver side: Update connection state after sending answer
        // This ensures UI transitions properly even if WebRTC connection event is delayed
        this.updateState({ connectionState: 'connected', isConnected: true });
        this.startCallTimer(); // Start the call duration timer
        this.events?.onCallAnswered();
      } else {
        console.warn('⚠️ Cannot handle offer in current state:', currentState);
        // Reset peer connection to stable state
        console.log('📞 Resetting peer connection to stable state');
        this.peerConnection.close();
        await this.initializePeerConnection();

        // Try again
        console.log('📞 Retrying offer handling...');
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        const mungedAnswer = {
          type: answer.type,
          sdp: this.mungeSdpForAudio(answer.sdp || '')
        } as RTCSessionDescriptionInit;
        await this.peerConnection.setLocalDescription(mungedAnswer as any);

        this.sendSignalingMessage({
          type: 'answer',
          answer: mungedAnswer,
          senderId: this.userId,
        });
        console.log('✅ Offer handled and answer sent successfully after reset');

        // For receiver side: Update connection state after sending answer (retry path)
        this.isCallAnswered = true;
        this.updateState({ connectionState: 'connected', isConnected: true });
        this.startCallTimer(); // Start the call duration timer
        this.events?.onCallAnswered();
      }
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      this.events?.onError('Failed to handle incoming call');
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) return;

    try {
      console.log(`📞 [AudioCallService ${this.instanceId}] Handling answer...`);
      console.log(`📞 [AudioCallService ${this.instanceId}] Current signaling state:`, this.peerConnection.signalingState);

      // Check if we're in the right state to set remote description
      if (this.peerConnection.signalingState === 'have-local-offer') {
        console.log('📞 Setting remote description (answer)...');
        await this.peerConnection.setRemoteDescription(answer);
        console.log('✅ Answer set successfully');

        // Drain any queued ICE candidates now that remoteDescription is set
        if (this.pendingCandidates.length > 0 && this.peerConnection) {
          for (const c of this.pendingCandidates) {
            try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
          }
          this.pendingCandidates = [];
        }

        // Mark call as answered
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected', isConnected: true });
        if (!this.didEmitAnswered) {
          this.didEmitAnswered = true;
          this.events?.onCallAnswered();
        }
        this.clearReofferLoop();
        this.markConnectedOnce();

        // FALLBACK: If connectionstatechange doesn't fire within 3 seconds, ensure connected state
        setTimeout(() => {
          if (this.peerConnection?.connectionState === 'connected' &&
            this.state.connectionState !== 'connected') {
            console.log('🔄 Fallback: Forcing connected state after timeout');
            this.updateState({ connectionState: 'connected', isConnected: true });
            this.startCallTimer();
          }
        }, 3000);
      } else if (this.peerConnection.signalingState === 'stable') {
        console.log('📞 Already in stable state - connection established, marking as answered');
        // Drain queued ICE if any
        if (this.pendingCandidates.length > 0 && this.peerConnection) {
          for (const c of this.pendingCandidates) {
            try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
          }
          this.pendingCandidates = [];
        }
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected', isConnected: true });
        this.events?.onCallAnswered();
        this.markConnectedOnce();

        // FALLBACK: If connectionstatechange doesn't fire within 3 seconds, ensure connected state
        setTimeout(() => {
          if (this.peerConnection?.connectionState === 'connected' &&
            this.state.connectionState !== 'connected') {
            console.log('🔄 Fallback: Forcing connected state after timeout');
            this.updateState({ connectionState: 'connected', isConnected: true });
            this.startCallTimer();
          }
        }, 3000);
      } else {
        console.log('⚠️ Cannot set remote description - wrong signaling state:', this.peerConnection.signalingState);
        // Try to set remote description anyway for other states
        try {
          console.log('📞 Attempting to set remote description despite state...');
          await this.peerConnection.setRemoteDescription(answer);
          console.log('✅ Answer set successfully despite state');
          // Drain queued ICE if any
          if (this.pendingCandidates.length > 0 && this.peerConnection) {
            for (const c of this.pendingCandidates) {
              try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
            }
            this.pendingCandidates = [];
          }
          this.isCallAnswered = true;
          this.clearCallTimeout();
          this.updateState({ connectionState: 'connected', isConnected: true });
          if (!this.didEmitAnswered) {
            this.didEmitAnswered = true;
            this.events?.onCallAnswered();
          }
          this.markConnectedOnce();

          // FALLBACK: If connectionstatechange doesn't fire within 3 seconds, ensure connected state
          setTimeout(() => {
            if (this.peerConnection?.connectionState === 'connected' &&
              this.state.connectionState !== 'connected') {
              console.log('🔄 Fallback: Forcing connected state after timeout');
              this.updateState({ connectionState: 'connected', isConnected: true });
              this.startCallTimer();
            }
          }, 3000);
        } catch (stateError) {
          console.log('⚠️ Failed to set remote description due to state, but marking as answered');
          this.isCallAnswered = true;
          this.clearCallTimeout();
          this.updateState({ connectionState: 'connected', isConnected: true });
          this.events?.onCallAnswered();
        }
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      console.log('📞 Current signaling state during error:', this.peerConnection.signalingState);

      // If it's a state error but we're already connected, just mark as answered
      if (error.message.includes('wrong state') && this.peerConnection.signalingState === 'stable') {
        console.log('📞 State error but already connected, marking as answered');
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected', isConnected: true });
        this.events?.onCallAnswered();
      } else {
        this.events?.onError('Failed to establish call connection');
      }
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) return;

    try {
      if (!this.peerConnection.remoteDescription) {
        this.pendingCandidates.push(candidate as any);
        console.log('⏸️ [AudioCallService] Queued ICE candidate (no remoteDescription)');
        return;
      }
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }

  /**
   * Send signaling message
   */
  private sendSignalingMessage(message: any): void {
    if (this.signalingChannel?.readyState === WebSocket.OPEN) {
      console.log('📤 [AudioCallService] Sending message:', message.type, 'to audio signaling');
      this.signalingChannel.send(JSON.stringify(message));
      return;
    }
    // Queue the message until signaling opens
    console.warn('⚠️ Signaling channel not open, queuing message:', message.type);
    this.messageQueue.push(message);

    // If there is an active socket, rely on onopen flush; otherwise try periodic flush for a short window
    if (!this.signalingFlushTimer) {
      let tries = 0;
      this.signalingFlushTimer = setInterval(() => {
        tries++;
        if (this.isConnectedToSignaling()) {
          try { this.flushSignalingQueue(); } catch { }
          if (this.signalingFlushTimer) { clearInterval(this.signalingFlushTimer); this.signalingFlushTimer = null; }
        } else if (tries >= 10) { // ~5s at 500ms
          console.warn('⚠️ [AudioCallService] Discarding queued signaling messages after timeout');
          this.messageQueue = [];
          if (this.signalingFlushTimer) { clearInterval(this.signalingFlushTimer); this.signalingFlushTimer = null; }
        }
      }, 500);
    }
  }

  /**
   * Send signaling message (public method)
   */
  sendMessage(message: any): void {
    this.sendSignalingMessage(message);
  }

  // Flush queued signaling messages once the socket is open
  private flushSignalingQueue(): void {
    if (this.signalingChannel?.readyState !== WebSocket.OPEN) return;
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      try {
        console.log('📤 [AudioCallService] Flushing queued message:', msg?.type);
        this.signalingChannel.send(JSON.stringify(msg));
      } catch (e) {
        console.warn('⚠️ [AudioCallService] Failed to send queued message, re-queuing');
        this.messageQueue.unshift(msg);
        break;
      }
    }
  }

  /**
   * Process incoming call when user accepts (for receiver)
   */
  async processIncomingCall(): Promise<void> {
    try {
      console.log('📞 [AudioCallService] Processing incoming call after user acceptance...');

      // Ensure we're not in a stale state from hot reload
      // If hasAccepted is true but we're not connected, something went wrong - reset it
      if (this.hasAccepted && this.state.connectionState !== 'connected' && !this.state.isConnected) {
        console.log('🧹 [AudioCallService] Resetting stale hasAccepted state - call not actually connected');
        this.hasAccepted = false;
      }

      // CRITICAL: Call answer endpoint to update database (answered_at)
      // This must happen BEFORE WebRTC processing to ensure lifecycle correctness
      if (this.appointmentId) {
        try {
          await this.markCallAsAnsweredInBackend();
        } catch (error) {
          console.error('❌ [AudioCallService] Failed to mark call as answered in backend:', error);
          // Continue with WebRTC processing even if backend call fails
        }
      }

      // Clear any pending disconnect grace timer since we're actively answering
      if (this.disconnectGraceTimer) {
        console.log('📞 [AudioCallService] Clearing disconnect grace timer - call is being answered');
        clearTimeout(this.disconnectGraceTimer);
        this.disconnectGraceTimer = null;
      }

      // Check both global and instance - instance survives reset() calls
      const globalPendingOffer = (global as any).pendingOffer;
      const instancePendingOffer = this.pendingOffer;
      const pendingOffer = instancePendingOffer || globalPendingOffer;

      console.log('📞 [AudioCallService] Checking for pending offer:', {
        hasGlobalOffer: !!globalPendingOffer,
        hasInstanceOffer: !!instancePendingOffer,
        hasPendingOffer: !!pendingOffer,
        offerType: pendingOffer?.type,
        offerSdpLength: pendingOffer?.sdp?.length
      });

      if (!pendingOffer) {
        console.warn('⚠️ [AudioCallService] No pending offer found - requesting re-offer from caller');
        // Prepare media and PC so we can immediately process the re-offer when it arrives
        if (!this.localStream) {
          this.localStream = await mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1,
            } as any
          });
          await this.configureAudioRouting();
        }
        if (!this.peerConnection) {
          await this.initializePeerConnection();
        }
        // Ask caller to resend the current offer
        this.sendSignalingMessage({
          type: 'resend-offer-request',
          appointmentId: this.appointmentId,
          userId: this.userId,
        });
        this.hasAccepted = true;
        // Do NOT mark connected yet; wait for offer -> answer handshake
        return;
      }

      // On accept, prepare media and create PC if needed
      if (!this.localStream) {
        this.localStream = await mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1,
          } as any
        });
        await this.configureAudioRouting();
      }
      if (!this.peerConnection) {
        await this.initializePeerConnection();
      }

      console.log('📞 [AudioCallService] Processing pending offer...');
      await this.handleOffer(pendingOffer);

      console.log('📞 [AudioCallService] Offer processed successfully, clearing pending offer');
      // Clear the pending offer after processing (both global and instance)
      (global as any).pendingOffer = null;
      this.pendingOffer = null;

      // Drain queued ICE candidates now that remoteDescription is set
      if (this.peerConnection && this.pendingCandidates.length > 0) {
        for (const c of this.pendingCandidates) {
          try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
        }
        this.pendingCandidates = [];
      }

      // Clear the pending offer (both global and instance)
      (global as any).pendingOffer = null;
      this.pendingOffer = null;
      this.hasAccepted = true;

      // Clear any existing disconnect grace timer since we're actively answering
      if (this.disconnectGraceTimer) {
        console.log('📞 [AudioCallService] Clearing disconnect grace timer - call is being answered');
        clearTimeout(this.disconnectGraceTimer);
        this.disconnectGraceTimer = null;
      }

      console.log('✅ [AudioCallService] Incoming call processed successfully');
      // Additional fallback after full processing
      this.ensureConnectedSoon(1000);

      // Debug: Check WebRTC connection state after processing
      if (this.peerConnection) {
        console.log('🔍 [AudioCallService] Post-processing WebRTC state:', {
          connectionState: this.peerConnection.connectionState,
          iceConnectionState: this.peerConnection.iceConnectionState,
          signalingState: this.peerConnection.signalingState,
          currentCallState: this.state.connectionState
        });
      }

    } catch (error) {
      console.error('❌ [AudioCallService] Failed to process incoming call:', error);
      this.events?.onError(`Failed to process incoming call: ${error.message}`);
      throw error;
    }
  }


  /**
   * Create and send offer (for caller)
   */
  async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.warn('⚠️ [AudioCallService] Cannot create offer - no peer connection');
      return;
    }

    if (this.offerCreated) {
      console.warn('⚠️ [AudioCallService] Offer already created - preventing duplicate');
      return;
    }

    if (this.creatingOffer) {
      console.warn('⚠️ [AudioCallService] Offer creation in progress - skipping');
      return;
    }

    this.creatingOffer = true;

    try {
      console.log('📞 [AudioCallService] Creating offer...');
      console.log('📞 [AudioCallService] Peer connection state:', this.peerConnection?.connectionState);
      console.log('📞 [AudioCallService] Local stream available:', !!this.localStream);

      const offer = await this.peerConnection.createOffer();
      console.log('📞 [AudioCallService] Offer created, setting local description...');
      const mungedOffer = {
        type: offer.type,
        sdp: this.mungeSdpForAudio(offer.sdp || '')
      } as RTCSessionDescriptionInit;
      await this.peerConnection.setLocalDescription(mungedOffer as any);

      console.log('📞 [AudioCallService] Sending offer via signaling...');
      this.sendSignalingMessage({
        type: 'offer',
        offer: mungedOffer,
        senderId: this.userId,
        appointmentId: this.appointmentId,
        userId: this.userId,
        callType: 'audio',
        doctorName: this.doctorName || 'Unknown',
        doctorProfilePicture: this.doctorProfilePicture || '',
      });

      this.offerCreated = true;
      console.log('✅ [AudioCallService] Offer created and sent successfully');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      console.error('❌ Error details:', {
        message: (error as any).message,
        stack: (error as any).stack,
        peerConnectionState: this.peerConnection?.connectionState,
        hasLocalStream: !!this.localStream
      });
      this.events?.onError('Failed to initiate call');
      throw error; // Re-throw to be caught by caller
    } finally {
      this.creatingOffer = false;
    }
  }

  /**
   * Start call timeout timer
   */
  private startCallTimeout(): void {
    this.callTimeoutTimer = setTimeout(() => {
      console.log(`⏰ [AudioCallService ${this.instanceId}] Call timeout triggered - checking if answered:`, {
        isCallAnswered: this.isCallAnswered,
        connectionState: this.state.connectionState,
        signalingState: this.peerConnection?.signalingState
      });

      // Only timeout if we're still in connecting state and not answered
      if (!this.isCallAnswered && this.state.connectionState === 'connecting') {
        console.log(`⏰ [AudioCallService ${this.instanceId}] Call timeout - call not answered`);
        this.handleCallTimeout();
      } else if (this.isCallAnswered) {
        console.log(`⏰ [AudioCallService ${this.instanceId}] Call timeout triggered but call was already answered - ignoring`);
      } else {
        console.log(`⏰ [AudioCallService ${this.instanceId}] Call timeout triggered but connection state is ${this.state.connectionState} - ignoring`);
      }
    }, 60000); // 60 seconds timeout
  }

  /**
   * Deduct call session when call is answered
   */
  private async deductCallSession(): Promise<void> {
    try {
      console.log('💰 [AudioCallService] Deducting call session...');
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          call_type: 'voice',
          appointment_id: this.appointmentId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AudioCallService] Call session deducted successfully:', data);
      } else {
        console.error('❌ [AudioCallService] Failed to deduct call session:', response.status);
      }
    } catch (error) {
      console.error('❌ [AudioCallService] Error deducting call session:', error);
    }
  }

  /**
   * Handle call answered
   */
  private handleCallAnswered(): void {
    console.log(`✅ [AudioCallService ${this.instanceId}] Call answered by peer`);
    console.log(`📞 [AudioCallService ${this.instanceId}] Current call state when answered:`, {
      isCallAnswered: this.isCallAnswered,
      connectionState: this.state.connectionState,
      signalingState: this.peerConnection?.signalingState
    });
    this.isCallAnswered = true;
    this.clearCallTimeout();
    this.updateState({ connectionState: 'connected', isConnected: true });

    // FIX: Do NOT deduct immediately - deductions happen after 10 minutes and on hangup
    // this.deductCallSession();

    // Do not echo call-answered back
    if (!this.didEmitAnswered) {
      this.didEmitAnswered = true;
      this.events?.onCallAnswered();
    }
    this.markConnectedOnce();
  }

  /**
   * Handle call rejected
   */
  private handleCallRejected(reason?: string): void {
    console.log('❌ Call rejected by doctor, reason:', reason || 'unknown');
    this.clearCallTimeout();
    this.events?.onCallRejected();
    this.endCall();
  }

  /**
   * Handle call timeout
   */
  private handleCallTimeout(): void {
    console.log('⏰ Call timeout');
    this.clearCallTimeout();
    this.events?.onCallTimeout();
    this.endCall();
  }

  /**
   * Clear call timeout timer
   */
  private clearCallTimeout(): void {
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  /**
   * Compute ICE servers, including optional TURN from env/config
   */
  private getIceServers() {
    try {
      const w = configService.getWebRTCConfig();
      const servers: any[] = [];
      const stun = Array.isArray(w.stunServers) && w.stunServers.length ? w.stunServers : [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ];
      stun.forEach(u => servers.push({ urls: u }));
      if (w.turnServerUrl && w.turnUsername && w.turnPassword) {
        servers.push({ urls: w.turnServerUrl, username: w.turnUsername, credential: w.turnPassword } as any);
        console.log('🌐 [AudioCallService] TURN server configured via configService');
      } else {
        // Fallback to env if present
        const turnUrl = (process.env.EXPO_PUBLIC_TURN_URL as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_URL || (Constants.expoConfig?.extra as any)?.turnUrl;
        const turnUsername = (process.env.EXPO_PUBLIC_TURN_USERNAME as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_USERNAME || (Constants.expoConfig?.extra as any)?.turnUsername;
        const turnCredential = (process.env.EXPO_PUBLIC_TURN_CREDENTIAL as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_CREDENTIAL || (Constants.expoConfig?.extra as any)?.turnCredential;
        if (turnUrl && turnUsername && turnCredential) {
          servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential } as any);
          console.log('🌐 [AudioCallService] TURN server configured via env fallback');
        } else {
          console.log('🌐 [AudioCallService] No TURN configured (using STUN only)');
        }
      }
      return servers;
    } catch (e) {
      console.warn('⚠️ [AudioCallService] Failed to read ICE config:', e);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ];
    }
  }

  private mungeSdpForAudio(sdp: string): string {
    let out = sdp;
    out = this.preferCodec(out, 'audio', 'opus');
    out = this.setMediaBitrate(out, 'audio', 64); // kbps target budget
    out = this.setOpusAttributes(out, { maxaveragebitrate: 48000, stereo: 0, usedtx: 1, ptime: 20 });
    return out;
  }

  private preferCodec(sdp: string, kind: 'audio' | 'video', codec: string): string {
    const lines = sdp.split('\n');
    const mLineIndex = lines.findIndex(l => l.startsWith('m=' + kind));
    if (mLineIndex === -1) return sdp;
    const rtpMap: Record<string, string> = {};
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^a=rtpmap:(\d+)\s+([^\/]+)\//i);
      if (m) rtpMap[m[1]] = m[2].toUpperCase();
    }
    const parts = lines[mLineIndex].split(' ');
    const header = parts.slice(0, 3);
    const pts = parts.slice(3);
    const preferred: string[] = [];
    const others: string[] = [];
    pts.forEach(pt => {
      const name = rtpMap[pt];
      if (name && name.includes(codec.toUpperCase())) preferred.push(pt); else others.push(pt);
    });
    if (preferred.length) lines[mLineIndex] = [...header, ...preferred, ...others].join(' ');
    return lines.join('\n');
  }

  private setMediaBitrate(sdp: string, kind: 'audio' | 'video', kbps: number): string {
    const lines = sdp.split('\n');
    const mLineIndex = lines.findIndex(l => l.startsWith('m=' + kind));
    if (mLineIndex === -1) return sdp;
    let i = mLineIndex + 1;
    while (i < lines.length && lines[i].startsWith('i=')) i++;
    if (i < lines.length && lines[i].startsWith('b=')) {
      lines[i] = 'b=AS:' + kbps;
    } else {
      lines.splice(i, 0, 'b=AS:' + kbps);
    }
    return lines.join('\n');
  }

  private setOpusAttributes(sdp: string, opts: { maxaveragebitrate?: number; stereo?: 0 | 1; usedtx?: 0 | 1; ptime?: number; }): string {
    const lines = sdp.split('\n');
    const opusPt = (() => {
      for (const l of lines) {
        const m = l.match(/^a=rtpmap:(\d+)\s+opus\//i);
        if (m) return m[1];
      }
      return null;
    })();
    if (!opusPt) return sdp;
    const fmtpIndex = lines.findIndex(l => l.startsWith('a=fmtp:' + opusPt));
    const params: Record<string, string> = {};
    if (fmtpIndex !== -1) {
      const cur = lines[fmtpIndex].split(' ');
      const kv = cur.slice(1).join(' ').split(';');
      kv.forEach(p => {
        const [k, v] = p.split('=');
        if (k) params[k.trim()] = (v || '').trim();
      });
    }
    if (opts.maxaveragebitrate) params['maxaveragebitrate'] = String(opts.maxaveragebitrate);
    if (typeof opts.stereo === 'number') params['stereo'] = String(opts.stereo);
    if (typeof opts.usedtx === 'number') params['usedtx'] = String(opts.usedtx);
    if (opts.ptime) params['ptime'] = String(opts.ptime);
    const serialized = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(';');
    const line = `a=fmtp:${opusPt} ${serialized}`;
    if (fmtpIndex !== -1) lines[fmtpIndex] = line; else lines.push(line);
    return lines.join('\n');
  }

  /**
   * Toggle audio mute/unmute
   */
  toggleAudio(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.updateState({ isAudioEnabled: audioTrack.enabled });
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * Toggle speaker on/off
   */
  async toggleSpeaker(speakerOn: boolean): Promise<void> {
    try {
      console.log('🔊 Toggling speaker:', speakerOn ? 'ON' : 'OFF');

      // Import Audio from expo-av for proper audio routing
      const { Audio, InterruptionModeAndroid, InterruptionModeIOS } = await import('expo-av');

      // Set audio mode to control speaker/earpiece routing
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, // MUST be true for audio calls
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: !speakerOn, // false = speaker, true = earpiece
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log('✅ Speaker mode updated successfully:', speakerOn ? 'speaker' : 'earpiece');
    } catch (error) {
      console.error('❌ Error toggling speaker:', error);
    }
  }

  private startReofferLoop(): void {
    try {
      this.clearReofferLoop();
      this.reofferTimer = setInterval(() => {
        if (
          this.peerConnection?.localDescription &&
          this.state.connectionState !== 'connected' &&
          !this.state.isConnected
        ) {
          this.sendSignalingMessage({
            type: 'offer',
            offer: this.peerConnection.localDescription,
            senderId: this.userId,
            appointmentId: this.appointmentId,
            userId: this.userId,
          });
        }
      }, 4000);
    } catch (e) {
      console.warn('⚠️ [AudioCallService] Failed to start re-offer loop:', e);
    }
  }

  private clearReofferLoop(): void {
    if (this.reofferTimer) {
      clearInterval(this.reofferTimer);
      this.reofferTimer = null;
    }
  }

  /**
   * Start call duration timer
   */
  private ensureConnectedSoon(delayMs: number = 800): void {
    try {
      setTimeout(() => {
        if (!this.state.isConnected) {
          console.log('⏳ [AudioCallService] Ensuring connected UI after answer/track');
          this.updateState({ isConnected: true, connectionState: 'connected' });
          this.startCallTimer();
        }
      }, delayMs);
    } catch { }
  }

  private startCallTimer(): void {
    this.callStartTime = Date.now();
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.callTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      this.updateState({ callDuration: duration });
    }, 1000);
  }

  /**
   * Idempotently mark the call as connected and start timer once
   * CRITICAL: This is called when WebRTC peer connection state becomes 'connected'
   * It updates the backend DB to set status='active', is_connected=true, and connected_at timestamp
   * 
   * IMPORTANT: Backend call is fire-and-forget to avoid blocking connection flow
   */
  private markConnectedOnce(): void {
    try {
      if (!this.didConnect) {
        this.didConnect = true;
        this.clearCallTimeout();
        if (!this.state.isConnected || this.state.connectionState !== 'connected') {
          this.updateState({ isConnected: true, connectionState: 'connected' });
        }

        // Start timer immediately (don't wait for backend)
        if (!this.callTimer) {
          this.startCallTimer();
        }

        // OPTIONAL: Send WebRTC confirmation to backend (fire-and-forget)
        // NOTE: Backend automatically promotes answered -> connected after grace period
        // This is just a confirmation signal, not the source of truth
        // Server-owned lifecycle is the source of truth
        if (this.appointmentId) {
          this.markConnectedInBackend().catch((error) => {
            // Silently fail - server will promote automatically
            console.log('ℹ️ [AudioCallService] WebRTC confirmation sent (optional - server will auto-promote)');
          });
        }

        // Audio routing is already configured for earpiece by default
        // Users can toggle to speaker using the speaker button if desired
      }
    } catch (e) {
      console.warn('⚠️ [AudioCallService] markConnectedOnce failed:', e);
    }
  }

  /**
   * Mark call as connected in backend (optional confirmation)
   * NOTE: This is now OPTIONAL - server automatically promotes answered -> connected
   * WebRTC events are confirmation signals, server-owned lifecycle is source of truth
   */
  /**
   * Mark call as answered in backend (sets answered_at)
   * CRITICAL: This must be called when doctor accepts call from call screen
   */
  private async markCallAsAnsweredInBackend(): Promise<void> {
    if (!this.appointmentId) {
      console.warn('⚠️ [AudioCallService] Cannot mark answered: no appointmentId');
      return;
    }
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [AudioCallService] Cannot mark answered: no auth token');
        return;
      }
      const apiUrl = `${environment.LARAVEL_API_URL}/api/call-sessions/answer`;
      console.log('🔗 [AudioCallService] Marking call as answered in backend:', {
        appointmentId: this.appointmentId,
        apiUrl: apiUrl
      });
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          appointment_id: this.appointmentId,
          caller_id: this.userId, // Current user (doctor or patient)
          action: 'answered'
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AudioCallService] Call marked as answered in backend:', data);
      } else {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = { raw: errorText }; }
        console.error('❌ [AudioCallService] Failed to mark call as answered:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          appointmentId: this.appointmentId
        });
      }
    } catch (apiError) {
      console.error('❌ [AudioCallService] Error calling answer API:', apiError);
      throw apiError;
    }
  }

  private async markConnectedInBackend(): Promise<void> {
    if (!this.appointmentId) {
      console.warn('⚠️ [AudioCallService] Cannot mark connected: no appointmentId');
      return;
    }

    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [AudioCallService] Cannot mark connected: no auth token');
        return;
      }

      const apiUrl = `${environment.LARAVEL_API_URL}/api/call-sessions/mark-connected`;

      console.log('🔗 [AudioCallService] Sending WebRTC confirmation (optional - server auto-promotes):', {
        appointmentId: this.appointmentId,
        callType: 'voice'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          appointment_id: this.appointmentId,
          call_type: 'voice'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AudioCallService] WebRTC confirmation sent (server will handle promotion):', data);
      } else {
        // Silently handle - server will auto-promote anyway
        console.log('ℹ️ [AudioCallService] WebRTC confirmation failed (non-critical - server auto-promotes)');
      }
    } catch (apiError: any) {
      // Silently handle - server will auto-promote anyway
      console.log('ℹ️ [AudioCallService] WebRTC confirmation error (non-critical - server auto-promotes)');
    }
  }

  /**
   * Stop call duration timer
   */
  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  /**
   * Update call state and notify listeners
   */
  private updateState(updates: Partial<AudioCallState>): void {
    const oldState = { ...this.state };
    const next: AudioCallState = { ...this.state, ...updates } as AudioCallState;

    // Prevent downgrading connection state from connected -> connecting
    if (oldState.connectionState === 'connected' && updates.connectionState === 'connecting') {
      next.connectionState = 'connected';
    }

    // Ensure callDuration is monotonic while connected (avoid resets to 0 mid-call)
    if (typeof updates.callDuration === 'number' && oldState.connectionState === 'connected' && updates.callDuration < oldState.callDuration) {
      next.callDuration = oldState.callDuration;
    }

    this.state = next;
    console.log('📊 Call state changed:', {
      from: oldState,
      to: this.state,
      updates: updates
    });
    this.events?.onStateChange(this.state);
  }

  /**
   * Get current call state
   */
  getState(): AudioCallState {
    return { ...this.state };
  }

  /**
   * Get remote audio stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get local audio stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * End the call
   */
  async endCall(): Promise<void> {
    try {
      if (this.hasEnded) {
        console.log('ℹ️ [AudioCallService] endCall already processed');
        return;
      }

      // Prevent ending call if it's being actively answered
      if (this.isCallAnswered && this.state.connectionState === 'connecting') {
        console.log('⚠️ [AudioCallService] Preventing call end - call is being answered and connecting');
        return;
      }

      this.hasEnded = true;

      // Clean up reconnection timers
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      }
      this.isReconnecting = false;
      this.reconnectionAttempts = 0;

      console.log('📞 Ending audio call...');
      console.log('📞 Call state when ending:', {
        connectionState: this.state.connectionState,
        isConnected: this.state.isConnected,
        isCallAnswered: this.isCallAnswered
      });

      // Calculate session duration
      const sessionDuration = this.state.callDuration;
      const wasConnected = this.state.isConnected && this.isCallAnswered;

      // CRITICAL: Log if call is ending without being connected
      if (!wasConnected) {
        console.warn('⚠️ [AudioCallService] Call ending without being connected:', {
          appointmentId: this.appointmentId,
          connectionState: this.state.connectionState,
          isConnected: this.state.isConnected,
          isCallAnswered: this.isCallAnswered,
          peerConnectionState: this.peerConnection?.connectionState,
          didConnect: this.didConnect
        });
        console.warn('⚠️ [AudioCallService] This call will skip connected state and go directly to ended');
        console.warn('⚠️ [AudioCallService] Check if WebRTC connection state reached "connected" before call ended');
      }

      // Clear call timeout
      this.clearCallTimeout();

      // Stop call timer
      this.stopCallTimer();

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Reset audio routing to default
      await this.resetAudioRouting();

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Clear any pending disconnect grace timer
      if (this.disconnectGraceTimer) {
        clearTimeout(this.disconnectGraceTimer);
        this.disconnectGraceTimer = null;
      }

      // Send call ended message with session info
      this.sendSignalingMessage({
        type: 'call-ended',
        callType: 'voice',
        userId: this.userId,
        appointmentId: this.appointmentId,
        sessionDuration: sessionDuration,
        wasConnected: wasConnected
      });

      // Update call session in backend
      await this.updateCallSessionInBackend(sessionDuration, wasConnected);

      // Close signaling connection
      if (this.signalingChannel) {
        this.signalingChannel.close();
        this.signalingChannel = null;
      }

      // Clear re-offer loop
      this.clearReofferLoop();

      // Reset state
      this.updateState({
        isConnected: false,
        isAudioEnabled: true,
        callDuration: 0,
        connectionState: 'disconnected',
      });

      this.events?.onCallEnded();

      // Clear global markers
      (global as any).activeAudioCall = false;
      if ((global as any).currentCallType === 'audio') {
        (global as any).currentCallType = null;
      }
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }

  /**
   * Check if call is active
   */
  isCallActive(): boolean {
    return this.state.isConnected && this.peerConnection !== null;
  }

  /**
   * Get call duration in formatted string
   */
  getFormattedDuration(): string {
    const { callDuration } = this.state;
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Reset the service state (for new calls)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting AudioCallService state...');

    // Clear all timers
    this.clearCallTimeout();
    this.stopCallTimer();

    // Close existing connections
    if (this.signalingChannel) {
      this.signalingChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Reset audio routing to default
    await this.resetAudioRouting();

    // Reset all state variables
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.clearReofferLoop();
    this.signalingChannel = null;
    this.callTimer = null;
    this.callStartTime = 0;
    this.events = null;
    this.appointmentId = null;
    this.userId = null;
    this.processedMessages.clear();
    this.isProcessingIncomingCall = false;
    this.isCallAnswered = false;
    this.didConnect = false;

    // Reset call state
    this.state = {
      isConnected: false,
      isAudioEnabled: true,
      callDuration: 0,
      connectionState: 'disconnected',
    };

    // Reset new state variables
    this.offerCreated = false;
    this.creatingOffer = false;
    this.isInitializing = false;
    this.connectionState = 'disconnected';
    this.isIncoming = false;
    this.isIncomingMode = false;
    this.hasAccepted = false;
    this.pendingCandidates = [];
    this.hasEnded = false;
    this.reNotifyAttempted = false;
    this.callStartAttempted = false;
    this.didEmitAnswered = false;

    // Only clear global pending offer if we're not in the middle of an incoming call
    // This prevents losing the offer if reset() is called during initialization
    if (!this.isIncomingMode && !this.isIncoming) {
      (global as any).pendingOffer = null;
    }
    // Always clear instance pending offer on reset (it will be restored from global if needed)
    this.pendingOffer = null;

    console.log('✅ AudioCallService state reset complete');
    (global as any).activeAudioCall = false;
  }

  /**
   * Update call session in backend when call ends
   */
  private async updateCallSessionInBackend(sessionDuration: number, wasConnected: boolean): Promise<void> {
    try {
      console.log('📞 Updating call session in backend...');

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          call_type: 'voice',
          appointment_id: this.appointmentId,
          session_duration: sessionDuration,
          was_connected: wasConnected
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Call session updated in backend:', data);
      } else if (response.status === 404) {
        console.log('ℹ️ Backend reported 404 for end update; treating as already ended');
      } else {
        console.error('❌ Failed to update call session in backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Error updating call session in backend:', error);
    }
  }

  /**
   * Reject an incoming call (callee)
   */
  async rejectIncomingCall(reason: string = 'declined'): Promise<void> {
    try {
      console.log('📞 Rejecting incoming audio call...');
      this.sendSignalingMessage({
        type: 'call-rejected',
        callType: 'voice',
        userId: this.userId,
        appointmentId: this.appointmentId,
        reason,
      });
      await this.updateCallSessionInBackend(0, false);
      await this.endCall();
      this.events?.onCallRejected();
    } catch (e) {
      console.error('❌ Error rejecting audio call:', e);
      await this.endCall();
      this.events?.onCallRejected();
    }
  }
}

export { AudioCallService };
export default AudioCallService.getInstance();
