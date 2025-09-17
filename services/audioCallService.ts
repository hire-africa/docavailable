import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import Constants from 'expo-constants';
import {
    mediaDevices,
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
} from 'react-native-webrtc';

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
  private isCallAnswered: boolean = false;
  private appointmentId: string | null = null;
  private userId: string | null = null;
  private processedMessages: Set<string> = new Set();
  private isProcessingIncomingCall: boolean = false;

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

      // Get user media (audio only)
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      // Configure audio routing for phone calls
      await this.configureAudioRouting();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
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

      // Handle connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        const connectionState = this.peerConnection?.connectionState;
        console.log('🔗 Connection state changed:', connectionState);
        console.log('🔗 Current call state:', {
          isCallAnswered: this.isCallAnswered,
          connectionState: this.state.connectionState
        });
        
        if (connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
          this.updateState({ 
            isConnected: true, 
            connectionState: 'connected' 
          });
          this.startCallTimer();
        } else if (connectionState === 'connecting') {
          console.log('🔄 WebRTC connection in progress...');
          this.updateState({ 
            isConnected: false, 
            connectionState: 'connecting' 
          });
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
          console.log('❌ WebRTC connection lost:', connectionState);
          this.updateState({ 
            isConnected: false, 
            connectionState: 'disconnected' 
          });
          this.endCall();
        }
      });

      // Connect to signaling server
      await this.connectSignaling(appointmentId, userId);
      console.log('📞 Signaling connected for incoming call - waiting for user to accept');

      // Don't process the offer automatically - wait for user to accept
      // The offer will be processed when the accept button is pressed
      const pendingOffer = (global as any).pendingOffer;
      if (pendingOffer) {
        console.log('📞 Pending offer found - waiting for user acceptance');
      } else {
        console.warn('⚠️ No pending offer found for incoming call');
      }

    } catch (error) {
      console.error('❌ Failed to initialize incoming call:', error);
      this.events?.onError(`Failed to initialize incoming call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
    } finally {
      this.isProcessingIncomingCall = false; // Reset flag in all cases
    }
  }

  /**
   * Initialize audio call service
   */
  async initialize(appointmentId: string, userId: string, events: AudioCallEvents): Promise<void> {
    try {
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isCallAnswered = false;
      this.updateState({ connectionState: 'connecting' });

      // Get user media (audio only)
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      // Configure audio routing for phone calls
      await this.configureAudioRouting();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
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

      // Handle connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        const connectionState = this.peerConnection?.connectionState;
        console.log('🔗 Connection state changed:', connectionState);
        console.log('🔗 Current call state:', {
          isCallAnswered: this.isCallAnswered,
          connectionState: this.state.connectionState
        });
        
        if (connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
          this.updateState({ 
            isConnected: true, 
            connectionState: 'connected' 
          });
          this.startCallTimer();
        } else if (connectionState === 'connecting') {
          console.log('🔄 WebRTC connection in progress...');
          this.updateState({ 
            isConnected: false, 
            connectionState: 'connecting' 
          });
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
          console.log('❌ WebRTC connection lost:', connectionState);
          this.updateState({ 
            isConnected: false, 
            connectionState: 'disconnected' 
          });
          this.endCall();
        }
      });

      // Connect to signaling server
      await this.connectSignaling(appointmentId, userId);

      // Create and send offer for outgoing calls
      await this.createOffer();
      console.log('📞 Offer sent successfully, starting call timeout...');

      // Start call timeout (30 seconds for doctor to answer)
      this.startCallTimeout();
      console.log('⏰ Call timeout started (30 seconds)');

    } catch (error) {
      console.error('❌ Failed to initialize audio call:', error);
      this.events?.onError(`Failed to initialize call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
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
        'ws://46.101.123.123:8080/audio-signaling'; // Use production URL as fallback
      const wsUrl = `${signalingUrl}/${appointmentId}`;
      
      console.log('🔧 [AudioCallService] WebSocket URL:', wsUrl);
      console.log('🔧 [AudioCallService] Signaling URL:', signalingUrl);
      console.log('🔧 [AudioCallService] Appointment ID:', appointmentId);
      console.log('🔧 [AudioCallService] User ID:', userId);
      
      try {
        this.signalingChannel = new WebSocket(wsUrl);
        
        this.signalingChannel.onopen = () => {
          console.log('🔌 Connected to signaling server');
          resolve();
        };

        this.signalingChannel.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Signaling message received:', message.type);
            
            switch (message.type) {
              case 'offer':
                    await this.handleOffer(message.offer);
                    break;
              case 'answer':
                    await this.handleAnswer(message.answer);
                    break;
              case 'ice-candidate':
                    await this.handleIceCandidate(message.candidate);
                    break;
              case 'call-ended':
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
      iceServers: this.iceServers,
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
      console.log('🔗 Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('🔗 WebRTC connected - updating call state');
        this.updateState({ 
          isConnected: true, 
          connectionState: 'connected' 
        });
        this.startCallTimer();
      } else if (state === 'disconnected' || state === 'failed') {
        console.log('🔗 WebRTC disconnected/failed - updating call state');
        this.updateState({ 
          isConnected: false, 
          connectionState: 'disconnected' 
        });
        this.stopCallTimer();
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
        console.log('✅ Offer handled and answer sent successfully');
        
        // Mark call as answered
        this.isCallAnswered = true;
        console.log('📞 Call marked as answered');
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
        
        // Mark call as answered
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected' });
        this.events?.onCallAnswered();
      } else if (this.peerConnection.signalingState === 'stable') {
        console.log('📞 Already in stable state - connection established, marking as answered');
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected' });
        this.events?.onCallAnswered();
      } else {
        console.log('⚠️ Cannot set remote description - wrong signaling state:', this.peerConnection.signalingState);
        // Try to set remote description anyway for other states
        try {
          console.log('📞 Attempting to set remote description despite state...');
          await this.peerConnection.setRemoteDescription(answer);
          console.log('✅ Answer set successfully despite state');
          this.isCallAnswered = true;
          this.clearCallTimeout();
          this.updateState({ connectionState: 'connected' });
          this.events?.onCallAnswered();
        } catch (stateError) {
          console.log('⚠️ Failed to set remote description due to state, but marking as answered');
          this.isCallAnswered = true;
          this.clearCallTimeout();
          this.updateState({ connectionState: 'connected' });
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
        this.updateState({ connectionState: 'connected' });
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
    } else {
      console.warn('⚠️ Signaling channel not open, cannot send message');
    }
  }

  /**
   * Send signaling message (public method)
   */
  sendMessage(message: any): void {
    this.sendSignalingMessage(message);
  }

  /**
   * Process incoming call when user accepts (for receiver)
   */
  async processIncomingCall(): Promise<void> {
    try {
      console.log('📞 [AudioCallService] Processing incoming call after user acceptance...');
      
      const pendingOffer = (global as any).pendingOffer;
      if (!pendingOffer) {
        throw new Error('No pending offer found');
      }
      
      console.log('📞 [AudioCallService] Processing pending offer...');
      await this.handleOffer(pendingOffer);
      
      // Clear the pending offer
      (global as any).pendingOffer = null;
      console.log('✅ [AudioCallService] Incoming call processed successfully');
      
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
    if (!this.peerConnection) return;
    
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        appointmentId: this.appointmentId,
        userId: this.userId,
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      this.events?.onError('Failed to initiate call');
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
    console.log(`✅ [AudioCallService ${this.instanceId}] Call answered by doctor`);
    console.log(`📞 [AudioCallService ${this.instanceId}] Current call state when answered:`, {
      isCallAnswered: this.isCallAnswered,
      connectionState: this.state.connectionState,
      signalingState: this.peerConnection?.signalingState
    });
    this.isCallAnswered = true;
    this.clearCallTimeout();
    this.updateState({ connectionState: 'connected' });
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
   * Start call duration timer
   */
  private startCallTimer(): void {
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      this.updateState({ callDuration: duration });
    }, 1000);
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
      console.log('📞 Ending audio call...');
      console.log('📞 Call state when ending:', {
        connectionState: this.state.connectionState,
        isConnected: this.state.isConnected,
        isCallAnswered: this.isCallAnswered
      });
      
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
      
      // Send call ended message
      this.sendSignalingMessage({
        type: 'call-ended'
      });
      
      // Close signaling connection
      if (this.signalingChannel) {
        this.signalingChannel.close();
        this.signalingChannel = null;
      }
      
      // Reset state
      this.updateState({
        isConnected: false,
        isAudioEnabled: true,
        callDuration: 0,
        connectionState: 'disconnected',
      });
      
      this.events?.onCallEnded();
      
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
    this.signalingChannel = null;
    this.callTimer = null;
    this.callStartTime = 0;
    this.events = null;
    this.appointmentId = null;
    this.userId = null;
    this.processedMessages.clear();
    this.isProcessingIncomingCall = false;
    this.isCallAnswered = false;
    
    // Reset call state
    this.state = {
      isConnected: false,
      isAudioEnabled: true,
      callDuration: 0,
      connectionState: 'disconnected',
    };
    
    console.log('✅ AudioCallService state reset complete');
  }
}

export { AudioCallService };
export default new AudioCallService();
