import { environment } from '../config/environment';
import { Alert } from '../utils/customAlert';

export interface BillingConfig {
  intervalMinutes: number;
  warningBeforeMinutes: number;
  maxCycles: number; // Optional safety limit
}

export interface CallSession {
  sessionId: string; // This is actually the Appointment ID (e.g. "direct_session_..." or "123")
  callType: 'voice' | 'video';
  startTime: number;
  durationSeconds: number;
  cyclesCompleted: number;
  isActive: boolean;
  lastBillingTime: number;
  nextBillingTime: number;
}

class BackgroundBillingManager {
  private sessions: Map<string, CallSession> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private billingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Default: Bill every 10 minutes, unlimited duration
  private defaultConfig: BillingConfig = {
    intervalMinutes: 10,
    warningBeforeMinutes: 1,
    maxCycles: 100 // Very high limit (16+ hours) for safety
  };

  /**
   * Start background billing for a call session
   */
  startBilling(appointmentId: string, callType: 'voice' | 'video' | 'audio', config?: Partial<BillingConfig>): void {
    const billingConfig = { ...this.defaultConfig, ...config };

    // Normalize call type as backend expects 'voice' or 'video'
    const normalizedCallType = callType === 'audio' ? 'voice' : callType;

    console.log('💰 [BackgroundBilling] Starting billing for appointment:', {
      appointmentId,
      callType: normalizedCallType,
      intervalMinutes: billingConfig.intervalMinutes
    });

    // Stop any existing billing for this session
    this.stopBilling(appointmentId);

    const now = Date.now();
    const session: CallSession = {
      sessionId: appointmentId,
      callType: normalizedCallType as 'voice' | 'video',
      startTime: now,
      durationSeconds: 0,
      cyclesCompleted: 0,
      isActive: true,
      lastBillingTime: now,
      nextBillingTime: now + (billingConfig.intervalMinutes * 60 * 1000)
    };

    this.sessions.set(appointmentId, session);

    // Start duration tracking (every second)
    const durationTimer = setInterval(() => {
      this.updateDuration(appointmentId);
    }, 1000);
    this.timers.set(appointmentId, durationTimer);

    // Schedule first billing cycle
    this.scheduleBilling(appointmentId, billingConfig);

    console.log(`✅ [BackgroundBilling] Started billing for ${appointmentId} - every ${billingConfig.intervalMinutes} minutes`);
  }

  /**
   * Stop billing for a session
   */
  stopBilling(appointmentId: string): void {
    console.log('🛑 [BackgroundBilling] Stopping billing for appointment:', appointmentId);

    const session = this.sessions.get(appointmentId);
    if (session) {
      session.isActive = false;
      const totalMinutes = Math.floor(session.durationSeconds / 60);
      console.log(`📊 [BackgroundBilling] Session ${appointmentId} ended - Duration: ${totalMinutes} minutes, Cycles: ${session.cyclesCompleted}`);
    }

    // Clear timers
    const timer = this.timers.get(appointmentId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(appointmentId);
    }

    const billingTimer = this.billingTimers.get(appointmentId);
    if (billingTimer) {
      clearTimeout(billingTimer);
      this.billingTimers.delete(appointmentId);
    }

    // Remove session
    this.sessions.delete(appointmentId);
  }

  /**
   * Update session duration
   */
  private updateDuration(appointmentId: string): void {
    const session = this.sessions.get(appointmentId);
    if (!session || !session.isActive) return;

    const now = Date.now();
    // Update total call duration in seconds
    session.durationSeconds = Math.floor((now - session.startTime) / 1000);
  }

  /**
   * Schedule next billing cycle
   */
  private scheduleBilling(appointmentId: string, config: BillingConfig): void {
    const session = this.sessions.get(appointmentId);
    if (!session || !session.isActive) return;

    const billingDelayMs = config.intervalMinutes * 60 * 1000;

    console.log(`⏰ [BackgroundBilling] Scheduling billing for ${appointmentId} in ${config.intervalMinutes} minutes`);

    // Schedule warning before billing
    const warningDelayMs = billingDelayMs - (config.warningBeforeMinutes * 60 * 1000);
    if (warningDelayMs > 0) {
      setTimeout(() => {
        this.showBillingWarning(appointmentId, config);
      }, warningDelayMs);
    }

    // Schedule actual billing
    const billingTimer = setTimeout(() => {
      this.processBillingCycle(appointmentId, config);
    }, billingDelayMs);

    this.billingTimers.set(appointmentId, billingTimer);
  }

  /**
   * Show warning before billing
   */
  private showBillingWarning(appointmentId: string, config: BillingConfig): void {
    const session = this.sessions.get(appointmentId);
    if (!session || !session.isActive) return;

    const cycleNumber = session.cyclesCompleted + 1;
    console.log(`⚠️ [BackgroundBilling] Showing billing warning for session ${appointmentId}, cycle ${cycleNumber}`);

    Alert.info(
      'Call Session Billing',
      `Your call will be billed for another ${config.intervalMinutes}-minute session in ${config.warningBeforeMinutes} minute(s). You can continue talking without interruption.`,
      () => {
        console.log('📝 [BackgroundBilling] Billing warning acknowledged');
      }
    );
  }

