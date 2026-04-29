import { AppState, AppStateStatus } from 'react-native';
import { apiService } from './apiService';
import authService from './authService';

class HeartbeatService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private appStateSub: any | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.sendHeartbeat().catch(() => { });

    const onAppStateChange = (state: AppStateStatus) => {
      if (!this.isRunning) return;
      if (state === 'active') {
        this.ensureInterval();
        this.sendHeartbeat().catch(() => { });
      } else {
        this.clearInterval();
      }
    };

    this.appStateSub = AppState.addEventListener('change', onAppStateChange);

    // Start immediately if app is active
    if (AppState.currentState === 'active') {
      this.ensureInterval();
      this.sendHeartbeat().catch(() => { });
    }
  }

  stop() {
    this.isRunning = false;
    this.clearInterval();
    this.appStateSub?.remove?.();
    this.appStateSub = null;
  }

  private ensureInterval() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.sendHeartbeat().catch(() => { });
    }, 30 * 1000);
  }

  private clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async sendHeartbeat() {
    try {
      const token = await authService.getStoredToken();
      if (!token) return;

      // Only doctors should heartbeat
      const current = authService.getCurrentUserSync?.();
      const userType = current?.user_type;
      if (userType !== 'doctor') return;

      await apiService.post('/doctors/heartbeat', {});
    } catch {
      // ignore
    }
  }
}

export const heartbeatService = new HeartbeatService();
