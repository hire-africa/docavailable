import { NativeModules, Platform } from 'react-native';

interface LockScreenModule {
  showOverLockScreen(): Promise<void>;
  dismissFromLockScreen(): Promise<void>;
}

class LockScreenService {
  private static instance: LockScreenService;
  private lockScreenModule: LockScreenModule | null = null;

  private constructor() {
    // Try to get the native module if available
    try {
      this.lockScreenModule = NativeModules.LockScreenModule;
    } catch (error) {
      console.warn('LockScreenModule not available:', error);
    }
  }

  public static getInstance(): LockScreenService {
    if (!LockScreenService.instance) {
      LockScreenService.instance = new LockScreenService();
    }
    return LockScreenService.instance;
  }

  /**
   * Show the app over the lock screen for incoming calls
   */
  public async showOverLockScreen(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      if (this.lockScreenModule) {
        await this.lockScreenModule.showOverLockScreen();
        console.log('🔓 [LockScreen] App shown over lock screen');
      } else {
        console.warn('⚠️ [LockScreen] Native module not available, using fallback');
        // Fallback: Use React Native's built-in methods
        await this.fallbackShowOverLockScreen();
      }
    } catch (error) {
      console.error('❌ [LockScreen] Failed to show over lock screen:', error);
    }
  }

  /**
   * Dismiss from lock screen when call ends
   */
  public async dismissFromLockScreen(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      if (this.lockScreenModule) {
        await this.lockScreenModule.dismissFromLockScreen();
        console.log('🔒 [LockScreen] App dismissed from lock screen');
      }
    } catch (error) {
      console.error('❌ [LockScreen] Failed to dismiss from lock screen:', error);
    }
  }

  /**
   * Fallback method using React Native APIs
   */
  private async fallbackShowOverLockScreen(): Promise<void> {
    // This is a placeholder for React Native-based solutions
    // In practice, we'd need to use libraries like react-native-keep-awake
    // or implement custom solutions
    console.log('🔄 [LockScreen] Using fallback method');
  }

  /**
   * Check if the device is likely locked
   */
  public isDeviceLocked(): boolean {
    // This is a heuristic - in a real implementation, you'd use native APIs
    // For now, we assume if we're in background and get a call, device might be locked
    return true;
  }
}

export default LockScreenService;
