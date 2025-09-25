import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InstantSessionConfig {
  sessionId: string;
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
}

export interface MessageDetectionEvents {
  onPatientMessageDetected: (message: any) => void;
  onDoctorMessageDetected: (message: any) => void;
  onTimerStarted: (timeRemaining: number) => void;
  onTimerExpired: () => void;
  onSessionActivated: () => void;
  onError: (error: string) => void;
}

export interface TimerState {
  isActive: boolean;
  timeRemaining: number;
  startTime: number;
  endTime: number;
}

export class InstantSessionMessageDetector {
  private config: InstantSessionConfig;
  private events: MessageDetectionEvents;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private timerState: TimerState = {
    isActive: false,
    timeRemaining: 90,
    startTime: 0,
    endTime: 0
  };
  private hasPatientMessageSent: boolean = false;
  private hasDoctorResponded: boolean = false;
  private sessionActivated: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(config: InstantSessionConfig, events: MessageDetectionEvents) {
    this.config = config;
    this.events = events;
  }

  /**
   * Connect to WebRTC signaling server for message detection
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.getWebRTCSignalingUrl()}/chat-signaling/${this.config.appointmentId}?authToken=${encodeURIComponent(this.config.authToken || '')}`;
        console.log('🔌 [InstantSessionDetector] Connecting to WebRTC for message detection:', wsUrl);
        console.log('🔌 [InstantSessionDetector] Auth token:', this.config.authToken ? 'Present' : 'Missing');
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
          console.log('✅ [InstantSessionDetector] Connected to WebRTC signaling');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.loadSessionState();
          resolve();
        };
        
        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };
        
        this.websocket.onerror = (error) => {
          console.error('❌ [InstantSessionDetector] WebSocket error:', error);
          this.events.onError('WebRTC connection error');
          reject(error);
        };
        
        this.websocket.onclose = (event) => {
          console.log('🔌 [InstantSessionDetector] WebSocket closed:', event.code);
          this.isConnected = false;
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        };
        
      } catch (error) {
        console.error('❌ [InstantSessionDetector] Failed to create connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 [InstantSessionDetector] Message received:', data.type);
      console.log('📨 [InstantSessionDetector] Full message data:', data);
      
      switch (data.type) {
        case 'chat-message':
          this.handleChatMessage(data);
          break;
          
        case 'doctor-response-timer-started':
          this.handleTimerStarted(data);
          break;
          
        case 'session-activated':
          this.handleSessionActivated(data);
          break;
          
        case 'session-expired':
          this.handleSessionExpired(data);
          break;
          
        case 'connection-established':
          this.handleConnectionEstablished();
          break;
          
        case 'session-status-response':
          this.handleSessionStatusResponse(data);
          break;
          
        case 'session-status-request':
          // Ignore our own session status requests
          console.log('📨 [InstantSessionDetector] Ignoring own session status request');
          break;
          
        case 'session-end-request':
        case 'session-end-success':
        case 'session-end-error':
        case 'session-ended':
          // Ignore session end messages - these should be handled by WebRTC session service
          console.log('📨 [InstantSessionDetector] Ignoring session end message:', data.type);
          break;
          
        case 'test-message':
          console.log('🧪 [InstantSessionDetector] Test message received!');
          break;
          
        default:
          console.log('📨 [InstantSessionDetector] Unhandled message type:', data.type);
          console.log('📨 [InstantSessionDetector] Full message data:', data);
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error parsing message:', error);
    }
  }

  /**
   * Handle chat messages and detect patient/doctor messages
   */
  private handleChatMessage(data: any): void {
    const message = data.message;
    console.log('💬 [InstantSessionDetector] Processing chat message:', {
      id: message.id,
      senderId: message.sender_id,
      message: message.message?.substring(0, 50) + '...',
      doctorId: this.config.doctorId,
      patientId: this.config.patientId
    });

    const senderId = Number(message.sender_id);
    
    // Check if this is a patient message
    if (senderId === this.config.patientId) {
      this.handlePatientMessage(message);
    }
    // Check if this is a doctor message
    else if (senderId === this.config.doctorId) {
      this.handleDoctorMessage(message);
    } else {
      console.log('❓ [InstantSessionDetector] Unknown sender message:', {
        senderId: senderId,
        doctorId: this.config.doctorId,
        patientId: this.config.patientId
      });
    }
  }

  /**
   * Handle patient message - start 90-second timer if not already started
   */
  private handlePatientMessage(message: any): void {
    console.log('👤 [InstantSessionDetector] Patient message detected:', message.id);
    
    if (!this.hasPatientMessageSent) {
      this.hasPatientMessageSent = true;
      this.start90SecondTimer();
      this.events.onPatientMessageDetected(message);
    }
  }

  /**
   * Handle doctor message - activate session and stop timer
   */
  private handleDoctorMessage(message: any): void {
    console.log('👨‍⚕️ [InstantSessionDetector] Doctor message detected:', message.id);
    
    if (!this.hasDoctorResponded) {
      this.hasDoctorResponded = true;
      this.stopTimer();
      this.activateSession();
      this.events.onDoctorMessageDetected(message);
    }
  }

