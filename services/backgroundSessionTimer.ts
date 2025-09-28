import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

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
    console.log('🕐 [BackgroundTimer] Starting timer for session:', sessionId);
    
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
    
    // Start the timer
    this.startTimer(sessionId, startTime);
  }

  private startTimer(sessionId: string, startTime: Date) {
    const timer = setInterval(async () => {
      await this.processTimerTick(sessionId);
    }, 30000); // Check every 30 seconds
    
    this.timers.set(sessionId, timer);
    console.log('🕐 [BackgroundTimer] Timer started for session:', sessionId);
  }

  private async processTimerTick(sessionId: string) {
    const state = this.states.get(sessionId);
    if (!state || !state.isActive) {
      console.log('🕐 [BackgroundTimer] Timer tick skipped - session not active:', sessionId);
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
    
    console.log('🕐 [BackgroundTimer] Timer tick:', {
      sessionId,
      elapsedMinutes,
      previousDeductions,
      currentDeductions,
      shouldTrigger: currentDeductions > previousDeductions && elapsedMinutes > 0
    });
    
    if (currentDeductions > previousDeductions && elapsedMinutes > 0) {
      console.log('💰 [BackgroundTimer] 10-minute mark reached, triggering backend deduction:', {
        sessionId,
        elapsedMinutes,
        previousDeductions,
        currentDeductions
      });
      
      // Trigger backend auto-deduction
      await this.triggerAutoDeduction(sessionId, currentDeductions);
      
      // Update state
      state.sessionsDeducted = currentDeductions;
      state.lastUpdateTime = now.toISOString();
      await this.persistStates();
      
      // Notify listeners
      this.events?.onDeductionTriggered(sessionId, currentDeductions);
    }
    
    // Update last update time
    state.lastUpdateTime = now.toISOString();
    await this.persistStates();
    
    // Notify listeners of timer update
    this.events?.onTimerUpdate(sessionId, elapsedMinutes, minutesUntilNextDeduction);
  }

  private async triggerAutoDeduction(sessionId: string, deductions: number) {
    try {
      console.log('💰 [BackgroundTimer] Triggering auto-deduction for session:', sessionId);
      const response = await apiService.post(`/text-sessions/${sessionId}/auto-deduction`, {
        triggered_by: 'background_timer'
      });
      
      console.log('💰 [BackgroundTimer] Auto-deduction API response:', response.data);
      
      if ((response.data as any)?.success) {
        const deductionData = (response.data as any).data;
        console.log('✅ [BackgroundTimer] Auto-deduction processed:', deductionData);
        
        if (deductionData.deductions_processed > 0) {
          console.log(`🔔 [BackgroundTimer] ${deductionData.deductions_processed} session(s) deducted via backend`);
        }
      } else {
        console.warn('⚠️ [BackgroundTimer] Auto-deduction response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ [BackgroundTimer] Failed to trigger auto-deduction:', error);
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
}

// Export singleton instance
export default new BackgroundSessionTimer();
