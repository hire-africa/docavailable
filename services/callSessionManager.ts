import { Alert } from '../utils/customAlert';
import { environment } from '../config/environment';

export interface CallSessionLimits {
  billingIntervalMinutes: number;
  warningBeforeBillingMinutes: number;
  maxContinuousBillingCycles: number; // Optional limit to prevent runaway costs
}

export interface CallSessionState {
  sessionId: string;
  startTime: number;
  durationSeconds: number;
  billingCyclesCompleted: number;
  isActive: boolean;
  lastBillingTime: number;
  nextBillingTime: number;
}

class CallSessionManager {
  private sessions: Map<string, CallSessionState> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private billingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  
  // Default billing settings (charge every 10 minutes)
  private defaultLimits: CallSessionLimits = {
    billingIntervalMinutes: 10, // Bill every 10 minutes
    warningBeforeBillingMinutes: 1, // Warn 1 minute before billing
    maxContinuousBillingCycles: 6 // Max 6 cycles (60 minutes) to prevent runaway costs
  };

  /**
   * Start tracking a call session with background billing
   */
  startSession(sessionId: string, limits?: Partial<CallSessionLimits>): void {
    const sessionLimits = { ...this.defaultLimits, ...limits };
    
    console.log('⏱️ [CallSessionManager] Starting session tracking with background billing:', {
      sessionId,
      billingInterval: sessionLimits.billingIntervalMinutes,
      maxCycles: sessionLimits.maxContinuousBillingCycles
    });

    // Stop any existing session with the same ID
    this.stopSession(sessionId);

    const now = Date.now();
    const session: CallSessionState = {
      sessionId,
      startTime: now,
      durationSeconds: 0,
      billingCyclesCompleted: 0,
      isActive: true,
      lastBillingTime: now,
      nextBillingTime: now + (sessionLimits.billingIntervalMinutes * 60 * 1000)
    };

    this.sessions.set(sessionId, session);

    // Start duration timer (updates every second)
    const timer = setInterval(() => {
      this.updateSessionDuration(sessionId, sessionLimits);
    }, 1000);
    this.timers.set(sessionId, timer);

    // Schedule first billing cycle
    this.scheduleBillingCycle(sessionId, sessionLimits);

    console.log(`✅ [CallSessionManager] Session ${sessionId} started - billing every ${sessionLimits.billingIntervalMinutes} minutes`);
  }

  /**
   * Stop tracking a call session
   */
  stopSession(sessionId: string): void {
    console.log('🛑 [CallSessionManager] Stopping session:', sessionId);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      console.log(`📊 [CallSessionManager] Session ${sessionId} ended after ${Math.floor(session.durationSeconds / 60)}:${String(session.durationSeconds % 60).padStart(2, '0')}`);
    }

