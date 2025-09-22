import { apiService } from '../app/services/apiService';
import configService from './configService';

export interface SessionStatus {
  sessionId: string;
  sessionType: 'instant' | 'appointment';
  status: string;
  activatedAt?: string;
  startedAt?: string;
  elapsedMinutes?: number;
  remainingTimeMinutes?: number;
  sessionsUsed?: number;
  remainingSessions?: number;
  shouldAutoEnd?: boolean;
  timeRemaining?: number;
  appointmentType?: 'text' | 'audio' | 'video';
  maxDurationMinutes?: number;
}

export interface WebRTCSessionEvents {
  onSessionActivated: (sessionId: string, sessionType: 'instant' | 'appointment') => void;
  onSessionExpired: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => void;
  onSessionEnded: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => void;
  onSessionEndSuccess?: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => void;
  onSessionEndError?: (error: string) => void;
  onSessionDeduction: (sessionId: string, deductionData: any, sessionType: 'instant' | 'appointment') => void;
  onDoctorResponseTimerStarted: (sessionId: string, timeRemaining: number) => void;
  onAppointmentStarted: (sessionId: string) => void;
  onSessionStatusUpdate: (status: SessionStatus) => void;
  onError: (error: string) => void;
}

class WebRTCSessionService {
  private signalingChannel: WebSocket | null = null;
  private events: WebRTCSessionEvents | null = null;
  private appointmentId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onTypingIndicator?: (isTyping: boolean, senderId?: number) => void;

  async initialize(appointmentId: string, events: WebRTCSessionEvents): Promise<void> {
    this.appointmentId = appointmentId;
    this.events = events;
    
    await this.connectSignaling();
  }

  private async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use config service to get WebRTC signaling URL
      const config = configService.getWebRTCConfig();
      const signalingUrl = config.signalingUrl;
      const wsUrl = `${signalingUrl}/${this.appointmentId}`;
      
      console.log('🔧 [WebRTC] Configuration check:', {
        signalingUrl,
        wsUrl,
        appointmentId: this.appointmentId,
        config: config
      });
      
      try {
        this.signalingChannel = new WebSocket(wsUrl);
        
        this.signalingChannel.onopen = () => {
          console.log('🔌 Connected to session signaling server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.signalingChannel.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 [WebRTCSession] Message received:', message.type);
            
            // Handle typing indicators
            if (message.type === 'typing-indicator') {
              console.log('⌨️ [WebRTCSession] Typing indicator received:', message.isTyping, 'from sender:', message.senderId);
              this.onTypingIndicator?.(message.isTyping, message.senderId);
            } else {
              await this.handleSignalingMessage(message);
            }
          } catch (error) {
            console.error('❌ Error handling signaling message:', error);
          }
        };

        this.signalingChannel.onerror = (error) => {
          console.error('❌ Session signaling WebSocket error:', error);
          // Don't reject on error if we're already connected - just log it
          if (!this.isConnected) {
            this.events?.onError('Connection error');
            reject(error);
          } else {
            console.log('⚠️ [WebRTC Session] Connection error but already connected, continuing...');
          }
        };

