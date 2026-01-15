import { apiService } from '../app/services/apiService';
import configService from './configService';
import { SessionContext, contextToString } from '../types/sessionContext';

// Global type for hot-reload persistence
declare global {
  var __webrtcSessionService: WebRTCSessionService | undefined;
}

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
  private static activeInstance: WebRTCSessionService | null = null;
  private instanceId: number;
  private static instanceCounter = 0;
  private signalingChannel: WebSocket | null = null;
  private events: WebRTCSessionEvents | null = null;
  private appointmentId: string | null = null; // Legacy: kept for backward compatibility
  private context: SessionContext | null = null; // New: session context (preferred)
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5 to prevent excessive reconnection attempts
  private reconnectDelay = 2000; // Increased base delay from 1000ms to 2000ms
  private connectionTimeout = 30000; // 30 seconds connection timeout
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private onTypingIndicator?: (isTyping: boolean, senderId?: number) => void;

  constructor() {
    this.instanceId = ++WebRTCSessionService.instanceCounter;
    console.log(`🏗️ [WebRTCSessionService] Instance ${this.instanceId} created`);
  }

  static getInstance(): WebRTCSessionService {
    if (global.__webrtcSessionService) {
      return global.__webrtcSessionService;
    }
    if (!WebRTCSessionService.activeInstance) {
      WebRTCSessionService.activeInstance = new WebRTCSessionService();
      global.__webrtcSessionService = WebRTCSessionService.activeInstance;
    }
    return WebRTCSessionService.activeInstance;
  }

  /**
   * Initialize with appointmentId (legacy) or SessionContext (preferred)
   */
  async initialize(appointmentIdOrContext: string | SessionContext, events: WebRTCSessionEvents): Promise<void> {
    // Determine if we received a context or appointmentId
    let context: SessionContext | null = null;
    let appointmentId: string | null = null;
    
    if (typeof appointmentIdOrContext === 'string') {
      // Legacy: appointmentId string
      appointmentId = appointmentIdOrContext;
      console.log(`🔌 [WebRTCSession] Initializing with appointmentId (legacy): ${appointmentId}`);
    } else {
      // New: SessionContext
      context = appointmentIdOrContext;
      appointmentId = contextToString(context); // Use context string for backward compatibility checks
      console.log(`🔌 [WebRTCSession] Initializing with session context: ${contextToString(context)}`);
    }
    
    if (this.isConnected && this.appointmentId === appointmentId && this.signalingChannel?.readyState === WebSocket.OPEN) {
      console.log(`🔄 [WebRTCSession] Reusing existing connection for ${appointmentId}`);
      this.events = events;
      return;
    }

    this.appointmentId = appointmentId;
    this.context = context;
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
        const signalingUrl = config.signalingUrl;

        // Architecture: Use context envelope if available, fallback to appointmentId for backward compatibility
        let contextParam: string;
        if (this.context) {
          // Use context envelope: context_type:context_id
          contextParam = `context=${encodeURIComponent(contextToString(this.context))}`;
          console.log('🔌 [WebRTCSession] Using session context:', contextToString(this.context));
        } else if (this.appointmentId) {
          // Legacy: use appointmentId (read-only appointment context)
          contextParam = `appointmentId=${encodeURIComponent(this.appointmentId)}`;
          console.log('⚠️ [WebRTCSession] Using legacy appointmentId (read-only):', this.appointmentId);
        } else {
          throw new Error('No context or appointmentId provided');
        }
        
        const wsUrl = `${signalingUrl}?${contextParam}&userId=${encodeURIComponent(String(userId))}&userType=doctor`;

        console.log('🔧 [WebRTC] Configuration check:', {
          signalingUrl,
          wsUrl,
          appointmentId: this.appointmentId,
          userId,
          config: config
        });

        console.log('🔌 [WebRTC] Attempting to connect to:', wsUrl);
        this.signalingChannel = new WebSocket(wsUrl);

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ [WebRTC] Connection timeout after', this.connectionTimeout, 'ms');
            this.signalingChannel?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.connectionTimeout);

        this.signalingChannel.onopen = () => {
          console.log('✅ [WebRTC] Connected to session signaling server successfully');
          clearTimeout(connectionTimeout);
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

          // Clear connection timeout on error
          clearTimeout(connectionTimeout);

          // Handle SSL/TLS connection errors with retry logic
          const errorMessage = (error as any).message;
          if (errorMessage && (
            errorMessage.includes('Connection reset by peer') ||
            errorMessage.includes('ssl') ||
            errorMessage.includes('TLS') ||
            errorMessage.includes('SSL') ||
            errorMessage.includes('Connection closed by peer')
          )) {
            console.warn('🔄 [WebRTC Session] SSL/TLS connection error detected, will retry...');
            this.events?.onError('Connection error, retrying...');

            // Don't reject immediately for SSL errors, let reconnection handle it
            setTimeout(() => {
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect();
              } else {
                reject(new Error('SSL connection failed after multiple attempts'));
              }
            }, 3000);
            return;
          }

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

          // If we were in the middle of ending a session, check if it actually ended
          if ((window as any).endSessionTimeoutId) {
            console.log('🔍 [WebRTC Session] Connection closed during session end - checking if session actually ended');
            this.checkSessionEndStatus();
          }

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

      const response = await apiService.get(`/text-sessions/${sessionId}/status`);

      if (response.data?.success && response.data?.data?.status === 'ended') {
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

    // Don't reconnect if already connected
    if (this.isConnected && this.signalingChannel && this.signalingChannel.readyState === WebSocket.OPEN) {
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
    return this.isConnected && this.signalingChannel?.readyState === WebSocket.OPEN;
  }

  // Helper method to determine session type from appointment ID
  getSessionType(): 'instant' | 'appointment' {
    if (!this.appointmentId) return 'appointment';
    return this.appointmentId.startsWith('text_session_') ? 'instant' : 'appointment';
  }
}

export { WebRTCSessionService };
export default WebRTCSessionService.getInstance();
