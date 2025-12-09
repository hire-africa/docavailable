import { Platform, PermissionsAndroid, Linking, Alert, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

interface PermissionResult {
  success: boolean;
  granted: string[];
  denied: string[];
  needsManualSetup: string[];
  message: string;
}

class ComprehensivePermissionManager {
  private readonly PERMISSION_STORAGE_KEY = '@DocAvailable:permissions_requested';
  private readonly FIRST_LAUNCH_KEY = '@DocAvailable:first_launch_complete';

  /**
   * Check if this is the first app launch
   */
  async isFirstLaunch(): Promise<boolean> {
    try {
      const hasLaunched = await AsyncStorage.getItem(this.FIRST_LAUNCH_KEY);
      return hasLaunched === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
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
      console.error('Error marking first launch complete:', error);
    }
  }

  /**
   * Request all essential permissions on first launch
   */
  async requestAllPermissionsOnFirstLaunch(): Promise<PermissionResult> {
    const isFirst = await this.isFirstLaunch();
    
    if (!isFirst) {
      return {
        success: true,
        granted: [],
        denied: [],
        needsManualSetup: [],
        message: 'Not first launch, skipping comprehensive permission request'
      };
    }

    console.log('🚀 First app launch detected - requesting all permissions...');
    
    const result = await this.requestAllPermissions();
    
    if (result.success) {
      await this.markFirstLaunchComplete();
    }
    
    return result;
  }

  /**
   * Request all permissions needed for the telemedicine app
   */
  async requestAllPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];
    const needsManualSetup: string[] = [];

    try {
      // 1. Basic App Permissions
      console.log('📱 Requesting basic app permissions...');
      const basicResult = await this.requestBasicPermissions();
      granted.push(...basicResult.granted);
      denied.push(...basicResult.denied);

      // 2. Media Permissions (Camera, Microphone, Photos)
      console.log('📷 Requesting media permissions...');
      const mediaResult = await this.requestMediaPermissions();
      granted.push(...mediaResult.granted);
      denied.push(...mediaResult.denied);

      // 3. Communication Permissions (Phone, Contacts)
      console.log('📞 Requesting communication permissions...');
      const commResult = await this.requestCommunicationPermissions();
      granted.push(...commResult.granted);
      denied.push(...commResult.denied);

      // 4. Location & Calendar
      console.log('📍 Requesting location and calendar permissions...');
      const locationResult = await this.requestLocationAndCalendarPermissions();
      granted.push(...locationResult.granted);
      denied.push(...locationResult.denied);

      // 5. Advanced System Permissions (Android only)
      if (Platform.OS === 'android') {
        console.log('⚙️ Requesting advanced system permissions...');
        const advancedResult = await this.requestAdvancedSystemPermissions();
        granted.push(...advancedResult.granted);
        denied.push(...advancedResult.denied);
        needsManualSetup.push(...advancedResult.needsManualSetup);
      }

      // 6. Notification Permissions
      console.log('🔔 Setting up notifications...');
      const notifResult = await this.setupNotifications();
      granted.push(...notifResult.granted);
      denied.push(...notifResult.denied);
      needsManualSetup.push(...notifResult.needsManualSetup);

      const success = denied.length === 0 && needsManualSetup.length === 0;
      
      let message = `✅ Granted: ${granted.length} permissions`;
      if (denied.length > 0) {
        message += `\n❌ Denied: ${denied.length} permissions`;
      }
      if (needsManualSetup.length > 0) {
        message += `\n⚙️ Manual setup needed: ${needsManualSetup.length} permissions`;
      }

      // Show setup guide if needed
      if (needsManualSetup.length > 0) {
        await this.showManualSetupGuide(needsManualSetup);
      }

      return {
        success,
        granted,
        denied,
        needsManualSetup,
        message
      };

    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return {
        success: false,
        granted,
        denied,
        needsManualSetup,
        message: `Error: ${error}`
      };
    }
  }

  /**
   * Request basic app permissions
   */
  private async requestBasicPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];

    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.INTERNET,
          PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
          PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
          PermissionsAndroid.PERMISSIONS.WAKE_LOCK,
          PermissionsAndroid.PERMISSIONS.VIBRATE,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        Object.entries(results).forEach(([permission, result]) => {
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            granted.push(permission);
          } else {
            denied.push(permission);
          }
        });
      } catch (error) {
        console.error('Error requesting basic permissions:', error);
      }
    } else {
      // iOS doesn't need explicit requests for these
      granted.push('Basic iOS permissions');
    }

    return { success: denied.length === 0, granted, denied, needsManualSetup: [], message: '' };
  }

  /**
   * Request media permissions (Camera, Microphone, Photos)
   */
  private async requestMediaPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];

    try {
      // Camera permission
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraResult.status === 'granted') {
        granted.push('Camera');
      } else {
        denied.push('Camera');
      }

      // Photo library permission
      const libraryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryResult.status === 'granted') {
        granted.push('Photo Library');
      } else {
        denied.push('Photo Library');
      }

      // Microphone permission (Android)
      if (Platform.OS === 'android') {
        const micResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (micResult === PermissionsAndroid.RESULTS.GRANTED) {
          granted.push('Microphone');
        } else {
          denied.push('Microphone');
        }
      } else {
        // iOS microphone permission is handled automatically when needed
        granted.push('Microphone (iOS)');
      }

    } catch (error) {
      console.error('Error requesting media permissions:', error);
    }

    return { success: denied.length === 0, granted, denied, needsManualSetup: [], message: '' };
  }

  /**
   * Request communication permissions (Phone, Contacts)
   */
  private async requestCommunicationPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];

    try {
      // Contacts permission
      const contactsResult = await Contacts.requestPermissionsAsync();
      if (contactsResult.status === 'granted') {
        granted.push('Contacts');
      } else {
        denied.push('Contacts');
      }

      // Phone permissions (Android only)
      if (Platform.OS === 'android') {
        const phonePermissions = [
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ];

        const results = await PermissionsAndroid.requestMultiple(phonePermissions);
        
        Object.entries(results).forEach(([permission, result]) => {
          const name = permission.includes('CALL_PHONE') ? 'Call Phone' : 'Read Phone State';
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            granted.push(name);
          } else {
            denied.push(name);
          }
        });
      }

    } catch (error) {
      console.error('Error requesting communication permissions:', error);
    }

    return { success: denied.length === 0, granted, denied, needsManualSetup: [], message: '' };
  }

  /**
   * Request location and calendar permissions
   */
  private async requestLocationAndCalendarPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];

    try {
      // Location permission
      const locationResult = await Location.requestForegroundPermissionsAsync();
      if (locationResult.status === 'granted') {
        granted.push('Location');
      } else {
        denied.push('Location');
      }

      // Calendar permission
      const calendarResult = await Calendar.requestCalendarPermissionsAsync();
      if (calendarResult.status === 'granted') {
        granted.push('Calendar');
      } else {
        denied.push('Calendar');
      }

    } catch (error) {
      console.error('Error requesting location/calendar permissions:', error);
    }

    return { success: denied.length === 0, granted, denied, needsManualSetup: [], message: '' };
  }

  /**
   * Request advanced system permissions (Android only)
   */
  private async requestAdvancedSystemPermissions(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];
    const needsManualSetup: string[] = [];

    if (Platform.OS !== 'android') {
      return { success: true, granted, denied, needsManualSetup, message: '' };
    }

    try {
      // System Alert Window (Display over other apps)
      const hasOverlayPermission = await this.checkSystemAlertWindow();
      if (hasOverlayPermission) {
        granted.push('Display Over Other Apps');
      } else {
        needsManualSetup.push('Display Over Other Apps');
      }

      // Battery optimization exclusion
      const hasBatteryOptimization = await this.checkBatteryOptimization();
      if (hasBatteryOptimization) {
        granted.push('Battery Optimization Exclusion');
      } else {
        needsManualSetup.push('Battery Optimization Exclusion');
      }

      // Auto-start permission (varies by manufacturer)
      needsManualSetup.push('Auto-start Permission');

    } catch (error) {
      console.error('Error requesting advanced permissions:', error);
    }

    return { success: needsManualSetup.length === 0, granted, denied, needsManualSetup, message: '' };
  }

  /**
   * Setup comprehensive notification system
   */
  private async setupNotifications(): Promise<PermissionResult> {
    const granted: string[] = [];
    const denied: string[] = [];
    const needsManualSetup: string[] = [];

    try {
      // Request notification permissions
      const permission = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        lockScreen: true,
        notificationCenter: true,
        carPlay: true,
        criticalAlert: false,
        announcement: true,
      });

      if (permission.authorizationStatus >= 1) {
        granted.push('Notifications');
      } else {
        denied.push('Notifications');
      }

      // Create notification channels with high importance
      await this.createNotificationChannels();
      granted.push('Notification Channels');

      // Check Do Not Disturb bypass
      if (Platform.OS === 'android') {
        const dndResult = await this.checkDoNotDisturbBypass();
        if (dndResult) {
          granted.push('Do Not Disturb Bypass');
        } else {
          needsManualSetup.push('Do Not Disturb Bypass');
        }
      }

    } catch (error) {
      console.error('Error setting up notifications:', error);
    }

    return { success: denied.length === 0, granted, denied, needsManualSetup, message: '' };
  }

  /**
   * Create notification channels with maximum priority
   */
  private async createNotificationChannels(): Promise<void> {
    try {
      // Incoming calls channel - highest priority
      await notifee.createChannel({
        id: 'incoming_calls',
        name: 'Incoming Calls',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [250, 250, 250, 250],
        bypassDnd: true,
        visibility: AndroidVisibility.PUBLIC,
        lights: true,
        lightColor: '#4CAF50',
      });

      // Messages channel
      await notifee.createChannel({
        id: 'messages',
        name: 'Chat Messages',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        bypassDnd: false,
        visibility: AndroidVisibility.PRIVATE,
      });

      // Appointments channel
      await notifee.createChannel({
        id: 'appointments',
        name: 'Appointments',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        bypassDnd: false,
        visibility: AndroidVisibility.PRIVATE,
      });

      // System notifications
      await notifee.createChannel({
        id: 'system',
        name: 'System Notifications',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
        vibration: false,
      });

      console.log('✅ Notification channels created successfully');
    } catch (error) {
      console.error('❌ Error creating notification channels:', error);
    }
  }

  /**
   * Check if app has System Alert Window permission
   */
  private async checkSystemAlertWindow(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    
    try {
      // This is a best-effort check - actual permission needs to be granted in settings
      return false; // Always assume we need manual setup for this critical permission
    } catch (error) {
      console.error('Error checking system alert window:', error);
      return false;
    }
  }

  /**
   * Check battery optimization status
   */
  private async checkBatteryOptimization(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    
    try {
      // This is a best-effort check - actual permission needs to be granted in settings
      return false; // Always assume we need manual setup for this critical permission
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return false;
    }
  }

  /**
   * Check Do Not Disturb bypass permission
   */
  private async checkDoNotDisturbBypass(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.android?.alarm === 1; // 1 = ENABLED
    } catch (error) {
      console.error('Error checking DND bypass:', error);
      return false;
    }
  }

  /**
   * Show comprehensive manual setup guide
   */
  private async showManualSetupGuide(needsSetup: string[]): Promise<void> {
    const guide = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  🏥 DOCAVAILABLE - CRITICAL PERMISSIONS SETUP REQUIRED                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

To ensure you receive incoming calls and messages reliably, please complete 
these manual setup steps:

${needsSetup.includes('Display Over Other Apps') ? `
┌─ 🔴 CRITICAL: Display Over Other Apps ───────────────────────────────────────┐
│ This allows incoming calls to show when your screen is OFF or locked        │
│                                                                              │
│ Steps:                                                                       │
│ 1. Open Settings → Apps → DocAvailable                                     │
│ 2. Tap "Advanced" or "Special app access"                                   │
│ 3. Tap "Display over other apps"                                            │
│ 4. Toggle ON for DocAvailable                                               │
│                                                                              │
│ ⚠️  WITHOUT THIS: Calls won't wake your device!                            │
└──────────────────────────────────────────────────────────────────────────────┘
` : ''}

${needsSetup.includes('Battery Optimization Exclusion') ? `
┌─ 🔋 CRITICAL: Battery Optimization ──────────────────────────────────────────┐
│ This prevents Android from killing the app in the background                │
│                                                                              │
│ Steps:                                                                       │
│ 1. Open Settings → Apps → DocAvailable                                     │
│ 2. Tap "Battery" or "Battery optimization"                                  │
│ 3. Select "Don't optimize" or "Unrestricted"                               │
│                                                                              │
│ ⚠️  WITHOUT THIS: You'll miss calls when app is in background!             │
└──────────────────────────────────────────────────────────────────────────────┘
` : ''}

${needsSetup.includes('Auto-start Permission') ? `
┌─ 🚀 Auto-start Permission (Manufacturer Specific) ───────────────────────────┐
│ This allows the app to start automatically for incoming calls               │
│                                                                              │
│ Samsung: Settings → Apps → DocAvailable → Battery → Allow background       │
│ Huawei: Settings → Apps → DocAvailable → App launch → Manage manually      │
│ Xiaomi: Settings → Apps → Manage apps → DocAvailable → Autostart           │
│ OnePlus: Settings → Apps → DocAvailable → Battery → Battery optimization   │
│ Oppo: Settings → Apps → DocAvailable → Battery → Background app refresh    │
│                                                                              │
│ 💡 Search for "Auto-start" or "Background app refresh" in your settings    │
└──────────────────────────────────────────────────────────────────────────────┘
` : ''}

${needsSetup.includes('Do Not Disturb Bypass') ? `
┌─ 🔕 Do Not Disturb Bypass ───────────────────────────────────────────────────┐
│ This allows medical calls to ring even in Do Not Disturb mode               │
│                                                                              │
│ Steps:                                                                       │
│ 1. Open Settings → Sound & vibration → Do Not Disturb                      │
│ 2. Tap "Apps" or "App notifications"                                        │
│ 3. Find DocAvailable and enable "Override Do Not Disturb"                  │
│                                                                              │
│ 🏥 MEDICAL EMERGENCY: This ensures urgent calls always reach you!          │
└──────────────────────────────────────────────────────────────────────────────┘
` : ''}

┌─ ✅ TEST YOUR SETUP ─────────────────────────────────────────────────────────┐
│ 1. Complete all steps above                                                 │
│ 2. Close DocAvailable completely                                            │
│ 3. Turn off your screen and wait 30 seconds                                │
│ 4. Ask someone to call you through the app                                  │
│ 5. Your screen should wake up with the incoming call!                       │
│                                                                              │
│ 🆘 If it doesn't work, contact support with your device model              │
└──────────────────────────────────────────────────────────────────────────────┘

Would you like to open Settings now to complete the setup?
    `;

    console.log(guide);
    
    // Show alert to user
    Alert.alert(
      '🏥 Critical Permissions Setup Required',
      'DocAvailable needs additional permissions to work properly. These ensure you receive incoming calls even when your phone is locked.\n\nWould you like to open Settings now?',
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }

  /**
   * Quick permission check for critical features
   */
  async checkCriticalPermissions(): Promise<{
    canReceiveCalls: boolean;
    canSendNotifications: boolean;
    canAccessMedia: boolean;
    missingCritical: string[];
  }> {
    const missing: string[] = [];
    let canReceiveCalls = true;
    let canSendNotifications = true;
    let canAccessMedia = true;

    try {
      // Check notification permission
      const notifSettings = await notifee.getNotificationSettings();
      if (notifSettings.authorizationStatus < 1) {
        canSendNotifications = false;
        canReceiveCalls = false;
        missing.push('Notifications');
      }

      // Check system alert window (Android)
      if (Platform.OS === 'android') {
        const hasOverlay = await this.checkSystemAlertWindow();
        if (!hasOverlay) {
          canReceiveCalls = false;
          missing.push('Display Over Other Apps');
        }
      }

      // Check media permissions
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const libraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (cameraStatus.status !== 'granted' || libraryStatus.status !== 'granted') {
        canAccessMedia = false;
        missing.push('Camera/Photos');
      }

    } catch (error) {
      console.error('Error checking critical permissions:', error);
    }

    return {
      canReceiveCalls,
      canSendNotifications,
      canAccessMedia,
      missingCritical: missing
    };
  }

  /**
   * Show a simple permission prompt for specific features
   */
  async promptForFeaturePermissions(feature: 'camera' | 'location' | 'contacts' | 'calls'): Promise<boolean> {
    try {
      switch (feature) {
        case 'camera':
          const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
          return cameraResult.status === 'granted';
          
        case 'location':
          const locationResult = await Location.requestForegroundPermissionsAsync();
          return locationResult.status === 'granted';
          
        case 'contacts':
          const contactsResult = await Contacts.requestPermissionsAsync();
          return contactsResult.status === 'granted';
          
        case 'calls':
          if (Platform.OS === 'android') {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CALL_PHONE
            );
            return result === PermissionsAndroid.RESULTS.GRANTED;
          }
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error requesting ${feature} permission:`, error);
      return false;
    }
  }
}

export default new ComprehensivePermissionManager();
