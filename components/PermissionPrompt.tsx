import { Alert, Linking } from 'react-native';
import comprehensivePermissionManager from '../services/comprehensivePermissionManager';

interface PermissionPromptProps {
  feature: 'camera' | 'location' | 'contacts' | 'calls' | 'system';
  onPermissionResult?: (granted: boolean) => void;
}

class PermissionPrompt {
  /**
   * Show permission prompt for camera access
   */
  static async requestCameraPermission(onResult?: (granted: boolean) => void): Promise<boolean> {
    try {
      const granted = await comprehensivePermissionManager.promptForFeaturePermissions('camera');
      
      if (!granted) {
        Alert.alert(
          '📷 Camera Permission Required',
          'DocAvailable needs camera access to take photos for consultations and profile pictures.\n\nWould you like to enable it in Settings?',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
      
      onResult?.(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      onResult?.(false);
      return false;
    }
  }

  /**
   * Show permission prompt for location access
   */
  static async requestLocationPermission(onResult?: (granted: boolean) => void): Promise<boolean> {
    try {
      const granted = await comprehensivePermissionManager.promptForFeaturePermissions('location');
      
      if (!granted) {
        Alert.alert(
          '📍 Location Permission Required',
          'DocAvailable needs location access to find nearby doctors and emergency services.\n\nWould you like to enable it in Settings?',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
      
      onResult?.(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      onResult?.(false);
      return false;
    }
  }

  /**
   * Show permission prompt for contacts access
   */
  static async requestContactsPermission(onResult?: (granted: boolean) => void): Promise<boolean> {
    try {
      const granted = await comprehensivePermissionManager.promptForFeaturePermissions('contacts');
      
      if (!granted) {
        Alert.alert(
          '👥 Contacts Permission Required',
          'DocAvailable needs contacts access to help you invite family members and emergency contacts.\n\nWould you like to enable it in Settings?',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
      
      onResult?.(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      onResult?.(false);
      return false;
    }
  }

  /**
   * Show permission prompt for call functionality
   */
  static async requestCallPermission(onResult?: (granted: boolean) => void): Promise<boolean> {
    try {
      const granted = await comprehensivePermissionManager.promptForFeaturePermissions('calls');
      
      if (!granted) {
        Alert.alert(
          '📞 Phone Permission Required',
          'DocAvailable needs phone permissions to make emergency calls and handle incoming medical consultations.\n\nWould you like to enable it in Settings?',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
      
      onResult?.(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting call permission:', error);
      onResult?.(false);
      return false;
    }
  }

  /**
   * Show critical system permissions setup guide
   */
  static async showSystemPermissionsGuide(): Promise<void> {
    const criticalCheck = await comprehensivePermissionManager.checkCriticalPermissions();
    
    if (criticalCheck.missingCritical.length === 0) {
      Alert.alert(
        '✅ All Permissions Granted',
        'Great! DocAvailable has all the permissions it needs to work properly.',
        [{ text: 'OK' }]
      );
      return;
    }

    const missingList = criticalCheck.missingCritical.join(', ');
    
    Alert.alert(
      '⚙️ System Permissions Setup',
      `DocAvailable needs additional system permissions to work reliably:\n\n• ${criticalCheck.missingCritical.join('\n• ')}\n\nThese permissions ensure you receive incoming calls even when your phone is locked or the app is in the background.\n\nWould you like to open Settings to complete the setup?`,
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => Linking.openSettings() 
        }
      ]
    );
  }

  /**
   * Check if all critical permissions are granted
   */
  static async checkAllPermissions(): Promise<{
    allGranted: boolean;
    canReceiveCalls: boolean;
    canSendNotifications: boolean;
    canAccessMedia: boolean;
    missingCritical: string[];
  }> {
    const result = await comprehensivePermissionManager.checkCriticalPermissions();
    
    return {
      allGranted: result.missingCritical.length === 0,
      canReceiveCalls: result.canReceiveCalls,
      canSendNotifications: result.canSendNotifications,
      canAccessMedia: result.canAccessMedia,
      missingCritical: result.missingCritical
    };
  }

  /**
   * Show a comprehensive permission status dialog
   */
  static async showPermissionStatus(): Promise<void> {
    const status = await this.checkAllPermissions();
    
    let message = '';
    let title = '';
    
    if (status.allGranted) {
      title = '✅ All Permissions Granted';
      message = 'DocAvailable has all the permissions it needs!\n\n• Incoming calls: ✅\n• Notifications: ✅\n• Camera & Photos: ✅';
    } else {
      title = '⚠️ Some Permissions Missing';
      message = `DocAvailable needs additional permissions:\n\n• Incoming calls: ${status.canReceiveCalls ? '✅' : '❌'}\n• Notifications: ${status.canSendNotifications ? '✅' : '❌'}\n• Camera & Photos: ${status.canAccessMedia ? '✅' : '❌'}\n\nMissing: ${status.missingCritical.join(', ')}`;
    }
    
    Alert.alert(
      title,
      message,
      status.allGranted 
        ? [{ text: 'OK' }]
        : [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Fix Now', 
              onPress: () => Linking.openSettings() 
            }
          ]
    );
  }

  /**
   * Request permissions for a specific feature with user-friendly prompts
   */
  static async requestFeaturePermissions(
    feature: 'camera' | 'location' | 'contacts' | 'calls' | 'system',
    onResult?: (granted: boolean) => void
  ): Promise<boolean> {
    switch (feature) {
      case 'camera':
        return this.requestCameraPermission(onResult);
      case 'location':
        return this.requestLocationPermission(onResult);
      case 'contacts':
        return this.requestContactsPermission(onResult);
      case 'calls':
        return this.requestCallPermission(onResult);
      case 'system':
        await this.showSystemPermissionsGuide();
        onResult?.(false); // System permissions require manual setup
        return false;
      default:
        onResult?.(false);
        return false;
    }
  }
}

export default PermissionPrompt;
