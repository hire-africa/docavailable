import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as Camera from 'expo-camera';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import { check, PERMISSIONS, PermissionStatus, request, RESULTS } from 'react-native-permissions';

export interface PermissionInfo {
  key: string;
  title: string;
  description: string;
  required: boolean;
  category: 'essential' | 'optional' | 'call' | 'media' | 'location' | 'contacts';
  granted: boolean;
  canAskAgain: boolean;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private permissions: PermissionInfo[] = [];

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  constructor() {
    this.initializePermissions();
  }

  private initializePermissions() {
    this.permissions = [
      // Essential permissions
      {
        key: 'camera',
        title: 'Camera Access',
        description: 'Required for video calls and profile pictures',
        required: true,
        category: 'essential',
        granted: false,
        canAskAgain: true,
      },
      {
        key: 'microphone',
        title: 'Microphone Access',
        description: 'Required for voice calls and audio recording',
        required: true,
        category: 'essential',
        granted: false,
        canAskAgain: true,
      },
      {
        key: 'notifications',
        title: 'Push Notifications',
        description: 'Required to receive call notifications and messages',
        required: true,
        category: 'essential',
        granted: false,
        canAskAgain: true,
      },
      {
        key: 'storage',
        title: 'Storage Access',
        description: 'Required to save photos, documents, and app data',
        required: true,
        category: 'essential',
        granted: false,
        canAskAgain: true,
      },

      // Call-related permissions
      {
        key: 'phone',
        title: 'Phone Access',
        description: 'Required for call functionality and call notifications',
        required: true,
        category: 'call',
        granted: false,
        canAskAgain: true,
      },
      {
        key: 'bluetooth',
        title: 'Bluetooth Access',
        description: 'Required for Bluetooth headset support during calls',
        required: false,
        category: 'call',
        granted: false,
        canAskAgain: true,
      },

      // Location permissions
      {
        key: 'location',
        title: 'Location Access',
        description: 'Required to find nearby doctors and emergency services',
        required: false,
        category: 'location',
        granted: false,
        canAskAgain: true,
      },

      // Media permissions
      {
        key: 'media_library',
        title: 'Photo Library Access',
        description: 'Required to select and share photos in chat',
        required: false,
        category: 'media',
        granted: false,
        canAskAgain: true,
      },

      // Contacts permissions
      {
        key: 'contacts',
        title: 'Contacts Access',
        description: 'Required to invite friends and family to the app',
        required: false,
        category: 'contacts',
        granted: false,
        canAskAgain: true,
      },

      // Calendar permissions
      {
        key: 'calendar',
        title: 'Calendar Access',
        description: 'Required to add appointments to your calendar',
        required: false,
        category: 'contacts',
        granted: false,
        canAskAgain: true,
      },
    ];
  }

  /**
   * Check if this is the first app launch
   */
  async isFirstLaunch(): Promise<boolean> {
    try {
      const hasLaunched = await AsyncStorage.getItem('app_has_launched');
      return hasLaunched === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
      return true;
    }
  }

  /**
   * Mark app as launched
   */
  async markAsLaunched(): Promise<void> {
    try {
      await AsyncStorage.setItem('app_has_launched', 'true');
    } catch (error) {
      console.error('Error marking app as launched:', error);
    }
  }

  /**
   * Get all permissions with their current status
   */
  async getAllPermissions(): Promise<PermissionInfo[]> {
    const updatedPermissions = await Promise.all(
      this.permissions.map(async (permission) => {
        const status = await this.checkPermission(permission.key);
        return {
          ...permission,
          granted: status.granted,
          canAskAgain: status.canAskAgain,
        };
      })
    );
    this.permissions = updatedPermissions;
    return updatedPermissions;
  }

  /**
   * Check permission status
   */
  async checkPermission(permissionKey: string): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      let status: PermissionStatus | boolean = false;
      let canAskAgain = true;

