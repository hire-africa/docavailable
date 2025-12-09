import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Mock LocalAuthentication for now since it's not in dependencies
// In production, you would install expo-local-authentication
const MockLocalAuthentication = {
  hasHardwareAsync: async () => Platform.OS !== 'web',
  isEnrolledAsync: async () => true,
  authenticateAsync: async (options: any) => ({
    success: Math.random() > 0.3, // 70% success rate for demo
    error: 'User canceled authentication'
  }),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  }
};

export interface BiometricConfig {
  enabled: boolean;
  lastUsed: number;
  failureCount: number;
  maxFailures: number;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  fallbackToPassword?: boolean;
}

export class BiometricAuth {
  private static readonly STORAGE_KEY = 'biometric_config';
  private static readonly MAX_FAILURES = 3;
  private static readonly LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if biometric authentication is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false; // Biometrics not available on web
      }

      const hasHardware = await MockLocalAuthentication.hasHardwareAsync();
      const isEnrolled = await MockLocalAuthentication.isEnrolledAsync();
      
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('BiometricAuth: Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get biometric configuration
   */
  static async getConfig(): Promise<BiometricConfig> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('BiometricAuth: Error getting config:', error);
    }

    return {
      enabled: false,
      lastUsed: 0,
      failureCount: 0,
      maxFailures: this.MAX_FAILURES
    };
  }

  /**
   * Save biometric configuration
   */
  static async saveConfig(config: BiometricConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('BiometricAuth: Error saving config:', error);
    }
  }

  /**
   * Enable biometric authentication
   */
  static async enable(): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or it is not set up.'
        );
        return false;
      }

      // Test biometric authentication
      const result = await this.authenticate('Enable biometric login for faster access');
      
      if (result.success) {
        const config: BiometricConfig = {
          enabled: true,
          lastUsed: Date.now(),
          failureCount: 0,
          maxFailures: this.MAX_FAILURES
        };
        
        await this.saveConfig(config);
        return true;
      }

      return false;
    } catch (error) {
      console.error('BiometricAuth: Error enabling:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disable(): Promise<void> {
    try {
      const config = await this.getConfig();
      config.enabled = false;
      await this.saveConfig(config);
    } catch (error) {
      console.error('BiometricAuth: Error disabling:', error);
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      return config.enabled && await this.isAvailable();
    } catch (error) {
      console.error('BiometricAuth: Error checking if enabled:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is locked out due to failures
   */
  static async isLockedOut(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      if (config.failureCount >= config.maxFailures) {
        const timeSinceLastFailure = Date.now() - config.lastUsed;
        return timeSinceLastFailure < this.LOCKOUT_DURATION;
      }
      
      return false;
    } catch (error) {
      console.error('BiometricAuth: Error checking lockout:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics
   */
  static async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<BiometricAuthResult> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available',
          fallbackToPassword: true
        };
      }

      const isLockedOut = await this.isLockedOut();
      if (isLockedOut) {
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later or use your password.',
          fallbackToPassword: true
        };
      }

      const result = await MockLocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Use Password',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      const config = await this.getConfig();

      if (result.success) {
        // Reset failure count on success
        config.failureCount = 0;
        config.lastUsed = Date.now();
        await this.saveConfig(config);

        return { success: true };
      } else {
        // Increment failure count
        config.failureCount += 1;
        config.lastUsed = Date.now();
        await this.saveConfig(config);

        const error = result.error || 'Biometric authentication failed';
        
        // Check if user should be locked out
        if (config.failureCount >= config.maxFailures) {
          return {
            success: false,
            error: 'Too many failed attempts. Please use your password.',
            fallbackToPassword: true
          };
        }

        return {
          success: false,
          error,
          fallbackToPassword: error.includes('cancel') || error.includes('fallback')
        };
      }
    } catch (error: any) {
      console.error('BiometricAuth: Authentication error:', error);
      return {
        success: false,
        error: 'Biometric authentication failed',
        fallbackToPassword: true
      };
    }
  }

  /**
   * Show biometric setup prompt
   */
  static showSetupPrompt(onEnable: () => void, onSkip: () => void): void {
    Alert.alert(
      'Enable Biometric Login?',
      'Use your fingerprint or face to sign in quickly and securely.',
      [
        {
          text: 'Skip',
          style: 'cancel',
          onPress: onSkip
        },
        {
          text: 'Enable',
          onPress: onEnable
        }
      ]
    );
  }

  /**
   * Get time remaining in lockout
   */
  static async getLockoutTimeRemaining(): Promise<number> {
    try {
      const config = await this.getConfig();
      
      if (config.failureCount >= config.maxFailures) {
        const timeSinceLastFailure = Date.now() - config.lastUsed;
        const remaining = this.LOCKOUT_DURATION - timeSinceLastFailure;
        return Math.max(0, remaining);
      }
      
      return 0;
    } catch (error) {
      console.error('BiometricAuth: Error getting lockout time:', error);
      return 0;
    }
  }

  /**
   * Format lockout time for display
   */
  static formatLockoutTime(milliseconds: number): string {
    const minutes = Math.ceil(milliseconds / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  /**
   * Reset failure count (for admin use)
   */
  static async resetFailures(): Promise<void> {
    try {
      const config = await this.getConfig();
      config.failureCount = 0;
      await this.saveConfig(config);
    } catch (error) {
      console.error('BiometricAuth: Error resetting failures:', error);
    }
  }
}

export default BiometricAuth;
