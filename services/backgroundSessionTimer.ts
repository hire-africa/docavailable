import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';
import sessionTimerNotifier from './sessionTimerNotifier';

export interface SessionTimerState {
  sessionId: string;
  startTime: string;
  lastUpdateTime: string;
  sessionsDeducted: number;
  isActive: boolean;
}

export interface SessionTimerEvents {
  onDeductionTriggered: (sessionId: string, deductions: number) => void;
  onTimerUpdate: (sessionId: string, elapsedMinutes: number, nextDeductionIn: number) => void;
  onSessionEnded: (sessionId: string) => void;
}

class BackgroundSessionTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private states: Map<string, SessionTimerState> = new Map();
  private events: SessionTimerEvents | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load persisted timer states from storage
      await this.loadPersistedStates();
      this.isInitialized = true;
      console.log('🕐 [BackgroundTimer] Initialized with persisted states');
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to initialize:', error);
    }
  }

  private async loadPersistedStates() {
    try {
      const storedStates = await AsyncStorage.getItem('background_session_timers');
      if (storedStates) {
        const states = JSON.parse(storedStates);
        for (const [sessionId, state] of Object.entries(states)) {
          this.states.set(sessionId, state as SessionTimerState);
          
          // Restart timer if session was active
          if (state.isActive) {
            this.startTimer(sessionId, new Date(state.startTime));
          }
        }
        console.log('🕐 [BackgroundTimer] Loaded persisted states:', Array.from(this.states.keys()));
      }
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to load persisted states:', error);
    }
  }

  private async persistStates() {
    try {
      const statesObject = Object.fromEntries(this.states);
      await AsyncStorage.setItem('background_session_timers', JSON.stringify(statesObject));
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to persist states:', error);
    }
  }

  setEvents(events: SessionTimerEvents) {
    this.events = events;
  }

  async startSessionTimer(sessionId: string, startTime: Date = new Date()) {
    console.log('🕐 [BackgroundTimer] Starting timer for session:', sessionId, 'at:', startTime.toISOString());
    
    // Stop existing timer if any
    this.stopSessionTimer(sessionId);
    
    // Create timer state
    const state: SessionTimerState = {
      sessionId,
      startTime: startTime.toISOString(),
      lastUpdateTime: startTime.toISOString(),
      sessionsDeducted: 0,
      isActive: true
    };
    
    this.states.set(sessionId, state);
    await this.persistStates();
    
    console.log('🕐 [BackgroundTimer] Timer state created and persisted:', state);
    
    // Start the timer
    this.startTimer(sessionId, startTime);
  }

  private startTimer(sessionId: string, startTime: Date) {
    const timer = setInterval(async () => {
      await this.processTimerTick(sessionId);
    }, 10000); // Check every 10 seconds for more accurate timing
    
    this.timers.set(sessionId, timer);
    console.log('🕐 [BackgroundTimer] Timer started for session:', sessionId);
  }

  private async processTimerTick(sessionId: string) {
    console.log('🕐 [BackgroundTimer] Processing timer tick for session:', sessionId);
    
    const state = this.states.get(sessionId);
    if (!state || !state.isActive) {
      console.log('🕐 [BackgroundTimer] Timer tick skipped - session not active:', sessionId, 'state:', state);
      return;
    }

    // Verify session is still active on the backend before processing deductions
    try {
      const sessionResponse = await apiService.get(`/text-sessions/${sessionId}`);
      if (sessionResponse.data && (sessionResponse.data as any).success) {
        const sessionData = (sessionResponse.data as any).data;
        if (sessionData.status !== 'active') {
          console.log('🕐 [BackgroundTimer] Session no longer active on backend, stopping timer:', sessionId, 'status:', sessionData.status);
          this.endSessionTimer(sessionId);
          return;
        }
      } else {
        console.log('🕐 [BackgroundTimer] Failed to verify session status, stopping timer:', sessionId);
        this.endSessionTimer(sessionId);
        return;
      }
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to verify session status:', error);
      // Don't stop the timer on network errors, just skip this tick
      return;
    }

    const now = new Date();
    const startTime = new Date(state.startTime);
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    
    // Calculate deductions and next deduction time
    const deductions = Math.floor(elapsedMinutes / 10);
    const nextDeductionMinute = Math.ceil(elapsedMinutes / 10) * 10;
    const minutesUntilNextDeduction = Math.max(0, nextDeductionMinute - elapsedMinutes);
    
    // Check if we've hit a 10-minute mark and need to trigger deduction
    const previousDeductions = Math.floor((elapsedMinutes - 1) / 10);
    const currentDeductions = Math.floor(elapsedMinutes / 10);
    
    // More precise check: trigger deduction exactly at 10, 20, 30, etc. minutes
    const shouldTriggerDeduction = currentDeductions > previousDeductions && elapsedMinutes >= 10;
    
    console.log('🕐 [BackgroundTimer] Timer tick:', {
      sessionId,
      elapsedMinutes,
      previousDeductions,
      currentDeductions,
      shouldTrigger: shouldTriggerDeduction,
      startTime: startTime.toISOString(),
      now: now.toISOString()
    });
    
    if (shouldTriggerDeduction) {
      const deductionsToProcess = currentDeductions - state.sessionsDeducted;
      
      console.log('💰 [BackgroundTimer] 10-minute mark reached, triggering backend deduction:', {
        sessionId,
        elapsedMinutes,
        previousDeductions,
        currentDeductions,
        deductionsToProcess,
        alreadyDeducted: state.sessionsDeducted
      });
      
      if (deductionsToProcess > 0) {
        console.log('💰 [BackgroundTimer] Processing deduction - calling backend API');
        
        // Trigger backend auto-deduction
        await this.triggerAutoDeduction(sessionId, deductionsToProcess);
        
        // Update state
        state.sessionsDeducted = currentDeductions;
        state.lastUpdateTime = now.toISOString();
        await this.persistStates();
        
        // Notify listeners
        this.events?.onDeductionTriggered(sessionId, deductionsToProcess);
        
        // Notify UI via event emitter
        sessionTimerNotifier.notifyDeduction({
          sessionId,
          deductions: deductionsToProcess,
          totalDeductions: currentDeductions
        });
      } else {
        console.log('💰 [BackgroundTimer] No new deductions to process:', {
          deductionsToProcess,
          currentDeductions,
          alreadyDeducted: state.sessionsDeducted
        });
      }
    }
    
    // Update last update time
    state.lastUpdateTime = now.toISOString();
    await this.persistStates();
    
    // Notify listeners of timer update
    this.events?.onTimerUpdate(sessionId, elapsedMinutes, minutesUntilNextDeduction);
    
    // Notify UI via event emitter
    sessionTimerNotifier.notifyTimerUpdate({
      sessionId,
      elapsedMinutes,
      nextDeductionIn: minutesUntilNextDeduction,
      sessionsDeducted: state.sessionsDeducted,
      remainingSessions: 0 // This will be updated by the UI when it fetches session status
    });
  }

  private async triggerAutoDeduction(sessionId: string, deductions: number) {
    try {
      console.log('💰 [BackgroundTimer] Triggering auto-deduction for session:', sessionId, 'deductions:', deductions);
      
      const requestData = {
        triggered_by: 'background_timer',
        deductions_requested: deductions
      };
      
      console.log('💰 [BackgroundTimer] Sending deduction request:', requestData);
      
      const response = await apiService.post(`/text-sessions/${sessionId}/auto-deduction`, requestData);
      
      console.log('💰 [BackgroundTimer] Auto-deduction API response:', {
        status: response.status,
        data: response.data
      });
      
      if ((response.data as any)?.success) {
        const deductionData = (response.data as any).data;
        console.log('✅ [BackgroundTimer] Auto-deduction processed successfully:', deductionData);
        
        if (deductionData.deductions_processed > 0) {
          console.log(`🔔 [BackgroundTimer] ${deductionData.deductions_processed} session(s) deducted via backend`);
        } else {
          console.warn('⚠️ [BackgroundTimer] No deductions were processed by backend');
        }
      } else {
        console.warn('⚠️ [BackgroundTimer] Auto-deduction response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to trigger auto-deduction:', {
        sessionId,
        deductions,
        error: error.message,
        stack: error.stack
      });
    }
  }

  stopSessionTimer(sessionId: string) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
      console.log('🕐 [BackgroundTimer] Timer stopped for session:', sessionId);
    }
    
    // Mark as inactive but keep state for reference
    const state = this.states.get(sessionId);
    if (state) {
      state.isActive = false;
      this.persistStates();
    }
  }

  endSessionTimer(sessionId: string) {
    this.stopSessionTimer(sessionId);
    this.states.delete(sessionId);
    this.persistStates();
    this.events?.onSessionEnded(sessionId);
    console.log('🕐 [BackgroundTimer] Session timer ended and cleaned up:', sessionId);
  }

  getSessionState(sessionId: string): SessionTimerState | null {
    return this.states.get(sessionId) || null;
  }

  getAllActiveSessions(): SessionTimerState[] {
    return Array.from(this.states.values()).filter(state => state.isActive);
  }

  // Clean up old inactive sessions (older than 24 hours)
  async cleanupOldSessions() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    for (const [sessionId, state] of this.states.entries()) {
      const lastUpdate = new Date(state.lastUpdateTime);
      if (!state.isActive && lastUpdate < oneDayAgo) {
        this.states.delete(sessionId);
        console.log('🧹 [BackgroundTimer] Cleaned up old session:', sessionId);
      }
    }
    
    await this.persistStates();
  }

  // Clean up ended sessions by checking their status on the backend
  async cleanupEndedSessions() {
    console.log('🧹 [BackgroundTimer] Cleaning up ended sessions...');
    
    for (const [sessionId, state] of this.states.entries()) {
      try {
        const sessionResponse = await apiService.get(`/text-sessions/${sessionId}`);
        if (sessionResponse.data && (sessionResponse.data as any).success) {
          const sessionData = (sessionResponse.data as any).data;
          if (sessionData.status !== 'active') {
            console.log('🧹 [BackgroundTimer] Found ended session, cleaning up:', sessionId, 'status:', sessionData.status);
            this.endSessionTimer(sessionId);
          }
        }
      } catch (error) {
        console.error('❌ [BackgroundTimer] Failed to check session status during cleanup:', sessionId, error);
        // If we can't check the status, assume it's ended and clean it up
        this.endSessionTimer(sessionId);
      }
    }
  }
}

// Export singleton instance
export default new BackgroundSessionTimer();
