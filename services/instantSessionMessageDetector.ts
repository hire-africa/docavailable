import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../config/environment';

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
  onTimerStopped: () => void;
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
  private countdownInterval: NodeJS.Timeout | null = null;
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
  // Track whether server reports an active timer to avoid local restarts
  private serverTimerActive: boolean = false;
  // Prevent starting a fresh 90s timer while waiting for server status during initial hydration
  private awaitingServerStatus: boolean = false;
  // Bootstrap loop to fetch remaining time after patient message if server event is missing
  private timerBootstrapActive: boolean = false;

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
        const wsUrl = `${this.getWebRTCSignalingUrl()}/chat-signaling?appointmentId=${encodeURIComponent(this.config.appointmentId)}&authToken=${encodeURIComponent(this.config.authToken || '')}&userId=${encodeURIComponent(String(this.config.patientId))}`;
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
      // Check if the data is valid JSON
      if (typeof event.data !== 'string') {
        console.error('❌ [InstantSessionDetector] Received non-string data:', event.data);
        return;
      }

      // Check if it looks like HTML or plain text instead of JSON
      if (event.data.trim().startsWith('<') || event.data.trim().startsWith('DocAvailable')) {
        console.error('❌ [InstantSessionDetector] Received non-JSON response:', event.data.substring(0, 100));
        return;
      }

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
        case 'doctor-response-timer-stopped':
          console.log('⏹️ [InstantSessionDetector] Server timer stopped');
          this.serverTimerActive = false;
          this.stopTimer();
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
    
    // Remember that a patient message exists
    if (!this.hasPatientMessageSent) {
      this.hasPatientMessageSent = true;
    }

    // If we’re still waiting for server status, don’t start a fresh 90s timer yet
    if (this.awaitingServerStatus) {
      console.log('⏳ [InstantSessionDetector] Awaiting server status; not starting fresh timer on patient message');
      this.events.onPatientMessageDetected(message);
      return;
    }

    // Never start a local 90s timer from client messages; rely on server events or backend remaining time
    if (!this.serverTimerActive && !this.timerState.isActive) {
      console.log('⏱️ [InstantSessionDetector] Local start suppressed; waiting for server timer or backend remaining time');
      // Try to fetch authoritative remaining time (start a short bootstrap loop if needed)
      if (!this.timerBootstrapActive) {
        this.timerBootstrapActive = true;
        this.bootstrapTimerFromBackend().finally(() => {
          this.timerBootstrapActive = false;
        });
      }
    }
    this.events.onPatientMessageDetected(message);
  }

  /**
   * Manually trigger patient message detection (for integration with WebRTCChatService)
   */
  public triggerPatientMessageDetection(message: any): void {
    console.log('👤 [InstantSessionDetector] Manually triggering patient message detection:', message.id);
    this.handlePatientMessage(message);
  }

  /**
   * Manually trigger doctor message detection (for integration with WebRTCChatService)
   */
  public triggerDoctorMessageDetection(message: any): void {
    console.log('👨‍⚕️ [InstantSessionDetector] Manually triggering doctor message detection:', message.id);
    console.log('👨‍⚕️ [InstantSessionDetector] Message details:', {
      id: message.id,
      sender_id: message.sender_id,
      message: message.message?.substring(0, 50) + '...',
      doctorId: this.config.doctorId,
      patientId: this.config.patientId
    });
    this.handleDoctorMessage(message);
  }

  /**
   * Force state synchronization with hook (useful when detector state is restored)
   */
  public forceStateSync(): void {
    console.log('🔄 [InstantSessionDetector] Forcing state synchronization');
    console.log('🔄 [InstantSessionDetector] Current detector state:', {
      hasPatientSentMessage: this.hasPatientMessageSent,
      hasDoctorResponded: this.hasDoctorResponded,
      sessionActivated: this.sessionActivated,
      timerActive: this.timerState.isActive
    });
    
    // Trigger events to sync hook state
    if (this.hasPatientMessageSent) {
      this.events.onPatientMessageDetected({ id: 'sync', message: 'State sync' });
    }
    if (this.hasDoctorResponded) {
      this.events.onDoctorMessageDetected({ id: 'sync', message: 'State sync' });
    }
    if (this.sessionActivated) {
      this.events.onSessionActivated();
    }
    if (this.timerState.isActive) {
      this.events.onTimerStarted(this.timerState.timeRemaining);
    }
  }

  /**
   * Update auth token and reconnect if needed
   */
  public updateAuthToken(newAuthToken: string): void {
    if (this.config.authToken !== newAuthToken) {
      console.log('🔑 [InstantSessionDetector] Auth token updated, reconnecting...');
      this.config.authToken = newAuthToken;
      if (this.isConnected) {
        this.disconnect().then(() => {
          this.connect();
        });
      }
    }
  }

  /**
   * Handle doctor message - activate session and stop timer
   */
  private handleDoctorMessage(message: any): void {
    console.log('👨‍⚕️ [InstantSessionDetector] Doctor message detected:', message.id);
    console.log('👨‍⚕️ [InstantSessionDetector] Current state:', {
      hasDoctorResponded: this.hasDoctorResponded,
      sessionActivated: this.sessionActivated,
      timerActive: this.timerState.isActive
    });
    
    if (!this.hasDoctorResponded) {
      this.hasDoctorResponded = true;
      this.stopTimer();
      this.activateSession();
      this.events.onDoctorMessageDetected(message);
      console.log('✅ [InstantSessionDetector] Doctor message processed - session activated');
    } else {
      console.log('⚠️ [InstantSessionDetector] Doctor already responded, but ensuring state sync');
      // Even if already processed, ensure the hook state is synchronized
      this.events.onDoctorMessageDetected(message);
      if (this.timerState.isActive) {
        this.stopTimer();
      }
      if (!this.sessionActivated) {
        this.activateSession();
      }
    }
  }

  /**
   * Start the 90-second timer
   */
  private start90SecondTimer(): void {
    this.startTimer(90);
  }

  /**
   * Start timer with specified remaining time (for resuming)
   */
  private startTimer(timeRemaining: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    console.log('⏰ [InstantSessionDetector] Starting timer with remaining time:', timeRemaining);
    
    this.timerState = {
      isActive: true,
      timeRemaining: timeRemaining,
      startTime: Date.now() - ((90 - timeRemaining) * 1000), // Calculate original start time
      endTime: Date.now() + (timeRemaining * 1000)
    };

    // Start countdown updates every second
    this.startCountdown();
    
    // Set timeout for remaining time
    this.timer = setTimeout(() => {
      this.handleTimerExpired();
    }, timeRemaining * 1000) as any;

    this.saveSessionState();
    this.events.onTimerStarted(timeRemaining);
  }

  /**
   * Start countdown updates
   */
  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdownInterval = setInterval(() => {
      if (!this.timerState.isActive) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
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
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      }
    }, 1000) as any;
  }

  /**
   * Stop the timer
   */
  private stopTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    this.timerState.isActive = false;
    console.log('⏹️ [InstantSessionDetector] Timer stopped');
    this.saveSessionState();
    this.events.onTimerStopped();
  }

  /**
   * Handle timer expiration
   */
  private async handleTimerExpired(): Promise<void> {
    try {
      console.log('⏰ [InstantSessionDetector] Local 90-second timer reached zero - verifying with server');
      // Verify with backend to avoid premature expiry due to drift or hydration delays
      const url = `${this.getApiBaseUrl()}/api/text-sessions/${this.config.sessionId}/check-response`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'expired') {
          console.log('❌ [InstantSessionDetector] Server confirms session expired');
          this.timerState.isActive = false;
          this.timerState.timeRemaining = 0;
          await this.saveSessionState();
          this.events.onTimerExpired();
          return;
        }
        if (data && data.status === 'waiting' && typeof data.timeRemaining === 'number' && data.timeRemaining > 0) {
          console.log('⏰ [InstantSessionDetector] Server indicates time remaining, resuming with:', data.timeRemaining);
          this.startTimer(Math.floor(data.timeRemaining));
          return;
        }
      } else {
        console.warn('⚠️ [InstantSessionDetector] check-response returned non-OK status:', response.status);
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error verifying expiry with server:', error);
    }
    // Fallback: if no server info, do not hard-expire; keep inactive with 0 remaining until status arrives
    this.timerState.isActive = false;
    this.timerState.timeRemaining = 0;
    await this.saveSessionState();
    this.events.onTimerExpired();
  }

  /**
   * Handle timer started event from server
   */
  private handleTimerStarted(data: any): void {
    console.log('⏰ [InstantSessionDetector] Server timer started event received');
    this.serverTimerActive = true;
    // Use server-provided endTime/timeRemaining if available to avoid restarting a fresh 90s
    if (typeof data?.endTime === 'number') {
      const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
      if (remaining > 0) {
        this.startTimer(remaining);
        return;
      }
    }
    if (typeof data?.timeRemaining === 'number' && data.timeRemaining > 0) {
      this.startTimer(data.timeRemaining);
      return;
    }
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
    return environment.LARAVEL_API_URL;
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
    // Ask server for authoritative status (including timer remaining)
    try {
      // Enter awaiting status mode to avoid starting a fresh 90s from historical messages
      this.awaitingServerStatus = true;
      this.websocket?.send(JSON.stringify({ type: 'session-status-request' }));
    } catch {}
    // Failsafe: clear awaiting flag after 6s even if server doesn't respond
    setTimeout(() => {
      if (this.awaitingServerStatus) {
        console.log('⏳ [InstantSessionDetector] No server status response within timeout, lifting awaiting flag');
        this.awaitingServerStatus = false;
      }
    }, 6000);
    // Check for existing patient messages when connecting
    this.checkForExistingPatientMessages();
  }

  /**
   * Handle session status response
   */
  private handleSessionStatusResponse(data: any): void {
    console.log('📊 [InstantSessionDetector] Session status response received:', data);
    // Clear awaiting flag now that we have an authoritative response
    this.awaitingServerStatus = false;
    console.log('📊 [InstantSessionDetector] Current state:', {
      hasPatientMessageSent: this.hasPatientMessageSent,
      hasDoctorResponded: this.hasDoctorResponded,
      sessionActivated: this.sessionActivated
    });
    
    // If the server reports an active timer, resume with remaining time
    if (data.timerActive && typeof data.timeRemaining === 'number' && data.timeRemaining > 0) {
      console.log('⏰ [InstantSessionDetector] Resuming server timer with remaining:', data.timeRemaining);
      this.serverTimerActive = true;
      this.startTimer(data.timeRemaining);
      this.hasPatientMessageSent = true;
      return;
    }
    if (!data.timerActive && this.timerState.isActive) {
      console.log('⏹️ [InstantSessionDetector] Server has no active timer, stopping local timer');
      this.serverTimerActive = false;
      this.stopTimer();
    }

    if (data.hasPatientMessage && !this.hasPatientMessageSent) {
      console.log('👤 [InstantSessionDetector] Found existing patient message - checking if timer should start');
      this.hasPatientMessageSent = true;
      
      // Only start timer if doctor hasn't responded yet
      if (!data.hasDoctorResponse) {
        // If server didn't report active timer, only query backend if we don't already have an active timer
        if (!this.timerState.isActive) {
          console.log('👤 [InstantSessionDetector] Doctor hasn\'t responded - attempting backend remaining time fetch (no active local timer)');
          this.fetchAndResumeRemainingFromBackend()
            .catch(err => console.error('❌ [InstantSessionDetector] Failed to fetch remaining time:', err));
        } else {
          console.log('⏱️ [InstantSessionDetector] Local timer already active, skipping backend fetch');
        }
      } else {
        console.log('👤 [InstantSessionDetector] Doctor already responded - not starting timer');
      }
      
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
      this.serverTimerActive = false;
      this.stopTimer();
      this.events.onSessionActivated();
    } else if (data.hasDoctorResponse) {
      console.log('👨‍⚕️ [InstantSessionDetector] Doctor response already detected, skipping');
    } else {
      console.log('👨‍⚕️ [InstantSessionDetector] No existing doctor response found');
    }
  }

  /**
   * Fetch authoritative remaining time from backend and resume timer
   */
  private async fetchAndResumeRemainingFromBackend(): Promise<void> {
    try {
      if (this.timerState.isActive) {
        console.log('⏱️ [InstantSessionDetector] Timer already active, skipping backend resume');
        return;
      }
      const url = `${this.getApiBaseUrl()}/api/text-sessions/${this.config.sessionId}/check-response`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });
      if (!response.ok) {
        console.error('❌ [InstantSessionDetector] Backend check-response failed with status:', response.status);
        return;
      }
      const data = await response.json();
      if (data && data.status === 'waiting' && typeof data.timeRemaining === 'number' && data.timeRemaining > 0) {
        console.log('⏰ [InstantSessionDetector] Backend remaining time:', data.timeRemaining);
        this.serverTimerActive = true;
        this.startTimer(Math.floor(data.timeRemaining));
        this.hasPatientMessageSent = true;
      } else {
        console.log('ℹ️ [InstantSessionDetector] No remaining time from backend or not waiting');
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error fetching remaining time from backend:', error);
    }
  }

  /**
   * Bootstrap timer by polling backend a few times to obtain remaining time
   */
  private async bootstrapTimerFromBackend(): Promise<void> {
    const maxAttempts = 6;
    const delayMs = 1000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.timerState.isActive || this.serverTimerActive) {
        return;
      }
      try {
        await this.fetchAndResumeRemainingFromBackend();
        if (this.timerState.isActive) {
          console.log('⏰ [InstantSessionDetector] Timer bootstrapped from backend on attempt', attempt);
          return;
        }
      } catch {}
      await new Promise(res => setTimeout(res, delayMs));
    }
    console.log('⏳ [InstantSessionDetector] Backend did not provide remaining time during bootstrap window');
  }

  /**
   * Resume timer with a specific remaining duration (public API for hooks)
   */
  public resumeTimerWithRemaining(remainingSeconds: number): void {
    try {
      const safeRemaining = Math.max(0, Math.floor(remainingSeconds));
      if (safeRemaining > 0) {
        console.log('⏰ [InstantSessionDetector] Resuming timer via public API with remaining:', safeRemaining);
        this.serverTimerActive = true;
        this.startTimer(safeRemaining);
        this.hasPatientMessageSent = true;
      } else {
        console.log('⏰ [InstantSessionDetector] Resume requested with non-positive remaining; ignoring');
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Failed to resume timer with remaining:', error);
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
    // Do NOT stop the timer on disconnect; preserve countdown across navigation/app background
    try {
      await this.saveSessionState();
    } catch {}
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
        sessionId: this.config.sessionId, // Include session ID to prevent cross-session contamination
        hasPatientMessageSent: this.hasPatientMessageSent,
        hasDoctorResponded: this.hasDoctorResponded,
        sessionActivated: this.sessionActivated,
        timerState: this.timerState,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(`instant_session_state_${this.config.sessionId}`, JSON.stringify(state));
      console.log('💾 [InstantSessionDetector] Session state saved for session:', this.config.sessionId);
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
        
        // Only restore if state is recent (within last hour) AND for the same session
        const isRecent = Date.now() - state.timestamp < 3600000;
        const isSameSession = state.sessionId === this.config.sessionId;
        
        if (isRecent && isSameSession) {
          this.hasPatientMessageSent = state.hasPatientMessageSent || false;
          this.hasDoctorResponded = state.hasDoctorResponded || false;
          this.sessionActivated = state.sessionActivated || false;
          this.timerState = state.timerState || this.timerState;
          
          console.log('📱 [InstantSessionDetector] Session state restored for session:', this.config.sessionId, {
            hasPatientMessageSent: this.hasPatientMessageSent,
            hasDoctorResponded: this.hasDoctorResponded,
            sessionActivated: this.sessionActivated,
            timerActive: this.timerState.isActive
          });
          
          // If timer was active, restart it with remaining time
          if (this.timerState.isActive && this.timerState.timeRemaining > 0) {
            console.log('⏰ [InstantSessionDetector] Resuming timer with remaining time:', this.timerState.timeRemaining);
            this.startTimer(this.timerState.timeRemaining);
          }
        } else {
          console.log('📱 [InstantSessionDetector] Not restoring state - different session or too old:', {
            isRecent,
            isSameSession,
            storedSessionId: state.sessionId,
            currentSessionId: this.config.sessionId
          });
        }
      } else {
        console.log('📱 [InstantSessionDetector] No stored state found for session:', this.config.sessionId);
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
      console.log('🗑️ [InstantSessionDetector] Session state cleared for session:', this.config.sessionId);
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error clearing session state:', error);
    }
  }

  /**
   * Clear all old session states (cleanup method)
   */
  static async clearAllOldSessionStates(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const instantSessionKeys = keys.filter(key => key.startsWith('instant_session_state_'));
      
      for (const key of instantSessionKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const state = JSON.parse(stored);
            // Remove states older than 1 hour
            if (Date.now() - state.timestamp > 3600000) {
              await AsyncStorage.removeItem(key);
              console.log('🗑️ [InstantSessionDetector] Cleared old session state:', key);
            }
          }
        } catch (error) {
          console.error('❌ [InstantSessionDetector] Error clearing old session state:', key, error);
        }
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error clearing old session states:', error);
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
          appointmentId: this.config.appointmentId,
          authToken: this.config.authToken
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
    // Use the chat signaling URL for instant session detection
    const chatSignalingUrl = process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL || 'wss://docavailable.org/chat-signaling';
    // Keep wss:// for secure connections (don't convert to ws://)
    return chatSignalingUrl.replace(/\/chat-signaling$/, '');
  }
}
