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
}

class VideoCallService {
  private static instanceCounter = 0;
  private static activeInstance: VideoCallService | null = null;
  private instanceId: number;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: WebSocket | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private events: VideoCallEvents | null = null;
  private callTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private isCallAnswered: boolean = false;
  private appointmentId: string | null = null;
  private userId: string | null = null;
  private processedMessages: Set<string> = new Set();
  private isProcessingIncomingCall: boolean = false;
  private isFrontCamera: boolean = true;
  private isSpeakerOn: boolean = true; // Default to speaker for video calls

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

      // Get user media (audio + video)
      this.localStream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
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
        
        if (state === 'connected') {
          this.updateState({ 
            isConnected: true, 
            connectionState: 'connected' 
          });
          this.startCallTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          this.updateState({ 
            isConnected: false, 
            connectionState: 'disconnected' 
          });
        }
      });

      // Connect to signaling server
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

      const data = await response.json();
      
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
  async initialize(appointmentId: string, userId: string, events: VideoCallEvents): Promise<void> {
    try {
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
        
        if (state === 'connected') {
          this.updateState({ 
            isConnected: true, 
            connectionState: 'connected' 
          });
          this.startCallTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          this.updateState({ 
            isConnected: false, 
            connectionState: 'disconnected' 
          });
        }
      });

      // Connect to signaling server
      await this.connectSignaling(appointmentId, userId);
      
      // Create and send offer for outgoing calls
      await this.createOffer();
      console.log('📞 Video call offer sent successfully, starting call timeout...');
      
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
    return new Promise((resolve, reject) => {
      // Connect to our WebRTC signaling server
      const signalingUrl = 
        process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL ||
        (Constants as any).expoConfig?.extra?.webrtc?.signalingUrl ||
        'ws://46.101.123.123:8082/audio-signaling';
      
      const wsUrl = `${signalingUrl}/${appointmentId}`;
      console.log('🔌 [VideoCallService] Connecting to signaling server:', wsUrl);
      console.log('🔧 [VideoCallService] User ID:', userId);
      
      try {
        this.signalingChannel = new WebSocket(wsUrl);
        
        this.signalingChannel.onopen = () => {
          console.log('🔌 Connected to video signaling server');
          resolve();
        };

        this.signalingChannel.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Video signaling message received:', message.type);
            
            switch (message.type) {
              case 'offer':
                console.log('📞 [VideoCallService] Received offer');
                await this.handleOffer(message.offer);
                break;
              case 'answer':
                console.log('📞 [VideoCallService] Received answer');
                await this.handleAnswer(message.answer);
                break;
              case 'ice-candidate':
                console.log('📞 [VideoCallService] Received ICE candidate');
                await this.handleIceCandidate(message.candidate);
                break;
              case 'call-ended':
                console.log('📞 [VideoCallService] Received call-ended');
                this.endCall();
                break;
              case 'call-answered':
                console.log('📞 [VideoCallService] Received call-answered');
                this.handleCallAnswered();
                break;
              case 'call-rejected':
                console.log('📞 [VideoCallService] Received call-rejected');
                this.handleCallRejected(message.reason);
                break;
              case 'call-timeout':
                console.log('📞 [VideoCallService] Received call-timeout');
                this.handleCallTimeout();
                break;
            }
          } catch (error) {
            console.error('❌ Error handling video signaling message:', error);
          }
        };

        this.signalingChannel.onerror = (error) => {
          console.error('❌ Video signaling WebSocket error:', error);
          reject(error);
        };

        this.signalingChannel.onclose = () => {
          console.log('🔌 Video signaling connection closed');
          this.updateState({ connectionState: 'disconnected' });
        };

      } catch (error) {
        console.error('❌ Failed to create video signaling connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Process offer when user accepts incoming call
   */
  async processIncomingOffer(): Promise<void> {
    const pendingOffer = (global as any).pendingOffer;
    if (pendingOffer && this.peerConnection) {
      console.log('📞 Processing incoming video offer...');
      await this.handleOffer(pendingOffer);
      (global as any).pendingOffer = null;
    }
  }

  /**
   * Process incoming call when user accepts (for receiver)
   */
  async processIncomingCall(): Promise<void> {
    try {
      console.log('📞 [VideoCallService] Processing incoming call after user acceptance...');
      
      const pendingOffer = (global as any).pendingOffer;
      if (!pendingOffer) {
        throw new Error('No pending offer found');
      }
      
      console.log('📞 [VideoCallService] Processing pending offer...');
      await this.handleOffer(pendingOffer);
      
      // Clear the pending offer
      (global as any).pendingOffer = null;
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
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        senderId: this.userId,
        callType: 'video',
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
      await this.peerConnection.setRemoteDescription(answer);
      console.log('✅ Video call answer processed successfully');
      
      // Update connection state
      this.updateState({ connectionState: 'connected' });
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
      
      console.log('📹 Video toggled:', videoTracks[0]?.enabled ? 'ON' : 'OFF');
    }
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        const newFacingMode = settings.facingMode === 'user' ? 'environment' : 'user';
        
        try {
          // Stop current video track
          track.stop();
          
          // Get new stream with switched camera
          const newStream = await mediaDevices.getUserMedia({
            video: { facingMode: newFacingMode },
            audio: true,
          });
          
          // Replace video track in peer connection
          const newVideoTrack = newStream.getVideoTracks()[0];
          const sender = this.peerConnection?.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender && this.peerConnection) {
            await sender.replaceTrack(newVideoTrack);
          }
          
          // Update local stream
          this.localStream = newStream;
          this.isFrontCamera = newFacingMode === 'user';
          this.updateState({ isFrontCamera: this.isFrontCamera });
          
          console.log('📹 Camera switched to:', newFacingMode);
        } catch (error) {
          console.error('❌ Error switching camera:', error);
        }
      }
    }
  }

  /**
   * End the call
   */
  endCall(): void {
    console.log('📞 Ending video call...');
    
    // Calculate session duration
    const sessionDuration = this.state.callDuration;
    const wasConnected = this.state.isConnected && this.isCallAnswered;
    
    this.sendSignalingMessage({
      type: 'call-ended',
      callType: 'video',
      userId: this.userId,
      appointmentId: this.appointmentId,
      sessionDuration: sessionDuration,
      wasConnected: wasConnected
    });
    
    this.cleanup();
    this.events?.onCallEnded();
  }

  /**
   * Handle call answered
   */
  private handleCallAnswered(): void {
    console.log('📞 Video call answered');
    this.isCallAnswered = true;
    this.clearCallTimeout();
    
    // Send call-answered message with call type
    this.sendSignalingMessage({
      type: 'call-answered',
      callType: 'video',
      userId: this.userId,
      appointmentId: this.appointmentId
    });
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
    if (this.signalingChannel && this.signalingChannel.readyState === WebSocket.OPEN) {
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
    console.log('🧹 Cleaning up video call resources...');
    
    this.stopCallTimer();
    this.clearCallTimeout();
    
    if (this.signalingChannel) {
      this.signalingChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.resetAudioRouting();
    
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.signalingChannel = null;
    this.callTimer = null;
    this.callStartTime = 0;
    this.appointmentId = null;
    this.userId = null;
    this.processedMessages.clear();
    this.isProcessingIncomingCall = false;
    this.isCallAnswered = false;
    
    this.updateState({
      isConnected: false,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isFrontCamera: true,
      callDuration: 0,
      connectionState: 'disconnected',
    });
    
    console.log('✅ Video call cleanup complete');
  }

  /**
   * Reset the service state (for new calls)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting VideoCallService state...');
    
    this.cleanup();
    
    console.log('✅ VideoCallService state reset complete');
  }
}

export { VideoCallService };

