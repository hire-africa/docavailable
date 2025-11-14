import { Alert } from '../utils/customAlert';
import { environment } from '../config/environment';

export interface BillingConfig {
  intervalMinutes: number;
  warningBeforeMinutes: number;
  maxCycles: number; // Optional safety limit
}

export interface CallSession {
  sessionId: string;
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
  startBilling(sessionId: string, config?: Partial<BillingConfig>): void {
    const billingConfig = { ...this.defaultConfig, ...config };
    
    console.log('💰 [BackgroundBilling] Starting billing for session:', {
      sessionId,
      intervalMinutes: billingConfig.intervalMinutes
    });

    // Stop any existing billing for this session
    this.stopBilling(sessionId);

    const now = Date.now();
    const session: CallSession = {
      sessionId,
      startTime: now,
      durationSeconds: 0,
      cyclesCompleted: 0,
      isActive: true,
      lastBillingTime: now,
      nextBillingTime: now + (billingConfig.intervalMinutes * 60 * 1000)
    };

    this.sessions.set(sessionId, session);

    // Start duration tracking (every second)
    const durationTimer = setInterval(() => {
      this.updateDuration(sessionId);
    }, 1000);
    this.timers.set(sessionId, durationTimer);

    // Schedule first billing cycle
    this.scheduleBilling(sessionId, billingConfig);

    console.log(`✅ [BackgroundBilling] Started billing for ${sessionId} - every ${billingConfig.intervalMinutes} minutes`);
  }

  /**
   * Stop billing for a session
   */
  stopBilling(sessionId: string): void {
    console.log('🛑 [BackgroundBilling] Stopping billing for session:', sessionId);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      const totalMinutes = Math.floor(session.durationSeconds / 60);
      console.log(`📊 [BackgroundBilling] Session ${sessionId} ended - Duration: ${totalMinutes} minutes, Cycles: ${session.cyclesCompleted}`);
    }

    // Clear timers
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
    }

    const billingTimer = this.billingTimers.get(sessionId);
    if (billingTimer) {
      clearTimeout(billingTimer);
      this.billingTimers.delete(sessionId);
    }
  }

  /**
   * Update session duration
   */
  private updateDuration(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const now = Date.now();
    session.durationSeconds = Math.floor((now - session.startTime) / 1000);
  }

  /**
   * Schedule next billing cycle
   */
  private scheduleBilling(sessionId: string, config: BillingConfig): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const billingDelayMs = config.intervalMinutes * 60 * 1000;
    
    console.log(`⏰ [BackgroundBilling] Scheduling billing for ${sessionId} in ${config.intervalMinutes} minutes`);

    // Schedule warning before billing
    const warningDelayMs = billingDelayMs - (config.warningBeforeMinutes * 60 * 1000);
    if (warningDelayMs > 0) {
      setTimeout(() => {
        this.showBillingWarning(sessionId, config);
      }, warningDelayMs);
    }

    // Schedule actual billing
    const billingTimer = setTimeout(() => {
      this.processBillingCycle(sessionId, config);
    }, billingDelayMs);

    this.billingTimers.set(sessionId, billingTimer);
  }

  /**
   * Show warning before billing
   */
  private showBillingWarning(sessionId: string, config: BillingConfig): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const cycleNumber = session.cyclesCompleted + 1;
    console.log(`⚠️ [BackgroundBilling] Showing billing warning for session ${sessionId}, cycle ${cycleNumber}`);

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
   */
  private async processBillingCycle(sessionId: string, config: BillingConfig): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.cyclesCompleted++;
    session.lastBillingTime = Date.now();
    session.nextBillingTime = session.lastBillingTime + (config.intervalMinutes * 60 * 1000);

    console.log(`💰 [BackgroundBilling] Processing billing cycle ${session.cyclesCompleted} for session ${sessionId}`);

    // Check safety limit
    if (session.cyclesCompleted >= config.maxCycles) {
      console.log(`🚨 [BackgroundBilling] Session ${sessionId} reached max cycles (${config.maxCycles}), ending for safety`);
      this.handleMaxCyclesReached(sessionId);
      return;
    }

    // Process billing using existing endpoint (handles both deduction and doctor payment)
    await this.processBillingDeduction(sessionId);

    // Schedule next cycle
    this.scheduleBilling(sessionId, config);
  }

  /**
   * Handle max cycles reached (safety limit)
   */
  private handleMaxCyclesReached(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const totalHours = Math.floor((session.cyclesCompleted * this.defaultConfig.intervalMinutes) / 60);

    Alert.warning(
      'Long Call Session',
      `Your call has been running for ${totalHours}+ hours. For your protection, this session will now end. You can start a new call if needed.`,
      () => {
        this.endCallSession(sessionId);
      }
    );
  }

  /**
   * Process billing using existing call session deduction endpoint
   */
  private async processBillingDeduction(sessionId: string): Promise<void> {
    try {
      console.log('💰 [BackgroundBilling] Processing billing using existing call-sessions/deduction endpoint...');
      
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const authToken = await AsyncStorage.getItem('auth_token');
      
      if (!authToken) {
        console.error('❌ [BackgroundBilling] No auth token for session deduction');
        return;
      }

      // Use existing call-sessions/deduction endpoint
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/deduction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          call_type: 'voice', // or 'video' based on call type
          duration_minutes: this.defaultConfig.intervalMinutes,
          triggered_by: 'background_billing'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [BackgroundBilling] Session deducted using existing endpoint:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ [BackgroundBilling] Failed to deduct session:', response.status, errorText);
        
        // If user has no remaining sessions, handle gracefully
        if (response.status === 400 && errorText.includes('no remaining')) {
          this.handleNoRemainingSessions(sessionId);
        }
      }
    } catch (error) {
      console.error('❌ [BackgroundBilling] Error processing billing deduction:', error);
    }
  }

  /**
   * Handle no remaining sessions
   */
  private handleNoRemainingSessions(sessionId: string): void {
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
  private endCallSession(sessionId: string): void {
    console.log(`📞 [BackgroundBilling] Ending call session ${sessionId}`);
    
    // Emit event for call components to handle
    const event = new CustomEvent('callSessionEnded', {
      detail: { sessionId }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }

    // Also use global variable as fallback
    const g: any = global as any;
    g.callSessionEnded = { sessionId, timestamp: Date.now() };

    this.stopBilling(sessionId);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): CallSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Check if session is active
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isActive || false;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.durationSeconds || 0;
  }

  /**
   * Clean up all sessions
   */
  cleanup(): void {
    console.log('🧹 [BackgroundBilling] Cleaning up all sessions');
    
    for (const sessionId of this.sessions.keys()) {
      this.stopBilling(sessionId);
    }
    
    this.sessions.clear();
    this.timers.clear();
    this.billingTimers.clear();
  }
}

export default new BackgroundBillingManager();
