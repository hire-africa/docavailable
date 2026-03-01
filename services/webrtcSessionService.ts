import { apiService } from '../app/services/apiService';
import configService from './configService';
import { SecureWebSocketService } from './secureWebSocketService';

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
  private signalingChannel: SecureWebSocketService | null = null;
  private events: WebRTCSessionEvents | null = null;
  private appointmentId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private connectionTimeout = 20000; // 20 seconds
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private onTypingIndicator?: (isTyping: boolean, senderId?: number) => void;

  async initialize(appointmentId: string, events: WebRTCSessionEvents): Promise<void> {
    this.appointmentId = appointmentId;
    this.events = events;

    await this.connectSignaling();
  }

  private async connectSignaling(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get current user ID from auth service
        const { apiService } = await import('../app/services/apiService');
        const currentUser = await apiService.getCurrentUser();
        const userId = currentUser?.id;

        if (!userId) {
          console.error('❌ [WebRTC] No user ID available for signaling connection');
          reject(new Error('User not authenticated'));
          return;
        }

        // Use config service to get WebRTC signaling URL
        const config = configService.getWebRTCConfig();
        const isChatSession = this.appointmentId?.startsWith('text_session_');
        const signalingUrl = isChatSession ? config.chatSignalingUrl : config.signalingUrl;

        // Use query parameters with both appointmentId
        const wsUrl = `${signalingUrl}?appointmentId=${encodeURIComponent(this.appointmentId!)}&userId=${encodeURIComponent(String(userId))}&userType=doctor`;

        // Final validation before connection
        if (!this.appointmentId || !userId) {
          console.warn('⚠️ [WebRTCSessionService] Aborting connection: Missing appointmentId or userId');
          this.events?.onError('Invalid session credentials');
          reject(new Error('Missing credentials'));
          return;
        }

        console.log('🔧 [WebRTC] Configuration check:', {
          signalingUrl,
          wsUrl,
          appointmentId: this.appointmentId,
          userId,
          config: config
        });

        console.log('🔌 [WebRTC] Attempting to connect to:', wsUrl);

        this.signalingChannel = new SecureWebSocketService({
          url: wsUrl,
          connectionTimeout: this.connectionTimeout,
          onOpen: () => {
            console.log('✅ [WebRTC] Connected to session signaling server successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            resolve();
          },
          onMessage: async (message) => {
            try {
              if (message.type === 'typing-indicator') {
                console.log('⌨️ [WebRTCSession] Typing indicator received:', message.isTyping, 'from sender:', message.senderId);
                this.onTypingIndicator?.(message.isTyping, message.senderId);
              } else {
                await this.handleSignalingMessage(message);
              }
            } catch (error) {
              console.error('❌ Error handling signaling message:', error);
            }
          },
          onError: (error) => {
            console.error('❌ Session signaling error:', error);

            // Check for isTrusted: false or other handshake issues
            if (error.isTrusted === false) {
              console.error('⚠️ [WebRTC] Handshake failed (isTrusted: false). This is usually an SSL chain issue.');
            }

            if (!this.isConnected) {
              this.events?.onError('Connection error');
              reject(error);
            } else {
              console.log('⚠️ [WebRTC Session] Connection error but already connected, continuing...');
            }
          },
          onClose: () => {
            console.log('🔌 Session signaling connection closed');
            this.isConnected = false;

            // If we were in the middle of ending a session, check if it actually ended
            if ((window as any).endSessionTimeoutId) {
              console.log('🔍 [WebRTC Session] Connection closed during session end - checking if session actually ended');
              this.checkSessionEndStatus();
            }

            this.attemptReconnect();
          }
        });

        await this.signalingChannel.connect();

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

    if (this.signalingChannel?.readyState !== 1) { // 1 is OPEN for both raw WebSocket and our wrapper
      console.log('❌ [WebRTC Session] Cannot end session - connection not open, state:', this.signalingChannel?.readyState);
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

  // Check if session was ended after connection closed
  private async checkSessionEndStatus(): Promise<void> {
    try {
      if (!this.appointmentId || !this.appointmentId.startsWith('text_session_')) {
        return;
      }

      const sessionId = this.appointmentId.replace('text_session_', '');
      console.log('🔍 [WebRTC Session] Checking if session ended:', sessionId);

      // Import apiService dynamically to avoid circular imports
      const { apiService } = await import('../app/services/apiService');

      const response: any = await apiService.get(`/text-sessions/${sessionId}/status`);

      if (response?.success && response?.data?.status === 'ended') {
        console.log('✅ [WebRTC Session] Session was ended - triggering UI update');
        this.events?.onSessionEndSuccess?.(sessionId, 'manual_end', 'instant');
      } else {
        console.log('ℹ️ [WebRTC Session] Session is still active or status unknown');
      }
    } catch (error) {
      console.error('❌ [WebRTC Session] Failed to check session status:', error);
    }
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
    if (this.signalingChannel?.readyState === 1) { // 1 is OPEN
      this.signalingChannel.send(message);
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

    // Don't reconnect if already connected
    if (this.isConnected && this.signalingChannel && this.signalingChannel.readyState === 1) {
      console.log('✅ [WebRTC Session] Already connected, skipping reconnection');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter for better reconnection
    const baseDelay = this.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 2000; // Add up to 2 seconds of jitter
    const finalDelay = Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds

    console.log(`🔄 [WebRTC Session] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(finalDelay)}ms...`);

    // Clear any existing reconnection timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.connectSignaling();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, finalDelay);
  }

  disconnect(): void {
    // Clear any pending reconnection attempts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0; // Reset reconnection attempts on disconnect
  }

  isSessionConnected(): boolean {
    return this.isConnected && this.signalingChannel?.readyState === 1;
  }

  // Helper method to determine session type from appointment ID
  getSessionType(): 'instant' | 'appointment' {
    if (!this.appointmentId) return 'appointment';
    return this.appointmentId.startsWith('text_session_') ? 'instant' : 'appointment';
  }
}

export default new WebRTCSessionService();
