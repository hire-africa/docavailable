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

export interface AudioCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
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
  private appointmentId: string | null = null;
  private userId: string | null = null;
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
  // Queue for signaling messages before WebSocket opens
  private messageQueue: any[] = [];
  private signalingFlushTimer: ReturnType<typeof setInterval> | null = null;
  // Avoid duplicate re-notify calls per instance
  private reNotifyAttempted: boolean = false;
  // Offer creation guard (separate from overall initialization)
  private creatingOffer: boolean = false;
  // Backend start/re-notify guard per call attempt
  private callStartAttempted: boolean = false;
  constructor() {
    this.instanceId = ++AudioCallService.instanceCounter;
    console.log(`🏗️ [AudioCallService] Instance ${this.instanceId} created`);
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): AudioCallService {
    if (!AudioCallService.activeInstance) {
      AudioCallService.activeInstance = new AudioCallService();
      console.log(`🏗️ [AudioCallService] Created new singleton instance ${AudioCallService.activeInstance.instanceId}`);
    } else {
      console.log(`🔄 [AudioCallService] Reusing existing singleton instance ${AudioCallService.activeInstance.instanceId}`);
    }
    return AudioCallService.activeInstance;
  }

  /**
   * Clear active instance
   */
  static clearInstance(): void {
    if (AudioCallService.activeInstance) {
      console.log(`🧹 [AudioCallService] Clearing active instance ${AudioCallService.activeInstance.instanceId}`);
      AudioCallService.activeInstance.endCall();
      AudioCallService.activeInstance = null;
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

      // Prevent multiple initializations
      if (this.isProcessingIncomingCall) {
        console.log(`⚠️ [AudioCallService ${this.instanceId}] Already processing incoming call, skipping...`);
        return;
      }
      
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isCallAnswered = false;
      
      // Update state after events are set
      this.updateState({ connectionState: 'connecting' });
      
      // Set flag after basic setup is complete
      this.isProcessingIncomingCall = true;

      // Incoming mode gating: do not get media or create PC until accept
      this.isIncomingMode = true;
      this.hasAccepted = false;
      this.pendingCandidates = [];
      this.hasEnded = false;

      // Connect to signaling only; buffer offer/ICE until accept
      await this.connectSignaling(appointmentId, userId);
      console.log('📞 Signaling connected for incoming call - waiting for user to accept');

      const pendingOffer = (global as any).pendingOffer;
      if (pendingOffer) {
        console.log('📞 Pending offer found - waiting for user acceptance');
      } else {
        console.warn('⚠️ No pending offer found for incoming call');
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
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          call_type: 'voice'
        })
      });

      let data: any = null;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Failed to parse availability response as JSON');
        const errorMessage = 'Failed to check call availability. Please try again.';
        this.events?.onError(errorMessage);
        return false;
      }
      
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
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
   */
  async initialize(appointmentId: string, userId: string, doctorId: string | number | undefined, events: AudioCallEvents): Promise<void> {
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
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isCallAnswered = false;
      this.updateState({ connectionState: 'connecting' });

      // Check call availability before proceeding
      const canMakeCall = await this.checkCallAvailability();
      if (!canMakeCall) {
        this.updateState({ connectionState: 'failed' });
        return;
      }

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

      // Get user media (audio only)
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      // Configure audio routing for phone calls
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
        console.log('🎵 Remote audio stream received');
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
          this.markConnectedOnce();
        } else if (connectionState === 'connecting') {
          // Never downgrade UI back to connecting once connected
          console.log('🔄 WebRTC connection in progress (ignored if already connected)');
          // No state change here to avoid UI regressions
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
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

      // Start call timeout (30 seconds for doctor to answer)
      this.startCallTimeout();
      console.log('⏰ Call timeout started (30 seconds)');
      
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
   */
  private async connectSignaling(appointmentId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to our WebRTC signaling server
      // Try multiple ways to get the WebRTC signaling URL
      const signalingUrl = 
        process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 
        Constants.expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        Constants.expoConfig?.extra?.webRtcSignalingUrl ||
        'ws://46.101.123.123:8082/audio-signaling'; // Use production URL as fallback
      const wsUrl = `${signalingUrl}/${appointmentId}`;
      
      console.log('🔧 [AudioCallService] WebSocket URL:', wsUrl);
      console.log('🔧 [AudioCallService] Signaling URL:', signalingUrl);
      console.log('🔧 [AudioCallService] Appointment ID:', appointmentId);
      console.log('🔧 [AudioCallService] User ID:', userId);
      
      try {
        this.signalingChannel = new WebSocket(wsUrl);
        
        this.signalingChannel.onopen = () => {
          console.log('🔌 Connected to signaling server');
          try { this.flushSignalingQueue(); } catch (e) { console.warn('⚠️ [AudioCallService] Failed to flush signaling queue on open:', e); }
          resolve();
        };

        this.signalingChannel.onmessage = async (event) => {
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
                      console.log('📞 [AudioCallService] Stored pending offer for incoming call; awaiting user acceptance');
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

        this.signalingChannel.onerror = (error) => {
          console.error('❌ Signaling WebSocket error:', error);
          reject(error);
        };

        this.signalingChannel.onclose = () => {
          console.log('🔌 Signaling connection closed');
          if (this.signalingFlushTimer) {
            clearInterval(this.signalingFlushTimer);
            this.signalingFlushTimer = null;
          }
          this.updateState({ connectionState: 'disconnected' });
        };

      } catch (error) {
        console.error('❌ Failed to create signaling connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Process offer when user accepts incoming call
   */
  async processIncomingOffer(): Promise<void> {
    const pendingOffer = (global as any).pendingOffer;
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
      
      // Clear the pending offer after successful processing
      (global as any).pendingOffer = null;
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
      
      if (state === 'connected') {
        console.log('🔗 WebRTC connected - updating call state');
        // Clear any pending disconnect grace timer
        if (this.disconnectGraceTimer) {
          clearTimeout(this.disconnectGraceTimer);
          this.disconnectGraceTimer = null;
        }
        this.markConnectedOnce();
      } else if (state === 'disconnected' || state === 'failed') {
        console.log('🔗 WebRTC disconnected/failed - starting grace timer');
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
            this.stopCallTimer();
            this.endCall();
          }
        }, 2500);
      }
    });
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
      console.log('📞 Configuring audio routing for earpiece...');
      
      // Set audio mode for phone calls (earpiece)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true, // This forces earpiece usage on Android
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      
      console.log('✅ Audio routing configured for earpiece');
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
    
    // Prevent duplicate offer handling
    if (this.hasAccepted) {
      console.warn('⚠️ [handleOffer] Call already accepted - ignoring duplicate offer');
      return;
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
        await this.peerConnection.setLocalDescription(answer);
        
        console.log('📞 Sending answer message...');
        this.sendSignalingMessage({
          type: 'answer',
          answer: answer,
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
        await this.peerConnection.setLocalDescription(answer);
        
        this.sendSignalingMessage({
          type: 'answer',
          answer: answer,
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
        this.events?.onCallAnswered();
        this.clearReofferLoop();
        this.markConnectedOnce();
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
          this.events?.onCallAnswered();
          this.markConnectedOnce();
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
          try { this.flushSignalingQueue(); } catch {}
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
      
      const pendingOffer = (global as any).pendingOffer;
      console.log('📞 [AudioCallService] Checking for pending offer:', {
        hasPendingOffer: !!pendingOffer,
        offerType: pendingOffer?.type,
        offerSdpLength: pendingOffer?.sdp?.length
      });
      
      if (!pendingOffer) {
        console.warn('⚠️ [AudioCallService] No pending offer found - requesting re-offer from caller');
        // Prepare media and PC so we can immediately process the re-offer when it arrives
        if (!this.localStream) {
          this.localStream = await mediaDevices.getUserMedia({ video: false, audio: true });
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
        this.localStream = await mediaDevices.getUserMedia({ video: false, audio: true });
        await this.configureAudioRouting();
      }
      if (!this.peerConnection) {
        await this.initializePeerConnection();
      }

      console.log('📞 [AudioCallService] Processing pending offer...');
      await this.handleOffer(pendingOffer);
      
      console.log('📞 [AudioCallService] Offer processed successfully, clearing pending offer');
      // Clear the pending offer after processing
      (global as any).pendingOffer = null;
      
      // Drain queued ICE candidates now that remoteDescription is set
      if (this.peerConnection && this.pendingCandidates.length > 0) {
        for (const c of this.pendingCandidates) {
          try { await this.peerConnection.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
        }
        this.pendingCandidates = [];
      }

      // Clear the pending offer
      (global as any).pendingOffer = null;
      this.hasAccepted = true;
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
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📞 [AudioCallService] Sending offer via signaling...');
      this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        appointmentId: this.appointmentId,
        userId: this.userId,
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
    }, 30000); // 30 seconds timeout
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
    // Do not echo call-answered back
    this.events?.onCallAnswered();
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
    const base = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
    try {
      const turnUrl = (process.env.EXPO_PUBLIC_TURN_URL as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_URL || (Constants.expoConfig?.extra as any)?.turnUrl;
      const turnUsername = (process.env.EXPO_PUBLIC_TURN_USERNAME as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_USERNAME || (Constants.expoConfig?.extra as any)?.turnUsername;
      const turnCredential = (process.env.EXPO_PUBLIC_TURN_CREDENTIAL as string) || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_TURN_CREDENTIAL || (Constants.expoConfig?.extra as any)?.turnCredential;
      if (turnUrl && turnUsername && turnCredential) {
        base.push({ urls: turnUrl, username: turnUsername, credential: turnCredential } as any);
        console.log('🌐 [AudioCallService] TURN server configured');
      } else {
        console.log('🌐 [AudioCallService] No TURN configured (using STUN only)');
      }
    } catch (e) {
      console.warn('⚠️ [AudioCallService] Failed to read TURN config:', e);
    }
    return base;
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
  toggleSpeaker(speakerOn: boolean): void {
    try {
      console.log('🔊 Toggling speaker:', speakerOn ? 'ON' : 'OFF');
      
      // For React Native, we need to use the Audio module to set speaker mode
      // This is a simple implementation - in a real app you'd use react-native-audio or similar
      if (this.remoteStream) {
        // Set the audio output to speaker or earpiece
        this.remoteStream.getAudioTracks().forEach(track => {
          // This is a placeholder - actual implementation would use native audio routing
          console.log('🔊 Audio track speaker mode set to:', speakerOn ? 'speaker' : 'earpiece');
        });
      }
      
      console.log('✅ Speaker mode updated successfully');
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
    } catch {}
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
   * Idempotently mark the call as connected and start timer oncen   */
  private markConnectedOnce(): void {
    try {
      if (!this.didConnect) {
        this.didConnect = true;
        this.clearCallTimeout();
        if (!this.state.isConnected || this.state.connectionState !== 'connected') {
          this.updateState({ isConnected: true, connectionState: 'connected' });
        }
        if (!this.callTimer) {
          this.startCallTimer();
        }
      }
    } catch (e) {
      console.warn('⚠️ [AudioCallService] markConnectedOnce failed:', e);
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
    this.state = { ...this.state, ...updates };
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
      this.hasEnded = true;
      console.log('📞 Ending audio call...');
      console.log('📞 Call state when ending:', {
        connectionState: this.state.connectionState,
        isConnected: this.state.isConnected,
        isCallAnswered: this.isCallAnswered
      });
      
      // Calculate session duration
      const sessionDuration = this.state.callDuration;
      const wasConnected = this.state.isConnected && this.isCallAnswered;
      
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
    
    // Clear global pending offer
    (global as any).pendingOffer = null;
    
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
export default new AudioCallService();