    // Clear timers
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
    }

    const warningTimer = this.warningTimers.get(sessionId);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(sessionId);
    }

    // Keep session data for analytics but mark as inactive
    if (session) {
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Update session duration and check limits
   */
  private updateSessionDuration(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const now = Date.now();
    session.durationSeconds = Math.floor((now - session.startTime) / 1000);

    const durationMinutes = Math.floor(session.durationSeconds / 60);
    const maxAllowedMinutes = this.defaultLimits.maxDurationMinutes + 
                             (session.extensionsUsed * this.defaultLimits.extensionMinutes);

    // Check if session has exceeded time limit
    if (durationMinutes >= maxAllowedMinutes) {
      console.log(`⏰ [CallSessionManager] Session ${sessionId} exceeded time limit: ${durationMinutes}/${maxAllowedMinutes} minutes`);
      this.handleSessionTimeout(sessionId);
    }
  }

  /**
   * Show time warning to user
   */
  private showTimeWarning(sessionId: string, limits: CallSessionLimits): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || session.hasWarned) return;

    session.hasWarned = true;
    const remainingMinutes = limits.maxDurationMinutes - limits.warningAtMinutes;

    console.log(`⚠️ [CallSessionManager] Showing time warning for session ${sessionId}`);

    Alert.warning(
      'Call Time Warning',
      `Your call will end in ${remainingMinutes} minutes. You can extend the session when prompted.`,
      () => {
        console.log('📝 [CallSessionManager] Time warning acknowledged');
      }
    );
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    console.log(`⏰ [CallSessionManager] Session ${sessionId} timed out`);

    // Check if extensions are available
    if (session.extensionsUsed < this.defaultLimits.maxExtensions) {
      this.offerSessionExtension(sessionId);
    } else {
      this.forceEndSession(sessionId);
    }
  }

  /**
   * Offer session extension to user
   */
  private offerSessionExtension(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const remainingExtensions = this.defaultLimits.maxExtensions - session.extensionsUsed;
    const extensionMinutes = this.defaultLimits.extensionMinutes;

    console.log(`🔄 [CallSessionManager] Offering extension for session ${sessionId}`);

    Alert.confirm(
      'Extend Call Session?',
      `Your ${this.defaultLimits.maxDurationMinutes}-minute session has ended. Would you like to extend for ${extensionMinutes} more minutes? (${remainingExtensions} extensions remaining)`,
      () => {
        this.extendSession(sessionId);
      },
      () => {
        this.forceEndSession(sessionId);
      },
      'Extend',
      'End Call'
    );
  }

  /**
   * Extend the current session
   */
  private extendSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.extensionsUsed++;
    session.hasWarned = false; // Reset warning flag for new extension
    
    console.log(`🔄 [CallSessionManager] Extended session ${sessionId} (${session.extensionsUsed}/${this.defaultLimits.maxExtensions})`);

    // Set new warning timer for the extension
    const warningTimeMs = (this.defaultLimits.extensionMinutes - 2) * 60 * 1000; // Warn 2 minutes before extension ends
    const warningTimer = setTimeout(() => {
      this.showExtensionWarning(sessionId);
    }, warningTimeMs);
    
    // Clear old warning timer and set new one
    const oldWarningTimer = this.warningTimers.get(sessionId);
    if (oldWarningTimer) {
      clearTimeout(oldWarningTimer);
    }
    this.warningTimers.set(sessionId, warningTimer);

    // Deduct extension from user's account
    this.deductSessionExtension(sessionId);
  }

  /**
   * Show extension warning
   */
  private showExtensionWarning(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || session.hasWarned) return;

    session.hasWarned = true;
    console.log(`⚠️ [CallSessionManager] Showing extension warning for session ${sessionId}`);

    Alert.warning(
      'Extension Ending Soon',
      'Your extended session will end in 2 minutes.',
      () => {
        console.log('📝 [CallSessionManager] Extension warning acknowledged');
      }
    );
  }

  /**
   * Force end session (no more extensions available)
   */
  private forceEndSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🛑 [CallSessionManager] Force ending session ${sessionId}`);

    // Notify that session is ending
    Alert.info(
      'Call Session Ended',
      'Your call session has reached the maximum duration and will now end.',
      () => {
        // Trigger call end via global event
        this.triggerCallEnd(sessionId);
      }
    );

    this.stopSession(sessionId);
  }

  /**
   * Trigger call end event
   */
  private triggerCallEnd(sessionId: string): void {
    console.log(`📞 [CallSessionManager] Triggering call end for session ${sessionId}`);
    
    // Emit global event that call components can listen to
    const event = new CustomEvent('callSessionTimeout', {
      detail: { sessionId }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }

    // Also use global variable as fallback
    const g: any = global as any;
    g.callSessionTimeout = { sessionId, timestamp: Date.now() };
  }

  /**
   * Deduct session extension from user account
   */
  private async deductSessionExtension(sessionId: string): Promise<void> {
    try {
      console.log('💰 [CallSessionManager] Deducting session extension...');
      
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const authToken = await AsyncStorage.getItem('auth_token');
      
      if (!authToken) {
        console.error('❌ [CallSessionManager] No auth token for extension deduction');
        return;
      }

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          extension_minutes: this.defaultLimits.extensionMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CallSessionManager] Session extension deducted:', data);
      } else {
        console.error('❌ [CallSessionManager] Failed to deduct extension:', response.status);
      }
    } catch (error) {
      console.error('❌ [CallSessionManager] Error deducting extension:', error);
    }
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): CallSessionState | null {
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
   * Clean up all sessions (call on app shutdown)
   */
  cleanup(): void {
    console.log('🧹 [CallSessionManager] Cleaning up all sessions');
    
    for (const sessionId of this.sessions.keys()) {
      this.stopSession(sessionId);
    }
    
    this.sessions.clear();
    this.timers.clear();
    this.warningTimers.clear();
  }
}

export default new CallSessionManager();
