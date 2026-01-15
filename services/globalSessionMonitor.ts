import { apiService } from '../app/services/apiService';
import backgroundSessionTimer, { SessionTimerEvents } from './backgroundSessionTimer';

export interface ActiveSession {
  id: string;
  patient_id: number;
  doctor_id: number;
  status: string;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}

class GlobalSessionMonitor {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // Check every 30 seconds to reduce load
  private monitoredSessions = new Set<string>();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isRunning) return;

    console.log('🌍 [GlobalSessionMonitor] Initializing global session monitor');
    this.isRunning = true;

    // Set up background timer events
    const timerEvents: SessionTimerEvents = {
      onDeductionTriggered: (sessionId, deductions) => {
        console.log('💰 [GlobalSessionMonitor] Deduction triggered for session:', sessionId, 'deductions:', deductions);
      },
      onTimerUpdate: (sessionId, elapsedMinutes, nextDeductionIn) => {
        // Reduced logging for timer updates to keep logs clean
      },
      onSessionEnded: (sessionId) => {
        console.log('🕐 [GlobalSessionMonitor] Session ended:', sessionId);
        this.monitoredSessions.delete(sessionId);
      }
    };

    backgroundSessionTimer.setEvents(timerEvents);

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log('🌍 [GlobalSessionMonitor] Starting session monitoring');

    this.checkInterval = setInterval(async () => {
      await this.checkActiveSessions();
    }, this.CHECK_INTERVAL);

    // Initial check after a short delay
    setTimeout(() => this.checkActiveSessions(), 5000);
  }

  private async checkActiveSessions() {
    try {
      // Clean up any ended sessions from the background timer first
      if (backgroundSessionTimer.getAllActiveSessions().length > 0) {
        await backgroundSessionTimer.cleanupEndedSessions();
      }

      // Get all active text sessions - only if we have monitored sessions or every few ticks
      const shouldCheck = this.monitoredSessions.size > 0 || Math.random() < 0.2;
      if (!shouldCheck) return;

      const response = await apiService.get('/text-sessions/active');

      if ((response.data as any)?.success && (response.data as any)?.data) {
        const activeSessions = (response.data as any).data as ActiveSession[];

        console.log('🌍 [GlobalSessionMonitor] Found active sessions:', activeSessions.length);

        for (const session of activeSessions) {
          // Only monitor sessions that are active and have been activated
          if (session.status === 'active' && session.activated_at) {
            const sessionId = session.id.toString();

            // Check if we're already monitoring this session
            if (!this.monitoredSessions.has(sessionId)) {
              console.log('🌍 [GlobalSessionMonitor] Starting timer for new active session:', sessionId);

              // Start background timer for this session
              const activatedAt = new Date(session.activated_at);
              await backgroundSessionTimer.startSessionTimer(sessionId, activatedAt);

              this.monitoredSessions.add(sessionId);
            } else {
              // Session is already being monitored, check if timer is still active
              const existingState = backgroundSessionTimer.getSessionState(sessionId);
              if (!existingState || !existingState.isActive) {
                console.log('🌍 [GlobalSessionMonitor] Restarting timer for session:', sessionId);
                const activatedAt = new Date(session.activated_at);
                await backgroundSessionTimer.startSessionTimer(sessionId, activatedAt);
              }
            }
          } else if (session.status !== 'active') {
            // Session is no longer active, stop monitoring
            const sessionId = session.id.toString();
            if (this.monitoredSessions.has(sessionId)) {
              console.log('🌍 [GlobalSessionMonitor] Session no longer active, stopping timer:', sessionId);
              backgroundSessionTimer.endSessionTimer(sessionId);
              this.monitoredSessions.delete(sessionId);
            }
          }
        }

        // Clean up any sessions we're monitoring that are no longer in the active list
        const activeSessionIds = new Set(activeSessions.map(s => s.id.toString()));
        for (const monitoredSessionId of this.monitoredSessions) {
          if (!activeSessionIds.has(monitoredSessionId)) {
            console.log('🌍 [GlobalSessionMonitor] Cleaning up inactive session:', monitoredSessionId);
            backgroundSessionTimer.endSessionTimer(monitoredSessionId);
            this.monitoredSessions.delete(monitoredSessionId);
          }
        }
      }
    } catch (error) {
      console.error('❌ [GlobalSessionMonitor] Error checking active sessions:', error);
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🌍 [GlobalSessionMonitor] Stopped monitoring');
  }

  getMonitoredSessions(): string[] {
    return Array.from(this.monitoredSessions);
  }

  isSessionMonitored(sessionId: string): boolean {
    return this.monitoredSessions.has(sessionId);
  }
}

// Export singleton instance
export default new GlobalSessionMonitor();
