// Custom EventEmitter implementation for React Native
class CustomEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

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

class SessionTimerNotifier extends CustomEventEmitter {
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
