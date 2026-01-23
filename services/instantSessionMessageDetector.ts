import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../config/environment';

export interface InstantSessionConfig {
  sessionId: string;
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
}

/**
 * Destroy all existing InstantSessionMessageDetector instances stored in the global map.
 * Safe to call multiple times.
 */
export async function destroyAllInstantSessionDetectors(): Promise<void> {
  try {
    const g = global as any;
    const map: Map<string, InstantSessionMessageDetector> | undefined = g?.__instantDetectorMap;
    if (!map || map.size === 0) return;
    for (const [key, detector] of map.entries()) {
      try {
        await detector.destroy();
      } catch { }
      map.delete(key);
    }
    g.__instantDetectorMap = new Map<string, InstantSessionMessageDetector>();
    console.log('🧹 [InstantSessionDetector] Destroyed all detectors');
  } catch (e) {
    console.warn('🧹 [InstantSessionDetector] Failed to destroy all detectors', e);
  }
}

export interface MessageDetectionEvents {
  onPatientMessageDetected: (message: any) => void;
  onDoctorMessageDetected: (message: any) => void;
  onTimerStarted: (timeRemaining: number, doctor_response_deadline: string | null) => void;
  onTimerExpired: () => void;
  onTimerStopped: () => void;
  onSessionActivated: () => void;
  onError: (error: string) => void;
}

export interface TimerState {
  isActive: boolean;
  timeRemaining: number;
  doctor_response_deadline: string | null; // Server-provided deadline for countdown calculation
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
    timeRemaining: 0, // Will be set from server deadline
    doctor_response_deadline: null
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
        const base = this.getWebRTCSignalingUrl();
        const wsUrl = `${base}?appointmentId=${encodeURIComponent(this.config.appointmentId)}&authToken=${encodeURIComponent(this.config.authToken || '')}&userId=${encodeURIComponent(String(this.config.patientId))}`;
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

      // Only log non-ping/pong messages to reduce spam
      if (data.type !== 'ping' && data.type !== 'pong') {
        console.log('📨 [InstantSessionDetector] Message received:', data.type);
        console.log('📨 [InstantSessionDetector] Full message data:', data);
      }

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

        case 'ping':
        case 'pong':
          // Silently handle ping/pong messages - no logging needed
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
    // Handle both nested message format and flattened format
    let message = data?.message || data;

    // Check if we have valid message data
    if (!data || (!data.message && !data.content && !data.senderId && !data.sender_id)) {
      console.error('❌ [InstantSessionDetector] Invalid chat message data - missing message object:', data);
      return;
    }

    // If data is flattened (has content/senderId directly), use it as the message
    if (!data.message && (data.content || data.senderId || data.sender_id)) {
      message = data;
    }

    // Validate message object has required properties
    if (!message || typeof message !== 'object') {
      console.error('❌ [InstantSessionDetector] Invalid message object:', message);
      return;
    }

    // Normalize sender ID property (handle both senderId and sender_id)
    const senderId = message.senderId || message.sender_id;
    // Try multiple possible ID fields - WebRTC might use different field names
    const messageId = message.id || message.messageId || message.tempId || message.temp_id || message.tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageContent = message.content || message.message;

    // Check if message has required properties
    if (senderId === undefined) {
      console.error('❌ [InstantSessionDetector] Message missing sender ID:', {
        hasSenderId: senderId !== undefined,
        message: message,
        availableKeys: Object.keys(message || {})
      });
      return;
    }

    // Log if message ID is missing but continue processing (we'll use a generated one)
    if (!message.id && !message.tempId && !message.temp_id) {
      console.warn('⚠️ [InstantSessionDetector] Message missing ID, using generated ID:', messageId);
    }

    // Ensure message has an ID for tracking
    if (!message.id && !message.tempId && !message.temp_id) {
      message.id = messageId;
    }

    console.log('💬 [InstantSessionDetector] Processing chat message:', {
      id: messageId,
      messageId: message.id || message.tempId || message.temp_id,
      senderId: senderId,
      content: messageContent?.substring(0, 50) + '...',
      doctorId: this.config.doctorId,
      patientId: this.config.patientId
    });

    const normalizedSenderId = Number(senderId);

