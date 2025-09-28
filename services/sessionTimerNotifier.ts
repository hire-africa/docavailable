import { EventEmitter } from 'events';

export interface TimerUpdate {
  sessionId: string;
  elapsedMinutes: number;
  nextDeductionIn: number;
  sessionsDeducted: number;
  remainingSessions: number;
}

export interface DeductionUpdate {
  sessionId: string;
  deductions: number;
  totalDeductions: number;
}

class SessionTimerNotifier extends EventEmitter {
  private static instance: SessionTimerNotifier;

  private constructor() {
    super();
  }

  static getInstance(): SessionTimerNotifier {
    if (!SessionTimerNotifier.instance) {
      SessionTimerNotifier.instance = new SessionTimerNotifier();
    }
    return SessionTimerNotifier.instance;
  }

  // Notify UI of timer updates
  notifyTimerUpdate(update: TimerUpdate) {
    console.log('📡 [TimerNotifier] Broadcasting timer update:', update);
    this.emit('timerUpdate', update);
  }

  // Notify UI of deductions
  notifyDeduction(update: DeductionUpdate) {
    console.log('📡 [TimerNotifier] Broadcasting deduction update:', update);
    this.emit('deduction', update);
  }

  // Notify UI that a session has started
  notifySessionStarted(sessionId: string, startTime: Date) {
    console.log('📡 [TimerNotifier] Broadcasting session started:', { sessionId, startTime });
    this.emit('sessionStarted', { sessionId, startTime });
  }

  // Notify UI that a session has ended
  notifySessionEnded(sessionId: string) {
    console.log('📡 [TimerNotifier] Broadcasting session ended:', { sessionId });
    this.emit('sessionEnded', { sessionId });
  }
}

export default SessionTimerNotifier.getInstance();