  /**
   * Start the 90-second timer
   */
  private start90SecondTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    console.log('⏰ [InstantSessionDetector] Starting 90-second timer');
    
    this.timerState = {
      isActive: true,
      timeRemaining: 90,
      startTime: Date.now(),
      endTime: Date.now() + 90000
    };

    // Start countdown updates every second
    this.startCountdown();
    
    // Set timeout for 90 seconds
    this.timer = setTimeout(() => {
      this.handleTimerExpired();
    }, 90000) as any;

    this.saveSessionState();
    this.events.onTimerStarted(90);
  }

  /**
   * Start countdown updates
   */
  private startCountdown(): void {
    const countdownInterval = setInterval(() => {
      if (!this.timerState.isActive) {
        clearInterval(countdownInterval);
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((this.timerState.endTime - now) / 1000));
      
      this.timerState.timeRemaining = remaining;
      
      // Update every 5 seconds to avoid too many updates
      if (remaining % 5 === 0 || remaining <= 10) {
        console.log('⏰ [InstantSessionDetector] Timer remaining:', remaining, 'seconds');
      }
      
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  private stopTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    this.timerState.isActive = false;
    console.log('⏹️ [InstantSessionDetector] Timer stopped');
    this.saveSessionState();
  }

  /**
   * Handle timer expiration
   */
  private handleTimerExpired(): void {
    console.log('⏰ [InstantSessionDetector] 90-second timer expired');
    this.timerState.isActive = false;
    this.timerState.timeRemaining = 0;
    
    this.saveSessionState();
    this.events.onTimerExpired();
  }

  /**
   * Handle timer started event from server
   */
  private handleTimerStarted(data: any): void {
    console.log('⏰ [InstantSessionDetector] Server timer started event received');
    if (!this.timerState.isActive) {
      this.start90SecondTimer();
    }
  }

  /**
   * Activate the session
   */
  private activateSession(): void {
    if (!this.sessionActivated) {
      this.sessionActivated = true;
      console.log('✅ [InstantSessionDetector] Session activated');
      this.saveSessionState();
      this.events.onSessionActivated();
      
      // Update session status in the backend
      this.updateSessionStatus('active');
    }
  }

  /**
   * Update session status in the backend
   */
  private async updateSessionStatus(status: string): Promise<void> {
    try {
      console.log('🔄 [InstantSessionDetector] Updating session status to:', status);
      const response = await fetch(`${this.getApiBaseUrl()}/api/text-sessions/${this.config.sessionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        console.log('✅ [InstantSessionDetector] Session status updated successfully');
      } else {
        console.error('❌ [InstantSessionDetector] Failed to update session status:', response.status);
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error updating session status:', error);
    }
  }

  /**
   * Get API base URL
   */
  private getApiBaseUrl(): string {
    return process.env.EXPO_PUBLIC_API_URL || 'https://docavailable-3vbdv.ondigitalocean.app';
  }

  /**
   * Handle session activated event from server
   */
  private handleSessionActivated(data: any): void {
    console.log('✅ [InstantSessionDetector] Server session activated event received');
    this.activateSession();
  }

  /**
   * Handle session expired event from server
   */
  private handleSessionExpired(data: any): void {
    console.log('❌ [InstantSessionDetector] Session expired:', data.reason);
    this.stopTimer();
    this.events.onTimerExpired();
  }

  /**
   * Handle connection established
   */
  private handleConnectionEstablished(): void {
    console.log('🔌 [InstantSessionDetector] Connection established');
    this.loadSessionState();
    // Check for existing patient messages when connecting
    this.checkForExistingPatientMessages();
  }

  /**
   * Handle session status response
   */
  private handleSessionStatusResponse(data: any): void {
    console.log('📊 [InstantSessionDetector] Session status response received:', data);
    console.log('📊 [InstantSessionDetector] Current state:', {
      hasPatientMessageSent: this.hasPatientMessageSent,
      hasDoctorResponded: this.hasDoctorResponded,
      sessionActivated: this.sessionActivated
    });
    
    if (data.hasPatientMessage && !this.hasPatientMessageSent) {
      console.log('👤 [InstantSessionDetector] Found existing patient message - starting timer');
      this.hasPatientMessageSent = true;
      this.start90SecondTimer();
      this.events.onPatientMessageDetected({ id: 'existing', message: 'Patient message detected' });
    } else if (data.hasPatientMessage) {
      console.log('👤 [InstantSessionDetector] Patient message already detected, skipping');
    } else {
      console.log('👤 [InstantSessionDetector] No existing patient message found');
    }
    
    if (data.hasDoctorResponse && !this.hasDoctorResponded) {
      console.log('👨‍⚕️ [InstantSessionDetector] Found existing doctor response - session activated');
      this.hasDoctorResponded = true;
      this.sessionActivated = true;
      this.stopTimer();
      this.events.onSessionActivated();
    } else if (data.hasDoctorResponse) {
      console.log('👨‍⚕️ [InstantSessionDetector] Doctor response already detected, skipping');
    } else {
      console.log('👨‍⚕️ [InstantSessionDetector] No existing doctor response found');
    }
  }

  /**
   * Get current timer state
   */
  getTimerState(): TimerState {
    return { ...this.timerState };
  }

  /**
   * Check if session is activated
   */
  isSessionActivated(): boolean {
    return this.sessionActivated;
  }

  /**
   * Check if patient has sent a message
   */
  hasPatientSentMessage(): boolean {
    return this.hasPatientMessageSent;
  }

  /**
   * Check if doctor has responded
   */
  hasDoctorRespondedToMessage(): boolean {
    return this.hasDoctorResponded;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
    this.isConnected = false;
    this.stopTimer();
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 [InstantSessionDetector] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ [InstantSessionDetector] Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Save session state to AsyncStorage
   */
  private async saveSessionState(): Promise<void> {
    try {
      const state = {
        hasPatientMessageSent: this.hasPatientMessageSent,
        hasDoctorResponded: this.hasDoctorResponded,
        sessionActivated: this.sessionActivated,
        timerState: this.timerState,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(`instant_session_state_${this.config.sessionId}`, JSON.stringify(state));
      console.log('💾 [InstantSessionDetector] Session state saved');
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error saving session state:', error);
    }
  }

  /**
   * Load session state from AsyncStorage
   */
  private async loadSessionState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`instant_session_state_${this.config.sessionId}`);
      if (stored) {
        const state = JSON.parse(stored);
        
        // Only restore if state is recent (within last hour)
        const isRecent = Date.now() - state.timestamp < 3600000;
        
        if (isRecent) {
          this.hasPatientMessageSent = state.hasPatientMessageSent || false;
          this.hasDoctorResponded = state.hasDoctorResponded || false;
          this.sessionActivated = state.sessionActivated || false;
          this.timerState = state.timerState || this.timerState;
          
          console.log('📱 [InstantSessionDetector] Session state restored:', {
            hasPatientMessageSent: this.hasPatientMessageSent,
            hasDoctorResponded: this.hasDoctorResponded,
            sessionActivated: this.sessionActivated,
            timerActive: this.timerState.isActive
          });
          
          // If timer was active, restart it with remaining time
          if (this.timerState.isActive && this.timerState.timeRemaining > 0) {
            this.start90SecondTimer();
          }
        }
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error loading session state:', error);
    }
  }

  /**
   * Clear session state
   */
  async clearSessionState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(`instant_session_state_${this.config.sessionId}`);
      this.hasPatientMessageSent = false;
      this.hasDoctorResponded = false;
      this.sessionActivated = false;
      this.timerState = {
        isActive: false,
        timeRemaining: 90,
        startTime: 0,
        endTime: 0
      };
      console.log('🗑️ [InstantSessionDetector] Session state cleared');
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error clearing session state:', error);
    }
  }

  /**
   * Check for existing patient messages when connecting
   */
  private async checkForExistingPatientMessages(): Promise<void> {
    try {
      console.log('🔍 [InstantSessionDetector] Checking for existing patient messages...');
      console.log('🔍 [InstantSessionDetector] WebSocket state:', this.websocket?.readyState);
      console.log('🔍 [InstantSessionDetector] Appointment ID:', this.config.appointmentId);
      
      // Request session status from the server
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const requestData = {
          type: 'session-status-request',
          appointmentId: this.config.appointmentId
        };
        console.log('📡 [InstantSessionDetector] Sending session status request:', requestData);
        this.websocket.send(JSON.stringify(requestData));
        console.log('📡 [InstantSessionDetector] Session status request sent successfully');
        
        // Set a timeout to check if we get a response
        setTimeout(() => {
          if (!this.hasPatientMessageSent && !this.hasDoctorResponded) {
            console.log('⚠️ [InstantSessionDetector] No session status response received after 5 seconds');
            console.log('⚠️ [InstantSessionDetector] This might indicate a server issue or the session status request is not being handled');
            console.log('⚠️ [InstantSessionDetector] WebSocket state:', this.websocket?.readyState);
            console.log('⚠️ [InstantSessionDetector] WebSocket URL:', this.websocket?.url);
          }
        }, 5000);
      } else {
        console.log('❌ [InstantSessionDetector] WebSocket not ready, cannot send session status request');
        console.log('❌ [InstantSessionDetector] WebSocket state:', this.websocket?.readyState);
        console.log('❌ [InstantSessionDetector] WebSocket URL:', this.websocket?.url);
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error checking for existing messages:', error);
    }
  }

  /**
   * Get WebRTC signaling URL
   */
  private getWebRTCSignalingUrl(): string {
    return process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 'ws://46.101.123.123:8082';
  }
}
