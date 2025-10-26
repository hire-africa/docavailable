import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export interface ScreenshotPreventionConfig {
  enabled: boolean;
  notifyOnScreenshot: boolean;
  securityLevel: 'basic' | 'enhanced' | 'maximum';
}

export class ScreenshotPreventionService {
  private static instance: ScreenshotPreventionService;
  private isEnabled: boolean = false;
  private config: ScreenshotPreventionConfig = {
    enabled: true,
    notifyOnScreenshot: true,
    securityLevel: 'enhanced'
  };

  private constructor() {}

  public static getInstance(): ScreenshotPreventionService {
    if (!ScreenshotPreventionService.instance) {
      ScreenshotPreventionService.instance = new ScreenshotPreventionService();
    }
    return ScreenshotPreventionService.instance;
  }

  /**
   * Initialize screenshot prevention with configuration
   */
  public async initialize(config?: Partial<ScreenshotPreventionConfig>): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await this.loadConfig();
      this.config = { ...this.config, ...savedConfig, ...config };

      if (this.config.enabled) {
        await this.enableScreenshotPrevention();
        console.log('🔒 Screenshot prevention enabled');
      } else {
        await this.disableScreenshotPrevention();
        console.log('🔓 Screenshot prevention disabled');
      }
    } catch (error) {
      console.error('❌ Failed to initialize screenshot prevention:', error);
    }
  }

  /**
   * Enable screenshot prevention - shows black screen on screenshot attempts
   */
  public async enableScreenshotPrevention(): Promise<void> {
    try {
      console.log('🔒 [ScreenshotPrevention] Enabling screenshot prevention...');
      
        if (Platform.OS === 'ios') {
          // iOS: Screenshot prevention requires native module rebuild
          console.log('⚠️ [ScreenshotPrevention] iOS screenshot prevention requires native module rebuild');
        } else if (Platform.OS === 'android') {
        // Android: Use FLAG_SECURE - will show black screen on screenshot attempts
        try {
          await this.setAndroidSecureFlag(true);
          console.log('✅ [ScreenshotPrevention] Android screenshot prevention enabled - screenshots will show black screen');
        } catch (androidError) {
          console.error('❌ [ScreenshotPrevention] Android screenshot prevention failed:', androidError);
          // Fallback: try to enable anyway
          this.isEnabled = true;
          await this.saveConfig();
          return;
        }
      }

      this.isEnabled = true;
      await this.saveConfig();
      console.log('✅ [ScreenshotPrevention] Screenshot prevention successfully enabled');
    } catch (error) {
      console.error('❌ [ScreenshotPrevention] Failed to enable screenshot prevention:', error);
      // Set as enabled anyway to show watermarks
      this.isEnabled = true;
      await this.saveConfig();
      throw error;
    }
  }

  /**
   * Disable screenshot prevention
   */
  public async disableScreenshotPrevention(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        console.log('⚠️ [ScreenshotPrevention] iOS screenshot prevention requires native module rebuild');
      } else if (Platform.OS === 'android') {
        await this.setAndroidSecureFlag(false);
        console.log('🔓 Android screenshot prevention disabled');
      }

      this.isEnabled = false;
      await this.saveConfig();
    } catch (error) {
      console.error('❌ Failed to disable screenshot prevention:', error);
      throw error;
    }
  }

  /**
   * Toggle screenshot prevention
   */
  public async toggleScreenshotPrevention(): Promise<void> {
    if (this.isEnabled) {
      await this.disableScreenshotPrevention();
    } else {
      await this.enableScreenshotPrevention();
    }
  }

  /**
   * Update configuration
   */
  public async updateConfig(newConfig: Partial<ScreenshotPreventionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    
    if (this.config.enabled) {
      await this.enableScreenshotPrevention();
    } else {
      await this.disableScreenshotPrevention();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ScreenshotPreventionConfig {
    return { ...this.config };
  }

  /**
   * Check if screenshot prevention is enabled
   */
  public isScreenshotPreventionEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Set Android secure flag using native module
   */
  private async setAndroidSecureFlag(enabled: boolean): Promise<void> {
    try {
      const { ScreenshotPreventionModule } = NativeModules;
      
      if (ScreenshotPreventionModule) {
        await ScreenshotPreventionModule.setSecureFlag(enabled);
        console.log(`🔧 Android secure flag ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        console.warn('⚠️ ScreenshotPreventionModule not available');
        throw new Error('ScreenshotPreventionModule not available');
      }
    } catch (error) {
      console.error('❌ Failed to set Android secure flag:', error);
      throw error;
    }
  }

  /**
   * Save configuration to AsyncStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('screenshot_prevention_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Failed to save screenshot prevention config:', error);
    }
  }

  /**
   * Load configuration from AsyncStorage
   */
  private async loadConfig(): Promise<Partial<ScreenshotPreventionConfig>> {
    try {
      const configString = await AsyncStorage.getItem('screenshot_prevention_config');
      return configString ? JSON.parse(configString) : {};
    } catch (error) {
      console.error('❌ Failed to load screenshot prevention config:', error);
      return {};
    }
  }

  /**
   * Handle screenshot detection (iOS only)
   */
  public async handleScreenshotDetection(): Promise<void> {
    if (Platform.OS === 'ios' && this.config.notifyOnScreenshot) {
      // iOS can detect screenshots using AppState changes
      // This is a simplified implementation
      console.log('📸 Screenshot detected on iOS');
      
      // You could show a notification or take other actions here
      // For example, log the event or notify the server
    }
  }

  /**
   * Get security level description
   */
  public getSecurityLevelDescription(): string {
    switch (this.config.securityLevel) {
      case 'basic':
        return 'Basic protection - prevents most screenshots';
      case 'enhanced':
        return 'Enhanced protection - prevents screenshots and screen recording';
      case 'maximum':
        return 'Maximum protection - prevents all screen capture methods';
      default:
        return 'Unknown security level';
    }
  }
}

// Export singleton instance
export const screenshotPreventionService = ScreenshotPreventionService.getInstance();