    // Check if this is a patient message
    if (normalizedSenderId === this.config.patientId) {
      this.handlePatientMessage(message);
    }
    // Check if this is a doctor message
    else if (normalizedSenderId === this.config.doctorId) {
      this.handleDoctorMessage(message);
    } else {
      console.log('❓ [InstantSessionDetector] Unknown sender message:', {
        senderId: normalizedSenderId,
        doctorId: this.config.doctorId,
        patientId: this.config.patientId
      });
    }
  }

  /**
   * Handle patient message - start response window timer if not already started
   */
  private handlePatientMessage(message: any): void {
    // Validate message object
    if (!message || typeof message !== 'object') {
      console.error('❌ [InstantSessionDetector] Invalid patient message object:', message);
      return;
    }

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
    // Validate message object
    if (!message || typeof message !== 'object') {
      console.error('❌ [InstantSessionDetector] Invalid message for patient detection:', message);
      return;
    }

    console.log('👤 [InstantSessionDetector] Manually triggering patient message detection:', message.id);
    this.handlePatientMessage(message);
  }

  /**
   * Manually trigger doctor message detection (for integration with WebRTCChatService)
   */
  public triggerDoctorMessageDetection(message: any): void {
    // Validate message object
    if (!message || typeof message !== 'object') {
      console.error('❌ [InstantSessionDetector] Invalid message for doctor detection:', message);
      return;
    }

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
      this.events.onTimerStarted(this.timerState.timeRemaining, null);
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
    // Validate message object
    if (!message || typeof message !== 'object') {
      console.error('❌ [InstantSessionDetector] Invalid doctor message object:', message);
      return;
    }

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
   * Start timer with server-provided deadline (UI-only, never enforces expiry)
   */
  private startTimerWithDeadline(doctor_response_deadline: string, timeRemaining: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    console.log('⏰ [InstantSessionDetector] Starting UI-only timer with deadline:', doctor_response_deadline, 'remaining:', timeRemaining);

    this.timerState = {
      isActive: true,
      timeRemaining: timeRemaining,
      doctor_response_deadline: doctor_response_deadline
    };

    // Start countdown updates every second (UI-only)
    this.startCountdown();

    // Set timeout to check backend when deadline would be reached (UI-only, doesn't enforce expiry)
    this.timer = setTimeout(() => {
      this.handleTimerExpired();
    }, timeRemaining * 1000) as any;

    this.saveSessionState();
    this.events.onTimerStarted(timeRemaining, doctor_response_deadline);
  }

  /**
   * Start countdown updates (UI-only, derived from server deadline)
   */
  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdownInterval = setInterval(() => {
      if (!this.timerState.isActive || !this.timerState.doctor_response_deadline) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        return;
      }

      // Calculate remaining time from server-provided deadline (not local endTime)
      const deadlineTimestamp = new Date(this.timerState.doctor_response_deadline).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadlineTimestamp - now) / 1000));

      this.timerState.timeRemaining = remaining;

      // Update every 5 seconds to avoid too many updates
      if (remaining % 5 === 0 || remaining <= 10) {
        console.log('⏰ [InstantSessionDetector] Timer remaining (UI-only):', remaining, 'seconds');
      }

      if (remaining <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        // Don't enforce expiry here - let handleTimerExpired() call backend
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
   * Handle timer expiration (UI-only - always calls backend, never enforces expiry locally)
   */
  private async handleTimerExpired(): Promise<void> {
    try {
      console.log('⏰ [InstantSessionDetector] UI timer reached zero - checking backend for authoritative status');
      const url = `${this.getApiBaseUrl()}/api/text-sessions/${this.config.sessionId}/check-response`;
      console.log('🔍 [InstantSessionDetector] Calling check-response URL:', url);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.authToken}` }
      });
      console.log('🔍 [InstantSessionDetector] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [InstantSessionDetector] Response data:', JSON.stringify(data, null, 2));

        // Render based on server response only - never enforce expiry locally
        if (data && data.status === 'expired') {
          console.log('❌ [InstantSessionDetector] Server confirms session expired');
          this.timerState.isActive = false;
          this.timerState.timeRemaining = 0;
          this.timerState.doctor_response_deadline = null;
          await this.saveSessionState();
          this.events.onTimerExpired();
          return;
        }

        if (data && data.status === 'waiting' && typeof data.timeRemaining === 'number' && data.timeRemaining > 0 && data.doctor_response_deadline) {
          console.log('⏰ [InstantSessionDetector] Server indicates time remaining, resuming with deadline:', data.doctor_response_deadline);
          this.startTimerWithDeadline(data.doctor_response_deadline, Math.floor(data.timeRemaining));
          return;
        }

        if (data && data.status === 'active') {
          console.log('✅ [InstantSessionDetector] Server indicates session is active - stopping timer');
          this.stopTimer();
          this.activateSession();
          return;
        }

        console.warn('⚠️ [InstantSessionDetector] Unexpected server response:', data);
        // Don't enforce expiry - keep timer inactive until server provides clear status
        this.timerState.isActive = false;
        this.timerState.timeRemaining = 0;
        await this.saveSessionState();
      } else {
        console.warn('⚠️ [InstantSessionDetector] check-response returned non-OK status:', response.status);
        const errorText = await response.text();
        console.warn('⚠️ [InstantSessionDetector] Error response:', errorText);
        // Don't enforce expiry on error - keep timer inactive
        this.timerState.isActive = false;
        this.timerState.timeRemaining = 0;
        await this.saveSessionState();
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Error checking backend for expiry:', error);
      // Don't enforce expiry on error - keep timer inactive
      this.timerState.isActive = false;
      this.timerState.timeRemaining = 0;
      await this.saveSessionState();
    }
  }

  /**
   * Handle timer started event from server
   */
  private handleTimerStarted(data: any): void {
    console.log('⏰ [InstantSessionDetector] Server timer started event received');
    this.serverTimerActive = true;

    // Use server-provided doctor_response_deadline and timeRemaining
    if (data?.doctor_response_deadline && typeof data?.timeRemaining === 'number' && data.timeRemaining > 0) {
      this.startTimerWithDeadline(data.doctor_response_deadline, data.timeRemaining);
      return;
    }

    // Fallback: if deadline not provided but timeRemaining is, fetch from backend
    if (typeof data?.timeRemaining === 'number' && data.timeRemaining > 0) {
      this.fetchAndResumeRemainingFromBackend();
      return;
    }

    // If no timer info provided, fetch from backend
    if (!this.timerState.isActive) {
      this.fetchAndResumeRemainingFromBackend();
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
    } catch { }
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

    // If the server reports an active timer, resume with remaining time and deadline
    if (data.timerActive && typeof data.timeRemaining === 'number' && data.timeRemaining > 0 && data.doctor_response_deadline) {
      console.log('⏰ [InstantSessionDetector] Resuming server timer with remaining:', data.timeRemaining, 'deadline:', data.doctor_response_deadline);
      this.serverTimerActive = true;
      this.startTimerWithDeadline(data.doctor_response_deadline, data.timeRemaining);
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
   * Fetch authoritative remaining time and deadline from backend and resume timer
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
      if (data && data.status === 'waiting' && typeof data.timeRemaining === 'number' && data.timeRemaining > 0 && data.doctor_response_deadline) {
        console.log('⏰ [InstantSessionDetector] Backend remaining time:', data.timeRemaining, 'deadline:', data.doctor_response_deadline);
        this.serverTimerActive = true;
        this.startTimerWithDeadline(data.doctor_response_deadline, Math.floor(data.timeRemaining));
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
      } catch { }
      await new Promise(res => setTimeout(res, delayMs));
    }
    console.log('⏳ [InstantSessionDetector] Backend did not provide remaining time during bootstrap window');
  }

  /**
   * Resume timer with server-provided deadline and remaining duration (public API for hooks)
   */
  public resumeTimerWithDeadline(doctor_response_deadline: string, remainingSeconds: number): void {
    try {
      const safeRemaining = Math.max(0, Math.floor(remainingSeconds));
      if (safeRemaining > 0 && doctor_response_deadline) {
        console.log('⏰ [InstantSessionDetector] Resuming timer via public API with deadline:', doctor_response_deadline, 'remaining:', safeRemaining);
        this.serverTimerActive = true;
        this.startTimerWithDeadline(doctor_response_deadline, safeRemaining);
        this.hasPatientMessageSent = true;
      } else {
        console.log('⏰ [InstantSessionDetector] Resume requested with invalid deadline or non-positive remaining; ignoring');
      }
    } catch (error) {
      console.error('❌ [InstantSessionDetector] Failed to resume timer with deadline:', error);
    }
  }

  /**
   * Fully destroy this detector: stop timers/intervals and close connections
   */
  public async destroy(): Promise<void> {
    try {
      // Stop any active timers/intervals
      this.stopTimer();
    } catch { }
    try {
      // Close websocket connection
      if (this.websocket) {
        this.websocket.close(1000, 'Destroyed');
        this.websocket = null;
      }
    } catch { }
    // Reset flags
    this.isConnected = false;
    this.serverTimerActive = false;
    this.awaitingServerStatus = false;
    this.timerBootstrapActive = false;
    // Reset timer state
    this.timerState.isActive = false;
    this.timerState.timeRemaining = 0;
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
    } catch { }
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

          // If timer was active, restart it with deadline and remaining time
          if (this.timerState.isActive && this.timerState.timeRemaining > 0 && this.timerState.doctor_response_deadline) {
            console.log('⏰ [InstantSessionDetector] Resuming timer with deadline:', this.timerState.doctor_response_deadline, 'remaining:', this.timerState.timeRemaining);
            this.startTimerWithDeadline(this.timerState.doctor_response_deadline, this.timerState.timeRemaining);
          } else if (this.timerState.isActive && this.timerState.timeRemaining > 0) {
            // If deadline missing, fetch from backend
            console.log('⏰ [InstantSessionDetector] Timer state missing deadline, fetching from backend');
            this.fetchAndResumeRemainingFromBackend();
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
        timeRemaining: 0, // Will be set from server deadline
        doctor_response_deadline: null
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
    // Production signaling URL for chat and session detection
    return 'wss://docavailable.org/chat-signaling';
  }
}