        this.signalingChannel.onclose = () => {
          console.log('🔌 Session signaling connection closed');
          this.isConnected = false;
          this.attemptReconnect();
        };

      } catch (error) {
        console.error('❌ Failed to create session signaling connection:', error);
        reject(error);
      }
    });
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'session-activated':
        console.log('✅ Session activated:', message.sessionId, message.sessionType);
        this.events?.onSessionActivated(message.sessionId, message.sessionType);
        break;
        
      case 'session-expired':
        console.log('⏰ Session expired:', message.sessionId, message.reason, message.sessionType);
        this.events?.onSessionExpired(message.sessionId, message.reason, message.sessionType);
        break;
        
      case 'session-ended':
        console.log('🏁 Session ended:', message.sessionId, message.reason, message.sessionType);
        this.events?.onSessionEnded(message.sessionId, message.reason, message.sessionType);
        break;
        
      case 'session-end-success':
        console.log('✅ Session end success:', message.sessionId, message.reason, message.sessionType);
        this.events?.onSessionEndSuccess?.(message.sessionId, message.reason, message.sessionType);
        break;
        
      case 'session-end-error':
        console.log('❌ Session end error:', message.message);
        this.events?.onSessionEndError?.(message.message);
        break;
        
      case 'session-deduction':
        console.log('💰 Session deduction:', message.sessionId, message.sessionsDeducted, message.sessionType);
        this.events?.onSessionDeduction(message.sessionId, message, message.sessionType);
        break;
        
      case 'doctor-response-timer-started':
        console.log('⏱️ Doctor response timer started:', message.sessionId, message.timeRemaining);
        this.events?.onDoctorResponseTimerStarted(message.sessionId, message.timeRemaining);
        break;
        
      case 'appointment-started':
        console.log('🚀 Appointment started:', message.sessionId);
        this.events?.onAppointmentStarted(message.sessionId);
        break;
        
      case 'session-status':
        console.log('📊 Session status received:', message.sessionData);
        this.events?.onSessionStatusUpdate(message.sessionData);
        break;
        
      case 'connection-established':
        console.log('✅ Session connection established');
        break;
        
      case 'participant-left':
        console.log('👋 Participant left the session');
        break;
        
      case 'call-not-answered':
        console.log('📞 Call not answered:', message.reason);
        this.events?.onError('Doctor is unavailable to take your call');
        break;
    }
  }

  // Send message with session management
  async sendMessage(message: any): Promise<void> {
    if (!this.isConnected || !this.signalingChannel) {
      throw new Error('Not connected to session service');
    }

    // Get auth token
    const authToken = await apiService.getAuthToken();
    
    this.sendSignalingMessage({
      type: 'chat-message',
      message: message,
      authToken: authToken
    });
  }

  // Request session status
  requestSessionStatus(): void {
    if (!this.isConnected || !this.signalingChannel) return;

    this.sendSignalingMessage({
      type: 'session-status-request'
    });
  }

  // End session manually
  async endSession(reason: string = 'manual_end'): Promise<void> {
    if (!this.isConnected || !this.signalingChannel) {
      console.log('❌ [WebRTC Session] Cannot end session - not connected');
      throw new Error('WebRTC session service not connected');
    }

    // Check if the connection is still open
    if (this.signalingChannel.readyState !== WebSocket.OPEN) {
      console.log('❌ [WebRTC Session] Cannot end session - connection not open, state:', this.signalingChannel.readyState);
      throw new Error('WebRTC connection not open');
    }

    const authToken = await apiService.getAuthToken();
    console.log('🔚 [WebRTC Session] Sending session end request:', {
      reason,
      hasAuthToken: !!authToken,
      appointmentId: this.appointmentId,
      connectionState: this.signalingChannel.readyState
    });
    
    try {
      this.sendSignalingMessage({
        type: 'session-end-request',
        reason: reason,
        authToken: authToken
      });
    } catch (error) {
      console.error('❌ [WebRTC Session] Failed to send session end request:', error);
      throw error;
    }
  }

  // Start appointment session
  async startAppointmentSession(): Promise<void> {
    if (!this.isConnected || !this.signalingChannel) return;

    const authToken = await apiService.getAuthToken();
    
    this.sendSignalingMessage({
      type: 'appointment-start-request',
      authToken: authToken
    });
  }

  // Send typing indicator
  sendTypingIndicator(isTyping: boolean, senderId?: number): void {
    if (!this.isConnected || !this.signalingChannel) return;

    this.sendSignalingMessage({
      type: 'typing-indicator',
      isTyping: isTyping,
      senderId: senderId
    });
  }

  // Set typing indicator callback
  setOnTypingIndicator(callback: (isTyping: boolean, senderId?: number) => void): void {
    this.onTypingIndicator = callback;
  }

  // Send message read receipt
  sendMessageRead(messageId: string): void {
    if (!this.isConnected || !this.signalingChannel) return;

    this.sendSignalingMessage({
      type: 'message-read',
      messageId: messageId
    });
  }

  private sendSignalingMessage(message: any): void {
    if (this.signalingChannel?.readyState === WebSocket.OPEN) {
      this.signalingChannel.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Session signaling channel not open, cannot send message');
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.events?.onError('Connection lost. Please refresh the session.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(async () => {
      try {
        await this.connectSignaling();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect(): void {
    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }
    this.isConnected = false;
  }

  isSessionConnected(): boolean {
    return this.isConnected && this.signalingChannel?.readyState === WebSocket.OPEN;
  }

  // Helper method to determine session type from appointment ID
  getSessionType(): 'instant' | 'appointment' {
    if (!this.appointmentId) return 'appointment';
    return this.appointmentId.startsWith('text_session_') ? 'instant' : 'appointment';
  }
}

export default new WebRTCSessionService();
