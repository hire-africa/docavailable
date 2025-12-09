import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Safe Permission Manager - A simplified, crash-resistant permission handler
 * Designed to prevent app crashes during permission requests
 */
class SafePermissionManager {
  private readonly FIRST_LAUNCH_KEY = '@DocAvailable:safe_first_launch';
  private isInitializing = false;

  /**
   * Check if this is the first app launch
   */
  async isFirstLaunch(): Promise<boolean> {
    try {
      const hasLaunched = await AsyncStorage.getItem(this.FIRST_LAUNCH_KEY);
      return hasLaunched === null;
    } catch (error) {
      console.warn('⚠️ [SafePermissions] Error checking first launch:', error);
      return false;
    }
  }

  /**
   * Mark first launch as complete
   */
  async markFirstLaunchComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FIRST_LAUNCH_KEY, 'true');
    } catch (error) {
      console.warn('⚠️ [SafePermissions] Error marking first launch complete:', error);
    }
  }

  /**
   * Request essential permissions only (crash-resistant)
   * NOTE: This method now only checks permissions without requesting them to prevent modals
   */
  async requestEssentialPermissions(): Promise<{
    success: boolean;
    granted: string[];
    denied: string[];
    message: string;
  }> {
    if (this.isInitializing) {
      console.log('🔄 [SafePermissions] Already initializing, skipping...');
      return { success: true, granted: [], denied: [], message: 'Already initializing' };
    }

    this.isInitializing = true;
    const granted: string[] = [];
    const denied: string[] = [];

    try {
      console.log('🚀 [SafePermissions] Checking essential permissions (no requests to prevent modals)...');

      // 1. Check notification permissions (don't request automatically)
      try {
        const hasNotifications = await this.checkNotificationPermissions();
        if (hasNotifications) {
          granted.push('Notifications');
        } else {
          denied.push('Notifications');
        }
      } catch (notifError) {
        console.warn('⚠️ [SafePermissions] Notification permission check failed:', notifError);
        denied.push('Notifications');
      }

      // 2. Check camera permissions (don't request automatically)
      if (Platform.OS === 'android') {
        try {
          const hasCamera = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CAMERA
          );
          if (hasCamera) {
            granted.push('Camera');
          } else {
            denied.push('Camera');
          }
        } catch (cameraError) {
          console.warn('⚠️ [SafePermissions] Camera permission check failed:', cameraError);
          denied.push('Camera');
        }
      }

      // 3. Check microphone permissions (don't request automatically)
      if (Platform.OS === 'android') {
        try {
          const hasMicrophone = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          if (hasMicrophone) {
            granted.push('Microphone');
          } else {
            denied.push('Microphone');
          }
        } catch (micError) {
          console.warn('⚠️ [SafePermissions] Microphone permission check failed:', micError);
          denied.push('Microphone');
        }
      }

      // Skip phone permissions check since we removed CALL_PHONE permission

      const success = denied.length === 0;
      const message = `✅ Granted: ${granted.length}, ❌ Denied: ${denied.length}`;

      console.log(`📊 [SafePermissions] Results: ${message}`);

      // Mark first launch complete if successful
      if (success) {
        await this.markFirstLaunchComplete();
      }

      return { success, granted, denied, message };

    } catch (error) {
      console.error('❌ [SafePermissions] Critical error during permission request:', error);
      return {
        success: false,
        granted,
        denied,
        message: `Error: ${error}`
      };
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check notification permissions without requesting them
   */
  private async checkNotificationPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android 13+ requires explicit notification permission
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return hasPermission;
      } else {
        // iOS - check notification settings
        const notificationSettings = await Notifications.getPermissionsAsync();
        return notificationSettings.status === 'granted';
      }
    } catch (error) {
      console.warn('⚠️ [SafePermissions] Notification permission check error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions safely
   */
  private async requestNotificationPermissions(): Promise<{ granted: boolean }> {
    try {
      if (Platform.OS === 'android') {
        // Android 13+ requires explicit notification permission
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (!hasPermission) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return { granted: result === PermissionsAndroid.RESULTS.GRANTED };
        }
        
        return { granted: true };
      } else {
        // iOS
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: false,
          },
        });
        
        return { granted: status === 'granted' };
      }
    } catch (error) {
      console.warn('⚠️ [SafePermissions] Notification permission error:', error);
      return { granted: false };
    }
  }

  /**
   * Check critical permissions status
   */
  async checkCriticalPermissions(): Promise<{
    canReceiveCalls: boolean;
    canAccessCamera: boolean;
    canAccessMicrophone: boolean;
    missingCritical: string[];
  }> {
    const missing: string[] = [];
    let canReceiveCalls = true;
    let canAccessCamera = true;
    let canAccessMicrophone = true;

    try {
      // Check notification permission
      if (Platform.OS === 'android') {
        const hasNotifications = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!hasNotifications) {
          canReceiveCalls = false;
          missing.push('Notifications');
        }

        // Check camera permission
        const hasCamera = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (!hasCamera) {
          canAccessCamera = false;
          missing.push('Camera');
        }

        // Check microphone permission
        const hasMicrophone = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (!hasMicrophone) {
          canAccessMicrophone = false;
          missing.push('Microphone');
        }
      } else {
        // iOS - check notification settings
        const notificationSettings = await Notifications.getPermissionsAsync();
        if (notificationSettings.status !== 'granted') {
          canReceiveCalls = false;
          missing.push('Notifications');
        }

        // iOS camera/microphone permissions are checked when needed
      }

    } catch (error) {
      console.warn('⚠️ [SafePermissions] Error checking permissions:', error);
    }

    return {
      canReceiveCalls,
      canAccessCamera,
      canAccessMicrophone,
      missingCritical: missing
    };
  }

  /**
   * Request specific permission safely
   */
  async requestSpecificPermission(permission: 'camera' | 'microphone' | 'notifications'): Promise<boolean> {
    try {
      switch (permission) {
        case 'camera':
          if (Platform.OS === 'android') {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA
            );
            return result === PermissionsAndroid.RESULTS.GRANTED;
          } else {
            const result = await ImagePicker.requestCameraPermissionsAsync();
            return result.status === 'granted';
          }

        case 'microphone':
          if (Platform.OS === 'android') {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            return result === PermissionsAndroid.RESULTS.GRANTED;
          }
          return true; // iOS handles automatically

        case 'notifications':
          const result = await this.requestNotificationPermissions();
          return result.granted;

        default:
          return false;
      }
    } catch (error) {
      console.warn(`⚠️ [SafePermissions] Error requesting ${permission} permission:`, error);
      return false;
    }
  }

  /**
   * Show user-friendly permission guide
   */
  async showPermissionGuide(missingPermissions: string[]): Promise<void> {
    if (missingPermissions.length === 0) return;

    const message = `DocAvailable needs the following permissions to work properly:

${missingPermissions.map(p => `• ${p}`).join('\n')}

Please grant these permissions in your device settings to ensure you can receive calls and use all features.`;

    Alert.alert(
      '🏥 Permissions Required',
      message,
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            // Note: Linking.openSettings() would be imported if needed
            console.log('📱 [SafePermissions] User requested to open settings');
          },
        },
      ]
    );
  }
}

export default new SafePermissionManager();