  /**
   * Process billing cycle
   * CRITICAL: Only processes billing if call is actually connected (has connected_at timestamp)
   */
  private async processBillingCycle(appointmentId: string, config: BillingConfig): Promise<void> {
    const session = this.sessions.get(appointmentId);
    if (!session || !session.isActive) return;

    // CRITICAL: Verify call is connected in backend before billing
    // The backend will check connected_at timestamp and only bill if it exists
    // This ensures we never bill for calls that never connected

    session.cyclesCompleted++;
    session.lastBillingTime = Date.now();
    session.nextBillingTime = session.lastBillingTime + (config.intervalMinutes * 60 * 1000);

    console.log(`💰 [BackgroundBilling] Processing billing cycle ${session.cyclesCompleted} for session ${appointmentId}`);

    // Check safety limit
    if (session.cyclesCompleted >= config.maxCycles) {
      console.log(`🚨 [BackgroundBilling] Session ${appointmentId} reached max cycles (${config.maxCycles}), ending for safety`);
      this.handleMaxCyclesReached(appointmentId);
      return;
    }

    // Process billing using existing endpoint (handles both deduction and doctor payment)
    // Backend will verify connected_at exists before processing
    await this.processBillingDeduction(appointmentId);

    // Schedule next cycle
    this.scheduleBilling(appointmentId, config);
  }

  /**
   * Handle max cycles reached (safety limit)
   */
  private handleMaxCyclesReached(appointmentId: string): void {
    const session = this.sessions.get(appointmentId);
    if (!session) return;

    const totalHours = Math.floor((session.cyclesCompleted * this.defaultConfig.intervalMinutes) / 60);

    Alert.warning(
      'Long Call Session',
      `Your call has been running for ${totalHours}+ hours. For your protection, this session will now end. You can start a new call if needed.`,
      () => {
        this.endCallSession(appointmentId);
      }
    );
  }

  /**
   * Process billing using existing call session deduction endpoint
   */
  private async processBillingDeduction(appointmentId: string): Promise<void> {
    const session = this.sessions.get(appointmentId);
    if (!session) return;

    try {
      console.log('💰 [BackgroundBilling] Processing billing using existing call-sessions/deduction endpoint...');

      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const authToken = await AsyncStorage.getItem('auth_token');

      if (!authToken) {
        console.error('❌ [BackgroundBilling] No auth token for session deduction');
        return;
      }

      // Backend expects session_duration in seconds to calculate elapsed minutes
      // $elapsedMinutes = floor($sessionDuration / 60);
      // So we must send the CUMULATIVE duration.

      const payload = {
        appointment_id: appointmentId, // Critical fix: Backend expects 'appointment_id'
        call_type: session.callType,   // Critical fix: 'voice' or 'video'
        session_duration: session.durationSeconds, // Critical fix: seconds, cumulative
        triggered_by: 'background_billing'
      };

      console.log('📦 [BackgroundBilling] Sending deduction payload:', payload);

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/deduction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [BackgroundBilling] Session deducted successfully:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ [BackgroundBilling] Failed to deduct session:', response.status, errorText);

        // If user has no remaining sessions, handle gracefully
        if (response.status === 400 && errorText.includes('no remaining')) {
          this.handleNoRemainingSessions(appointmentId);
        }
      }
    } catch (error) {
      console.error('❌ [BackgroundBilling] Error processing billing deduction:', error);
    }
  }

  /**
   * Handle no remaining sessions
   */
  private handleNoRemainingSessions(appointmentId: string): void {
    Alert.warning(
      'No Remaining Sessions',
      'You have used all your call sessions for this billing period. Your current call will continue, but please consider upgrading your plan for future calls.',
      () => {
        console.log('📝 [BackgroundBilling] No sessions warning acknowledged');
      }
    );
  }

  /**
   * End call session
   */
  private endCallSession(appointmentId: string): void {
    console.log(`📞 [BackgroundBilling] Ending call session ${appointmentId}`);

    // Emit event for call components to handle
    const event = new CustomEvent('callSessionEnded', {
      detail: { sessionId: appointmentId }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }

    // Also use global variable as fallback
    const g: any = global as any;
    g.callSessionEnded = { sessionId: appointmentId, timestamp: Date.now() };

    this.stopBilling(appointmentId);
  }

  /**
   * Get session info
   */
  getSession(appointmentId: string): CallSession | null {
    return this.sessions.get(appointmentId) || null;
  }

  /**
   * Check if session is active
   */
  isSessionActive(appointmentId: string): boolean {
    const session = this.sessions.get(appointmentId);
    return session?.isActive || false;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(appointmentId: string): number {
    const session = this.sessions.get(appointmentId);
    return session?.durationSeconds || 0;
  }

  /**
   * Clean up all sessions
   */
  cleanup(): void {
    console.log('🧹 [BackgroundBilling] Cleaning up all sessions');

    for (const appointmentId of this.sessions.keys()) {
      this.stopBilling(appointmentId);
    }

    this.sessions.clear();
    this.timers.clear();
    this.billingTimers.clear();
  }
}

export default new BackgroundBillingManager();
