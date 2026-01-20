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
import { SecureWebSocketService } from './secureWebSocketService';

export interface VideoCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
}

export interface VideoCallEvents {
  onStateChange: (state: VideoCallState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onCallRejected: () => void;
  onCallTimeout: () => void;
  onCallAnswered?: () => void;
  onPeerMediaStateChange?: (payload: { audioEnabled: boolean; videoEnabled: boolean }) => void;
}

class VideoCallService {
  private static instanceCounter = 0;
  private static activeInstance: VideoCallService | null = null;
  private instanceId: number;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: SecureWebSocketService | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private events: VideoCallEvents | null = null;
  private callTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reofferTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private isCallAnswered: boolean = false;
  private appointmentId: string | null = null;
  private userId: string | null = null;
  private doctorName: string | null = null;
  private doctorProfilePicture: string | null = null;
  private processedMessages: Set<string> = new Set();
  private isProcessingIncomingCall: boolean = false;
  private isFrontCamera: boolean = true;
  private isSpeakerOn: boolean = true; // Default to speaker for video calls
  // Incoming-call gating flags/queues
  private isIncomingMode: boolean = false;
  private hasAccepted: boolean = false;
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasEnded: boolean = false;

  private state: VideoCallState = {
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isFrontCamera: true,
    callDuration: 0,
    connectionState: 'disconnected',
  };

  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor() {
    this.instanceId = ++VideoCallService.instanceCounter;
    console.log(`🏗️ [VideoCallService] Instance ${this.instanceId} created`);
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): VideoCallService {
    if (!VideoCallService.activeInstance) {
      VideoCallService.activeInstance = new VideoCallService();
    }
    return VideoCallService.activeInstance;
  }

  /**
   * Initialize for incoming call
   */
  async initializeForIncomingCall(appointmentId: string, userId: string, events: VideoCallEvents): Promise<void> {
    try {
      console.log('📞 [VideoCallService] Initializing for incoming call...');
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isProcessingIncomingCall = true;
      this.updateState({ connectionState: 'connecting' });

      // Incoming mode: do NOT auto-answer or create PC yet
      this.isIncomingMode = true;
      this.hasAccepted = false;
      this.pendingOffer = null;
      this.pendingCandidates = [];
      this.hasEnded = false;

      // Connect to signaling server to receive and buffer offer/ICE
      await this.connectSignaling(appointmentId, userId);

      console.log('✅ [VideoCallService] Incoming call initialization complete');
    } catch (error) {
      console.error('❌ [VideoCallService] Error initializing for incoming call:', error);
      this.updateState({ connectionState: 'failed' });
      throw error;
    } finally {
      this.isProcessingIncomingCall = false;
    }
  }

  /**
   * Check if user has remaining video calls
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
          call_type: 'video'
        })
      });

      let data: any = null;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Failed to parse availability response as JSON');
        this.events?.onCallRejected();
        return false;
      }

      if (data.success && data.can_make_call) {
        console.log('✅ Video call availability confirmed:', data.remaining_calls, 'calls remaining');
        return true;
      } else {
        console.log('❌ Video call not available:', data.message);
        this.events?.onCallRejected();
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking call availability:', error);
      const errorMessage = error.message?.includes('Network request failed')
        ? 'Network error. Please check your internet connection and try again.'
        : 'Failed to check call availability. Please try again.';
      this.events?.onCallRejected();
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
      console.log('🔑 [VideoCallService] Retrieved auth token:', token ? 'Present' : 'Missing');
      return token || '';
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to get auth token:', error);
      return '';
    }
  }

  /**
   * Initialize video call service
   */
  async initialize(appointmentId: string, userId: string, doctorId: string | number | undefined, events: VideoCallEvents, doctorName?: string, doctorProfilePicture?: string): Promise<void> {
    try {
      // Prevent simultaneous audio call initialization or audio-only sessions
      const g: any = global as any;
      if (g.activeAudioCall || g.currentCallType === 'audio') {
        console.warn('⚠️ [VideoCallService] Audio flow active/current; suppressing video initialization');
        events?.onCallRejected?.();
        return;
      }
      g.activeVideoCall = true;
      g.currentCallType = 'video';
      this.events = events;
      this.appointmentId = appointmentId;
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
          console.warn('⚠️ [VideoCallService] Invalid doctorId format:', doctorId);
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
              console.warn('⚠️ Could not fetch appointment to infer doctorId for video call:', resp.status);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error inferring doctorId from appointment (video):', e);
        }
      }

      // Add debug logging before the validation
      console.log('🔍 [VideoCallService] doctorId resolution:', {
        originalDoctorId: doctorId,
        finalDoctorId,
        appointmentId,
        isDirectSession: appointmentId.startsWith('direct_session_')
      });