      switch (permissionKey) {
        case 'camera':
          status = await Camera.requestCameraPermissionsAsync();
          return { granted: status.granted, canAskAgain: status.canAskAgain };
        
        case 'microphone':
          status = await Camera.requestMicrophonePermissionsAsync();
          return { granted: status.granted, canAskAgain: status.canAskAgain };
        
        case 'notifications':
          const { status: notificationStatus } = await Notifications.getPermissionsAsync();
          return { granted: notificationStatus === 'granted', canAskAgain: notificationStatus !== 'denied' };
        
        case 'storage':
          if (Platform.OS === 'android') {
            status = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true }; // iOS handles this automatically
        
        case 'phone':
          if (Platform.OS === 'android') {
            status = await check(PERMISSIONS.ANDROID.CALL_PHONE);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true }; // iOS doesn't need this permission
        
        case 'bluetooth':
          if (Platform.OS === 'android') {
            status = await check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true };
        
        case 'location':
          const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
          return { granted: locationStatus === 'granted', canAskAgain: locationStatus !== 'denied' };
        
        case 'media_library':
          const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();
          return { granted: mediaStatus === 'granted', canAskAgain: mediaStatus !== 'denied' };
        
        case 'contacts':
          const { status: contactsStatus } = await Contacts.getPermissionsAsync();
          return { granted: contactsStatus === 'granted', canAskAgain: contactsStatus !== 'denied' };
        
        case 'calendar':
          const { status: calendarStatus } = await Calendar.getCalendarPermissionsAsync();
          return { granted: calendarStatus === 'granted', canAskAgain: calendarStatus !== 'denied' };
        
        default:
          return { granted: false, canAskAgain: false };
      }
    } catch (error) {
      console.error(`Error checking permission ${permissionKey}:`, error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Request a specific permission
   */
  async requestPermission(permissionKey: string): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      let status: PermissionStatus | boolean = false;
      let canAskAgain = true;

      switch (permissionKey) {
        case 'camera':
          status = await Camera.requestCameraPermissionsAsync();
          return { granted: status.granted, canAskAgain: status.canAskAgain };
        
        case 'microphone':
          status = await Camera.requestMicrophonePermissionsAsync();
          return { granted: status.granted, canAskAgain: status.canAskAgain };
        
        case 'notifications':
          const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
          return { granted: notificationStatus === 'granted', canAskAgain: notificationStatus !== 'denied' };
        
        case 'storage':
          if (Platform.OS === 'android') {
            status = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true };
        
        case 'phone':
          if (Platform.OS === 'android') {
            status = await request(PERMISSIONS.ANDROID.CALL_PHONE);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true };
        
        case 'bluetooth':
          if (Platform.OS === 'android') {
            status = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            canAskAgain = status !== RESULTS.DENIED;
            return { granted: status === RESULTS.GRANTED, canAskAgain };
          }
          return { granted: true, canAskAgain: true };
        
        case 'location':
          const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
          return { granted: locationStatus === 'granted', canAskAgain: locationStatus !== 'denied' };
        
        case 'media_library':
          const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
          return { granted: mediaStatus === 'granted', canAskAgain: mediaStatus !== 'denied' };
        
        case 'contacts':
          const { status: contactsStatus } = await Contacts.requestPermissionsAsync();
          return { granted: contactsStatus === 'granted', canAskAgain: contactsStatus !== 'denied' };
        
        case 'calendar':
          const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
          return { granted: calendarStatus === 'granted', canAskAgain: calendarStatus !== 'denied' };
        
        default:
          return { granted: false, canAskAgain: false };
      }
    } catch (error) {
      console.error(`Error requesting permission ${permissionKey}:`, error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Request all essential permissions
   */
  async requestEssentialPermissions(): Promise<{ granted: string[]; denied: string[] }> {
    const essentialPermissions = this.permissions.filter(p => p.required);
    const granted: string[] = [];
    const denied: string[] = [];

    for (const permission of essentialPermissions) {
      const result = await this.requestPermission(permission.key);
      if (result.granted) {
        granted.push(permission.key);
      } else {
        denied.push(permission.key);
      }
    }

    return { granted, denied };
  }

  /**
   * Request all permissions by category
   */
  async requestPermissionsByCategory(category: string): Promise<{ granted: string[]; denied: string[] }> {
    const categoryPermissions = this.permissions.filter(p => p.category === category);
    const granted: string[] = [];
    const denied: string[] = [];

    for (const permission of categoryPermissions) {
      const result = await this.requestPermission(permission.key);
      if (result.granted) {
        granted.push(permission.key);
      } else {
        denied.push(permission.key);
      }
    }

    return { granted, denied };
  }

  /**
   * Check if all essential permissions are granted
   */
  async hasEssentialPermissions(): Promise<boolean> {
    const essentialPermissions = this.permissions.filter(p => p.required);
    const updatedPermissions = await this.getAllPermissions();
    
    return essentialPermissions.every(permission => {
      const updated = updatedPermissions.find(p => p.key === permission.key);
      return updated?.granted || false;
    });
  }

  /**
   * Show permission denied alert with settings option
   */
  showPermissionDeniedAlert(permission: PermissionInfo): void {
    Alert.alert(
      `${permission.title} Required`,
      `${permission.description}\n\nPlease enable this permission in your device settings to continue using the app.`,
      [
        {
          text: 'Cancel',
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
   * Show permission explanation before requesting
   */
  showPermissionExplanation(permission: PermissionInfo): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        `${permission.title} Permission`,
        permission.description,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Allow',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Get permission status summary
   */
  getPermissionSummary(permissions: PermissionInfo[]): {
    total: number;
    granted: number;
    denied: number;
    essentialGranted: number;
    essentialTotal: number;
  } {
    const essential = permissions.filter(p => p.required);
    return {
      total: permissions.length,
      granted: permissions.filter(p => p.granted).length,
      denied: permissions.filter(p => !p.granted).length,
      essentialGranted: essential.filter(p => p.granted).length,
      essentialTotal: essential.length,
    };
  }
}

export default PermissionManager.getInstance();
