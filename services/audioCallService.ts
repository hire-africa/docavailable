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
}

class AudioCallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: WebSocket | null = null;
  private callTimer: NodeJS.Timeout | null = null;
  private callStartTime: number = 0;
  private events: AudioCallEvents | null = null;

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
   * Initialize audio call service
   */
  async initialize(appointmentId: string, userId: string, events: AudioCallEvents): Promise<void> {
    try {
      this.events = events;
      this.updateState({ connectionState: 'connecting' });

      // Get user media (audio only)
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Add local audio track to peer connection
      this.localStream.getAudioTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio stream received');
        this.remoteStream = event.streams[0];
        this.events?.onRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const connectionState = this.peerConnection?.connectionState;
        console.log('🔗 Connection state:', connectionState);
        
        if (connectionState === 'connected') {
          this.updateState({ 
            isConnected: true, 
            connectionState: 'connected' 
          });
          this.startCallTimer();
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
          this.updateState({ 
            isConnected: false, 
            connectionState: 'disconnected' 
          });
          this.endCall();
        }
      };

      // Connect to signaling server
      await this.connectSignaling(appointmentId, userId);

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
      const wsUrl = `ws://localhost:8080/audio-signaling/${appointmentId}`;
      
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
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
      });
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
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      this.events?.onError('Failed to establish call connection');
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
      this.signalingChannel.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Signaling channel not open, cannot send message');
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
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      this.events?.onError('Failed to initiate call');
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
    this.state = { ...this.state, ...updates };
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
      
      // Stop call timer
      this.stopCallTimer();
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
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
}

export default new AudioCallService();