      if (finalDoctorId == null || Number.isNaN(finalDoctorId) || finalDoctorId <= 0) {
        console.error('❌ [VideoCallService] doctorId is required to start call session; aborting call start', {
          originalDoctorId: doctorId,
          finalDoctorId,
          appointmentId
        });
        this.events?.onCallRejected?.();
        this.updateState({ connectionState: 'failed' });
        return;
      }

      // Start call session on backend to trigger push notification to the doctor (video)
      // Always attempt start; if already active, continue without error so both flows work
      try {
        const startResp = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({
            call_type: 'video',
            appointment_id: appointmentId,
            doctor_id: finalDoctorId
          })
        });
        if (!startResp.ok) {
          const body = await startResp.text().catch(() => '');
          // Treat "already active" as benign (e.g., another flow already started the session)
          if (startResp.status === 400 && body.includes('already have an active call session')) {
            console.log('ℹ️ [VideoCallService] Backend reports existing active call session; continuing');
            // Proactively request a re-notify to ensure the callee gets the push
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
              console.log('ℹ️ [VideoCallService] Re-notify response:', rn.status, rnText);
            } catch (e) {
              console.warn('⚠️ [VideoCallService] Re-notify failed:', e);
            }
          } else {
            console.error('❌ Failed to start video call session on backend:', startResp.status, body);
          }
        } else {
          const startData = await startResp.json().catch(() => ({} as any));
          console.log('✅ Video call session started on backend:', startData?.data?.session_id ?? startData);
        }
      } catch (e) {
        console.error('❌ Error starting video call session on backend:', e);
      }

      // Get user media (audio + video)
      this.localStream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log('📹 [VideoCallService] Local stream captured:', {
        streamId: this.localStream.id,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTrackLabel: this.localStream.getVideoTracks()[0]?.label,
        audioTrackLabel: this.localStream.getAudioTracks()[0]?.label
      });

      // Configure audio routing for phone calls
      await this.configureAudioRouting();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.addEventListener('track', (event) => {
        console.log('📹 Remote video stream received');
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

      // Handle connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        const state = this.peerConnection?.connectionState;
        console.log('🔗 Video call connection state:', state);
        console.log('🔗 Current video call state:', {
          connectionState: this.state.connectionState,
          isCallAnswered: this.isCallAnswered,
          hasEnded: this.hasEnded
        });

        if (state === 'connected') {
          console.log('🔗 Video WebRTC connected - updating call state');
          this.updateState({
            isConnected: true,
            connectionState: 'connected'
          });
          this.startCallTimer();
          // Broadcast current media state to peer on connect
          this.sendSignalingMessage({
            type: 'media-state',
            audioEnabled: this.state.isAudioEnabled,
            videoEnabled: this.state.isVideoEnabled,
            senderId: this.userId,
            appointmentId: this.appointmentId,
          });
        } else if (state === 'disconnected' || state === 'failed') {
          // CRITICAL: Ignore disconnected/failed during initial setup - WebRTC can report these transiently during setup
          // Check if we're still in 'connecting' state (initialization phase)
          if (this.state.connectionState === 'connecting') {
            console.log('⚠️ Video WebRTC reported disconnected/failed during initialization - ignoring (this is normal during setup)');
            return;
          }
          // Only update state if call is not answered and not already ended and not being accepted
          if (!this.isCallAnswered && !this.hasEnded && !this.hasAccepted) {
            console.log('🔗 Video WebRTC disconnected/failed - updating state');
            this.updateState({
              isConnected: false,
              connectionState: 'disconnected'
            });
          } else {
            console.log('🔗 Video WebRTC disconnected/failed but call is answered, already ended, or being accepted - ignoring');
          }
        }
      });

      // Connect to signaling server
      await this.connectSignaling(appointmentId, userId);

      // Create and send offer for outgoing calls
      await this.createOffer();
      console.log('📞 Video call offer sent successfully, starting call timeout...');

      // Start call timeout (60 seconds for doctor to answer)
      this.startCallTimeout();

      // Begin periodic re-offer loop until answered or connected
      this.startReofferLoop();

      console.log('✅ [VideoCallService] Video call initialization complete');
    } catch (error) {
      console.error('❌ [VideoCallService] Error initializing video call:', error);
      this.updateState({ connectionState: 'failed' });
      throw error;
    }
  }

  /**
   * Connect to WebSocket signaling server
   */
  private async connectSignaling(appointmentId: string, userId: string): Promise<void> {
    try {
      // Connect to our WebRTC signaling server
      const signalingUrl =
        process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        (Constants as any).expoConfig?.extra?.webrtc?.signalingUrl ||
        environment.WEBRTC_SIGNALING_URL;

      const wsUrl = `${signalingUrl}?appointmentId=${encodeURIComponent(appointmentId)}&userId=${encodeURIComponent(userId)}`;
      console.log('🔌 [VideoCallService] Connecting to signaling server:', wsUrl);
      console.log('🔧 [VideoCallService] User ID:', userId);

      // Create secure WebSocket connection that handles self-signed certificates
      this.signalingChannel = new SecureWebSocketService({
        url: wsUrl,
        ignoreSSLErrors: true, // Allow self-signed certificates
        onOpen: () => {
          console.log('🔌 Connected to video signaling server');
        },
        onMessage: async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Video signaling message received:', message.type);

            switch (message.type) {
              case 'offer':
                console.log('📞 [VideoCallService] Received offer');
                if (this.isIncomingMode && !this.hasAccepted) {
                  // Store offer globally for consistency with AudioCallService
                  (global as any).pendingOffer = message.offer;
                  this.pendingOffer = message.offer;
                  console.log('⏸️ [VideoCallService] Buffered incoming offer until accept');
                } else {
                  await this.handleOffer(message.offer);
                }
                break;
              case 'answer':
                console.log('📞 [VideoCallService] Received answer');
                await this.handleAnswer(message.answer);
                break;
              case 'ice-candidate':
                console.log('📞 [VideoCallService] Received ICE candidate');
                if (this.isIncomingMode && (!this.peerConnection || !this.peerConnection.remoteDescription)) {
                  this.pendingCandidates.push(message.candidate);
                  console.log('⏸️ [VideoCallService] Queued ICE candidate (awaiting remoteDescription)');
                } else {
                  await this.handleIceCandidate(message.candidate);
                }
                break;
              case 'call-ended':
                console.log('📞 [VideoCallService] Received call-ended');
                this.endCall();
                break;
              case 'call-answered':
                console.log('📞 [VideoCallService] Received call-answered');
                this.handleCallAnswered();
                break;
              case 'media-state':
                console.log('🎛️ [VideoCallService] Received media-state', message);
                this.events?.onPeerMediaStateChange?.({
                  audioEnabled: !!message.audioEnabled,
                  videoEnabled: !!message.videoEnabled,
                });
                break;
              case 'call-rejected':
                console.log('📞 [VideoCallService] Received call-rejected');
                this.handleCallRejected(message.reason);
                break;
              case 'call-timeout':
                console.log('📞 [VideoCallService] Received call-timeout');
                this.handleCallTimeout();
                break;
              case 'resend-offer-request':
                console.log('📞 [VideoCallService] Received resend offer request');
                if (this.peerConnection) {
                  if (!this.peerConnection.localDescription) {
                    try {
                      console.log('📨 [VideoCallService] Resend requested but no localDescription; creating fresh offer');
                      await this.createOffer();
                    } catch (e) {
                      console.warn('⚠️ [VideoCallService] Failed to create fresh offer on resend request:', e);
                    }
                  }
                  if (this.peerConnection?.localDescription) {
                    console.log('📨 [VideoCallService] Received resend-offer-request; resending offer');
                    this.sendSignalingMessage({
                      type: 'offer',
                      offer: this.peerConnection.localDescription,
                      senderId: this.userId,
                      appointmentId: this.appointmentId,
                      userId: this.userId,
                    });
                  } else {
                    console.warn('⚠️ [VideoCallService] Cannot resend offer - still no localDescription available');
                  }
                }
                break;
            }
          } catch (error) {
            console.error('❌ Error handling video signaling message:', error);
          }
        },
        onError: (error) => {
          console.error('❌ Video signaling WebSocket error:', error);
        },
        onClose: () => {
          console.log('🔌 Video signaling connection closed');
          this.updateState({ connectionState: 'disconnected' });
        }
      });

      // Actually establish the connection with automatic fallback
      try {
        await this.signalingChannel.connect();
      } catch (error) {
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Chain validation failed') || errorMessage.includes('failed') || errorMessage.includes('SSL') || errorMessage.includes('timeout')) {
          console.warn('⚠️ [VideoCallService] Video signaling SSL/Connection error, attempting fallback...', errorMessage);

          // Try fallback URL from environment
          const fallbackSignalingUrl = environment.WEBRTC_FALLBACK_SIGNALING_URL;
          const wsFallbackUrl = `${fallbackSignalingUrl}?appointmentId=${encodeURIComponent(appointmentId)}&userId=${encodeURIComponent(userId)}`;

          console.log('🔌 [VideoCallService] Retrying with fallback URL:', wsFallbackUrl);

          // Re-instantiate with fallback URL
          const options = (this.signalingChannel as any).options;
          this.signalingChannel = new SecureWebSocketService({
            ...options,
            url: wsFallbackUrl,
            ignoreSSLErrors: true,
          });

          await this.signalingChannel.connect();
          console.log('✅ [VideoCallService] Connected using fallback signaling URL');
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ Failed to create video signaling connection:', error);
      throw error;
    }
  }

  /**
   * Accept incoming call: create PC, get media, apply buffered offer/candidates, answer
   */
  async acceptIncomingCall(): Promise<void> {
    try {
      if (this.hasAccepted) {
        console.log('ℹ️ [VideoCallService] Incoming call already accepted');
        return;
      }

      // CRITICAL: Call answer endpoint to update database (answered_at)
      // This must happen when doctor accepts call
      if (this.appointmentId) {
        try {
          console.log('🔗 [VideoCallService] acceptIncomingCall - marking as answered in backend');
          await this.markCallAsAnsweredInBackend();
        } catch (error) {
          console.error('❌ [VideoCallService] Failed to mark call as answered in backend:', error);
          // Continue with WebRTC processing even if backend call fails
        }
      }
      this.hasAccepted = true;

      // Prepare media and audio routing
      this.localStream = await mediaDevices.getUserMedia({ video: true, audio: true });
      await this.configureAudioRouting();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.addEventListener('track', (event) => {
        console.log('📹 Remote video stream received');
        this.remoteStream = event.streams[0];
        this.events?.onRemoteStream(event.streams[0]);
      });

      // Handle local ICE
      this.peerConnection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            senderId: this.userId,
          });
        }
      });

      // Connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        const state = this.peerConnection?.connectionState;
        console.log('🔗 Video call connection state:', state);
        console.log('🔗 Current video call state:', {
          connectionState: this.state.connectionState,
          isCallAnswered: this.isCallAnswered,
          hasEnded: this.hasEnded
        });

        if (state === 'connected') {
          console.log('🔗 Video WebRTC connected - updating call state');
          this.clearReofferLoop();
          this.updateState({ isConnected: true, connectionState: 'connected' });

          // OPTIONAL: Send WebRTC confirmation to backend (fire-and-forget)
          // NOTE: Backend automatically promotes answered -> connected after grace period
          // This is just a confirmation signal, not the source of truth
          this.markConnectedInBackend().catch(() => {
            // Silently fail - server will promote automatically
          });

          this.startCallTimer();
          // Broadcast current media state to peer on connect
          this.sendSignalingMessage({
            type: 'media-state',
            audioEnabled: this.state.isAudioEnabled,
            videoEnabled: this.state.isVideoEnabled,
            senderId: this.userId,
            appointmentId: this.appointmentId,
          });
        } else if (state === 'disconnected' || state === 'failed') {
          // CRITICAL: Ignore disconnected/failed during initial setup - WebRTC can report these transiently during setup
          // Check if we're still in 'connecting' state (initialization phase)
          if (this.state.connectionState === 'connecting') {
            console.log('⚠️ Video WebRTC reported disconnected/failed during initialization - ignoring (this is normal during setup)');
            return;
          }
          // Only update state if call is not answered and not already ended
          if (!this.isCallAnswered && !this.hasEnded) {
            console.log('🔗 Video WebRTC disconnected/failed - updating state');
            this.updateState({ isConnected: false, connectionState: 'disconnected' });
          } else {
            console.log('🔗 Video WebRTC disconnected/failed but call is answered or already ended - ignoring');
          }
        }
      });

      // If an offer was buffered, handle it now
      if (this.pendingOffer) {
        await this.handleOffer(this.pendingOffer as any);
        this.pendingOffer = null;
        // Drain queued candidates now that remoteDescription should be set
        for (const c of this.pendingCandidates) {
          try { await this.peerConnection!.addIceCandidate(c as any); } catch (e) { console.warn('ICE drain failed', e); }
        }
        this.pendingCandidates = [];
      }

      console.log('✅ [VideoCallService] Incoming call accepted');
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to accept incoming call:', error);
      this.events?.onCallRejected();
      throw error;
    }
  }

  /**
   * Process incoming call when user accepts (for receiver)
   */
  async processIncomingCall(): Promise<void> {
    try {
      console.log('📞 [VideoCallService] Processing incoming call after user acceptance...');

      // CRITICAL: Call answer endpoint to update database (answered_at)
      // This must happen BEFORE WebRTC processing to ensure lifecycle correctness
      if (this.appointmentId) {
        try {
          await this.markCallAsAnsweredInBackend();
        } catch (error) {
          console.error('❌ [VideoCallService] Failed to mark call as answered in backend:', error);
          // Continue with WebRTC processing even if backend call fails
        }
      }

      // Clear any pending disconnect grace timer since we're actively answering
      if (this.disconnectGraceTimer) {
        console.log('📞 [VideoCallService] Clearing disconnect grace timer - call is being answered');
        clearTimeout(this.disconnectGraceTimer);
        this.disconnectGraceTimer = null;
      }

      // Check both global and local pending offers
      const globalPendingOffer = (global as any).pendingOffer;
      const localPendingOffer = this.pendingOffer;
      const pendingOffer = globalPendingOffer || localPendingOffer;

      console.log('📞 [VideoCallService] Checking for pending offer:', {
        hasGlobalOffer: !!globalPendingOffer,
        hasLocalOffer: !!localPendingOffer,
        offerType: pendingOffer?.type,
        offerSdpLength: pendingOffer?.sdp?.length
      });

      if (!pendingOffer) {
        console.warn('⚠️ [VideoCallService] No pending offer found - requesting re-offer from caller');
        // Ask caller to resend the current offer
        this.sendSignalingMessage({
          type: 'resend-offer-request',
          appointmentId: this.appointmentId,
          userId: this.userId,
        });
        this.hasAccepted = true;
        return;
      }

      console.log('📞 [VideoCallService] Processing pending offer...');
      await this.handleOffer(pendingOffer);

      // Clear both global and local pending offers
      (global as any).pendingOffer = null;
      this.pendingOffer = null;
      console.log('✅ [VideoCallService] Incoming call processed successfully');

    } catch (error) {
      console.error('❌ [VideoCallService] Failed to process incoming call:', error);
      this.events?.onCallRejected();
      throw error;
    }
  }

  /**
   * Create and send offer
   */
  async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection available');
      return;
    }

    try {
      console.log('📞 Creating video call offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        callType: 'video',
        doctorName: this.doctorName || 'Unknown',
        doctorProfilePicture: this.doctorProfilePicture || '',
      });

      console.log('✅ Video call offer sent with callType: video');
    } catch (error) {
      console.error('❌ Error creating video offer:', error);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection available for offer');
      return;
    }

    try {
      console.log('📞 Handling video offer...');
      // Avoid duplicate handling if already have remote description
      if (this.peerConnection.signalingState !== 'stable' && this.peerConnection.remoteDescription) {
        console.log('ℹ️ [VideoCallService] Ignoring duplicate offer; already have remoteDescription');
        return;
      }

      await this.peerConnection.setRemoteDescription(offer);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        senderId: this.userId,
        callType: 'video',
      });

      // Notify caller that call has been answered
      this.isCallAnswered = true;
      this.sendSignalingMessage({
        type: 'call-answered',
        callType: 'video',
        userId: this.userId,
        appointmentId: this.appointmentId
      });

      console.log('✅ Video call answer sent with callType: video');
    } catch (error) {
      console.error('❌ Error handling video offer:', error);
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection available for answer');
      return;
    }

    try {
      console.log('📞 Handling video answer...', {
        answerType: answer.type,
        hasSDP: !!answer.sdp,
        peerConnectionState: this.peerConnection.connectionState
      });
      // Only set remote answer if we previously created an offer (caller side)
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.log('ℹ️ [VideoCallService] Ignoring unexpected answer in state', this.peerConnection.signalingState);
        return;
      }
      await this.peerConnection.setRemoteDescription(answer);
      console.log('✅ Video call answer processed successfully');

      // FIX: Properly set connection state and start call timer
      this.isCallAnswered = true;
      this.updateState({
        connectionState: 'connected',
        isConnected: true
      });
      this.startCallTimer();

      // FIX: Do NOT deduct immediately - deductions happen after 10 minutes and on hangup
      // this.deductCallSession();

      // Safely call onCallAnswered if it exists
      if (this.events?.onCallAnswered && typeof this.events.onCallAnswered === 'function') {
        this.events.onCallAnswered();
      }

      // FALLBACK: If connectionstatechange doesn't fire within 3 seconds, ensure connected state
      setTimeout(() => {
        if (this.peerConnection?.connectionState === 'connected' &&
          this.state.connectionState !== 'connected') {
          console.log('🔄 Fallback: Forcing connected state after timeout');
          this.updateState({ connectionState: 'connected', isConnected: true });
          this.startCallTimer();
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error handling video answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection available for ICE candidate');
      return;
    }

    try {
      if (!this.peerConnection.remoteDescription) {
        // Queue if remoteDescription not set yet
        this.pendingCandidates.push(candidate as any);
        console.log('⏸️ [VideoCallService] Queued ICE candidate (no remoteDescription)');
        return;
      }
      await this.peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }

  /**
   * Toggle audio mute/unmute
   */
  toggleAudio(): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });

      this.updateState({
        isAudioEnabled: audioTracks[0]?.enabled ?? false
      });
      // Inform peer of media state change
      this.sendSignalingMessage({
        type: 'media-state',
        audioEnabled: this.state.isAudioEnabled,
        videoEnabled: this.state.isVideoEnabled,
        senderId: this.userId,
        appointmentId: this.appointmentId,
      });

      console.log('🔊 Audio toggled:', audioTracks[0]?.enabled ? 'ON' : 'OFF');
    }
  }

  /**
   * Toggle between speaker and earpiece
   */
  async toggleSpeaker(): Promise<void> {
    try {
      // Toggle the audio routing between speaker and earpiece
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: !this.isSpeakerOn, // Toggle between speaker and earpiece
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      this.isSpeakerOn = !this.isSpeakerOn;
      console.log(`🔊 Audio output switched to ${this.isSpeakerOn ? 'speaker' : 'earpiece'}`);
    } catch (error) {
      console.error('❌ Error toggling speaker:', error);
    }
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });

      this.updateState({
        isVideoEnabled: videoTracks[0]?.enabled ?? false
      });
      // Inform peer of media state change
      this.sendSignalingMessage({
        type: 'media-state',
        audioEnabled: this.state.isAudioEnabled,
        videoEnabled: this.state.isVideoEnabled,
        senderId: this.userId,
        appointmentId: this.appointmentId,
      });

      console.log('🎥 Video toggled:', videoTracks[0]?.enabled ? 'ON' : 'OFF');
    }
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream || !this.peerConnection) {
      console.warn('⚠️ Cannot switch camera - no active stream or connection');
      return;
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn('⚠️ No video tracks found to switch');
      return;
    }

    const track = videoTracks[0];
    const settings = track.getSettings();
    const newFacingMode = settings.facingMode === 'user' ? 'environment' : 'user';

    try {
      console.log('📹 Switching camera from', settings.facingMode, 'to', newFacingMode);

      // Get new stream with switched camera
      const newStream = await mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true,
      });

      // Find the video sender
      const videoSender = this.peerConnection.getSenders().find(sender =>
        sender.track && sender.track.kind === 'video'
      );

      if (!videoSender) {
        console.error('❌ No video sender found in peer connection');
        newStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Get the new video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        console.error('❌ No video track in new stream');
        newStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Replace the video track
      await videoSender.replaceTrack(newVideoTrack);

      // Stop old video track
      track.stop();

      // Update local stream reference
      this.localStream = newStream;
      this.isFrontCamera = newFacingMode === 'user';

      // Update state
      this.updateState({ isFrontCamera: this.isFrontCamera });

      console.log('✅ Camera switched successfully to:', newFacingMode);
    } catch (error) {
      console.error('❌ Error switching camera:', error);
      // Try to recover by keeping the current camera
      this.updateState({ isFrontCamera: this.isFrontCamera });
    }
  }

  /**
   * Reject an incoming call (callee)
   */
  async rejectIncomingCall(reason: string = 'declined'): Promise<void> {
    try {
      console.log('📞 Rejecting incoming video call...');
      // Inform peer immediately
      this.sendSignalingMessage({
        type: 'call-rejected',
        callType: 'video',
        userId: this.userId,
        appointmentId: this.appointmentId,
        reason,
      });
      // Update backend as ended without connection
      await this.updateCallSessionInBackend(0, false);
      this.cleanup();
      this.events?.onCallRejected();
    } catch (e) {
      console.error('❌ Error rejecting call:', e);
      this.cleanup();
      this.events?.onCallRejected();
    }
  }

  /**
   * End the call
   */
  async endCall(): Promise<void> {
    if (this.hasEnded) {
      console.log('ℹ️ [VideoCallService] endCall already processed');
      return;
    }

    this.hasEnded = true;
    console.log('📞 Ending video call...');
    console.log('📞 Call state when ending:', {
      connectionState: this.state.connectionState,
      isConnected: this.state.isConnected,
      isCallAnswered: this.isCallAnswered
    });

    // Calculate session duration
    const sessionDuration = this.state.callDuration;
    const wasConnected = this.state.isConnected && this.isCallAnswered;

    // Clear call timeout and timer first
    this.clearCallTimeout();
    this.stopCallTimer();

    // Notify UI first so it can detach/hide RTCViews before media teardown
    try {
      this.events?.onCallEnded();
    } catch { }
    // Give UI a brief moment to update before tearing down tracks/PC
    await new Promise(resolve => setTimeout(resolve, 80));

    // Now stop local stream after UI updated
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Reset audio routing to default
    await this.resetAudioRouting();

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Send call ended message with session info
    this.sendSignalingMessage({
      type: 'call-ended',
      callType: 'video',
      userId: this.userId,
      appointmentId: this.appointmentId,
      sessionDuration: sessionDuration,
      wasConnected: wasConnected
    });

    // Update call session in backend
    await this.updateCallSessionInBackend(sessionDuration, wasConnected);

    this.cleanup();
  }

  /**
   * Handle call answered
   */
  private handleCallAnswered(): void {
    console.log('📞 Video call answered');
    this.isCallAnswered = true;
    this.clearCallTimeout();
    // Do not echo another call-answered to avoid ping-pong
    // Caller will stop reoffers upon connection; this flag is enough for UI
  }

  /**
   * Handle call rejected
   */
  private handleCallRejected(reason?: string): void {
    console.log('📞 Video call rejected:', reason);
    this.cleanup();
    this.events?.onCallRejected();
  }

  /**
   * Handle call timeout
   */
  private handleCallTimeout(): void {
    console.log('📞 Video call timeout');
    this.cleanup();
    this.events?.onCallTimeout();
  }

  /**
   * Send signaling message
   */
  private sendSignalingMessage(message: any): void {
    if (this.signalingChannel && this.signalingChannel.readyState === 1) { // WebSocket.OPEN = 1
      this.signalingChannel.send(JSON.stringify({
        ...message,
        appointmentId: this.appointmentId,
        userId: this.userId,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.error('❌ Signaling channel not available');
    }
  }

  /**
   * Update call state
   */
  private updateState(updates: Partial<VideoCallState>): void {
    this.state = { ...this.state, ...updates };
    this.events?.onStateChange(this.state);
  }

  /**
   * Start call timer
   */
  private startCallTimer(): void {
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      this.updateState({ callDuration: duration });
    }, 1000);
  }

  /**
   * Stop call timer
   */
  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  /**
   * Start call timeout
   */
  private startCallTimeout(): void {
    this.clearCallTimeout(); // Clear any existing timeout

    this.callTimeoutTimer = setTimeout(() => {
      console.log('⏰ [VideoCallService] Call timeout triggered');
      if (!this.isCallAnswered && this.state.connectionState !== 'connected') {
        console.log('⏰ [VideoCallService] Call timeout - ending call');
        this.handleCallTimeout();
      } else {
        console.log('⏰ [VideoCallService] Call timeout triggered but call was already answered - ignoring');
      }
    }, 60000); // 60 seconds timeout
  }

  /**
   * Clear call timeout
   */
  private clearCallTimeout(): void {
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  /**
   * Configure audio routing for phone calls
   */
  private async configureAudioRouting(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false, // Use loudspeaker for video calls
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      // Try to set audio output to loudspeaker for video calls
      try {
        // For Android, we can try to set the audio output to speaker
        if (Constants.platform?.android) {
          // This will be handled by the playThroughEarpieceAndroid: false setting
          console.log('🔊 Android: Audio configured for loudspeaker');
        }

        // For iOS, we might need additional configuration
        if (Constants.platform?.ios) {
          console.log('🔊 iOS: Audio configured for loudspeaker');
        }
      } catch (audioOutputError) {
        console.log('⚠️ Could not set specific audio output, using default routing');
      }

      console.log('🔊 Audio routing configured for video calls (loudspeaker)');
    } catch (error) {
      console.error('❌ Error configuring audio routing:', error);
    }
  }

  /**
   * Reset audio routing to default
   */
  private async resetAudioRouting(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      console.log('🔊 Audio routing reset to default');
    } catch (error) {
      console.error('❌ Error resetting audio routing:', error);
    }
  }

  /**
   * Get current call state
   */
  getState(): VideoCallState {
    return { ...this.state };
  }

  /**
   * Get call duration in formatted string
   */
  getFormattedDuration(): string {
    const minutes = Math.floor(this.state.callDuration / 60);
    const seconds = this.state.callDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    console.log('📹 [VideoCallService] getLocalStream called:', {
      hasLocalStream: !!this.localStream,
      streamId: this.localStream?.id,
      videoTracks: this.localStream?.getVideoTracks().length || 0,
      audioTracks: this.localStream?.getAudioTracks().length || 0
    });
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.clearReofferLoop();
    console.log('🧹 Cleaning up video call resources...');

    this.stopCallTimer();
    this.clearCallTimeout();

    if (this.signalingChannel) {
      try { this.signalingChannel.close(); } catch { }
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch { }
    }
    if (this.localStream) {
      try { this.localStream.getTracks().forEach(track => track.stop()); } catch { }
    }

    this.resetAudioRouting();

    // Reset all state variables properly
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.signalingChannel = null;
    this.callTimer = null;
    this.callStartTime = 0;
    this.events = null;
    this.appointmentId = null;
    this.userId = null;
    this.processedMessages.clear();
    this.isProcessingIncomingCall = false;
    this.isCallAnswered = false;
    this.hasEnded = false;
    this.isIncomingMode = false;
    this.hasAccepted = false;
    this.pendingCandidates = [];
    this.pendingOffer = null;

    // Reset call state
    this.state = {
      isConnected: false,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isFrontCamera: true,
      callDuration: 0,
      connectionState: 'disconnected',
    };

    // Clear global pending offer
    (global as any).pendingOffer = null;

    console.log('✅ Video call cleanup complete');
    (global as any).activeVideoCall = false;
    if ((global as any).currentCallType === 'video') {
      (global as any).currentCallType = null;
    }
  }

  /**
   * Start periodic re-offer loop while waiting for callee to connect
   */
  private startReofferLoop(): void {
    try {
      this.clearReofferLoop();
      this.reofferTimer = setInterval(() => {
        if (
          this.peerConnection?.localDescription &&
          this.state.connectionState !== 'connected'
        ) {
          this.sendSignalingMessage({
            type: 'offer',
            offer: this.peerConnection.localDescription,
            senderId: this.userId,
          });
        }
      }, 4000);
    } catch (e) {
      console.warn('⚠️ [VideoCallService] Failed to start re-offer loop:', e);
    }
  }

  private clearReofferLoop(): void {
    if (this.reofferTimer) {
      clearInterval(this.reofferTimer);
      this.reofferTimer = null;
    }
  }

  /**
   * Reset the service state (for new calls)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting VideoCallService state...');

    this.cleanup();

    console.log('✅ VideoCallService state reset complete');
  }

  /**
   * Deduct call session when call is answered
   */
  private async deductCallSession(): Promise<void> {
    try {
      console.log('💰 [VideoCallService] Deducting call session...');
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          call_type: 'video',
          appointment_id: this.appointmentId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [VideoCallService] Call session deducted successfully:', data);
      } else {
        console.error('❌ [VideoCallService] Failed to deduct call session:', response.status);
      }
    } catch (error) {
      console.error('❌ [VideoCallService] Error deducting call session:', error);
    }
  }

  /**
   * Update call session in backend when call ends
   */
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
      console.warn('⚠️ [VideoCallService] Cannot mark answered: no appointmentId');
      return;
    }
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [VideoCallService] Cannot mark answered: no auth token');
        return;
      }
      const apiUrl = `${environment.LARAVEL_API_URL}/api/call-sessions/answer`;
      console.log('🔗 [VideoCallService] Marking call as answered in backend:', {
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
        console.log('✅ [VideoCallService] Call marked as answered in backend:', data);
      } else {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = { raw: errorText }; }
        console.error('❌ [VideoCallService] Failed to mark call as answered:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          appointmentId: this.appointmentId
        });
      }
    } catch (apiError) {
      console.error('❌ [VideoCallService] Error calling answer API:', apiError);
      throw apiError;
    }
  }

  private async markConnectedInBackend(): Promise<void> {
    if (!this.appointmentId) {
      console.warn('⚠️ [VideoCallService] Cannot mark connected: no appointmentId');
      return;
    }

    try {
      const authToken = await this.getAuthToken();
      const apiUrl = `${environment.LARAVEL_API_URL}/api/call-sessions/mark-connected`;

      console.log('🔗 [VideoCallService] Sending WebRTC confirmation (optional - server auto-promotes):', {
        appointmentId: this.appointmentId,
        callType: 'video'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          appointment_id: this.appointmentId,
          call_type: 'video'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [VideoCallService] WebRTC confirmation sent (server will handle promotion):', data);
      } else {
        // Silently handle - server will auto-promote anyway
        console.log('ℹ️ [VideoCallService] WebRTC confirmation failed (non-critical - server auto-promotes)');
      }
    } catch (error) {
      // Silently handle - server will auto-promote anyway
      console.log('ℹ️ [VideoCallService] WebRTC confirmation error (non-critical - server auto-promotes)');
    }
  }

  private async updateCallSessionInBackend(sessionDuration: number, wasConnected: boolean): Promise<void> {
    if (!this.appointmentId) {
      console.warn('⚠️ [VideoCallService] Cannot update call session: no appointmentId');
      return;
    }

    try {
      console.log('📞 Updating call session in backend...', {
        appointmentId: this.appointmentId,
        sessionDuration,
        wasConnected,
        connectionState: this.state.connectionState
      });

      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ [VideoCallService] Cannot update call session: no auth token');
        return;
      }

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          call_type: 'video',
          appointment_id: this.appointmentId,
          session_duration: sessionDuration,
          was_connected: wasConnected
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Call session updated in backend:', data);
      } else if (response.status === 404) {
        // Treat missing session as already ended; avoid loops
        console.log('ℹ️ Backend reported 404 for end update; treating as already ended');
      } else {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = { raw: errorText }; }
        console.error('❌ Failed to update call session in backend:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          appointmentId: this.appointmentId
        });
      }
    } catch (error) {
      console.error('❌ Error updating call session in backend:', error);
    }
  }
}

export { VideoCallService };

