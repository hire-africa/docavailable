import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import apiService from '../app/services/apiService';

// Ensure Firebase is properly initialized
import '@react-native-firebase/app';

class PushNotificationService {
  private pushToken: string | null = null;

  // Request permission (iOS) and obtain FCM token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('🔔 [PushNotificationService] Registering for FCM...');
      console.log('🔔 [PushNotificationService] Platform:', Platform.OS);
      console.log('🔔 [PushNotificationService] Environment:', process.env.NODE_ENV);

      // Check if Firebase is properly initialized
      try {
        // Test Firebase messaging availability
        const messagingInstance = messaging();
        if (!messagingInstance) {
          throw new Error('Firebase messaging not available');
        }
        console.log('✅ [PushNotificationService] Firebase messaging available');
      } catch (error) {
        console.error('❌ [PushNotificationService] Firebase messaging not available:', error);
        console.warn('⚠️ [PushNotificationService] Skipping FCM registration due to Firebase initialization error');
        return null;
      }

      // Ensure FCM auto-init is on (Android). iOS ignores this.
      try { 
        await messaging().setAutoInitEnabled(true); 
        console.log('✅ [PushNotificationService] FCM auto-init enabled');
      } catch (error) {
        console.error('❌ [PushNotificationService] Failed to enable FCM auto-init:', error);
        // Continue anyway, as this might not be critical
      }

      console.log('🔔 [PushNotificationService] Requesting notification permission...');
      const authStatus = await messaging().requestPermission();
      console.log('🔔 [PushNotificationService] Permission status:', authStatus);
      
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled && Platform.OS === 'ios') {
        console.warn('❌ [PushNotificationService] Notification permission not granted');
        return null;
      }

      console.log('🔔 [PushNotificationService] Getting FCM token...');
      const token = await messaging().getToken();
      this.pushToken = token;
      console.log('🔑 [PushNotificationService] FCM token received:', token ? 'YES' : 'NO');
      console.log('🔑 [PushNotificationService] Token length:', token ? token.length : 0);

      // Try to send to backend; if not authenticated yet, queue it for later sync
      const sent = await this.trySendTokenToBackend(token);
      if (!sent) {
        await AsyncStorage.setItem('pending_push_token', token);
        console.log('🕒 [PushNotificationService] Queued push token for later (pending auth)');
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        this.pushToken = newToken;
        console.log('🔄 [PushNotificationService] FCM token refreshed');
        const sent = await this.trySendTokenToBackend(newToken);
        if (!sent) {
          await AsyncStorage.setItem('pending_push_token', newToken);
          console.log('🕒 [PushNotificationService] Queued refreshed token for later (pending auth)');
        }
      });

      return token;
    } catch (error) {
      console.error('❌ [PushNotificationService] Failed to register for FCM:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<boolean> {
    try {
      console.log('📤 [PushNotificationService] Sending token to backend...');
      console.log('📤 [PushNotificationService] Token length:', token.length);
      console.log('📤 [PushNotificationService] API base URL:', apiService.getBaseURL());
      
      const response = await apiService.post('/notifications/push-token', {
        push_token: token,
        provider: 'fcm'
      });
      
      console.log('📤 [PushNotificationService] Backend response:', response);
      
      if (!response.success) {
        console.warn('⚠️ [PushNotificationService] Backend rejected token:', response.message);
        return false;
      }
      
      console.log('✅ [PushNotificationService] Token sent successfully to backend');
      return true;
    } catch (error: any) {
      console.error('❌ [PushNotificationService] Error sending token:', error);
      console.error('❌ [PushNotificationService] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url
      });
      
      // Common case: 401 when not authenticated yet
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('🕒 [PushNotificationService] Not authenticated; will retry after login');
      } else if (status === 422) {
        console.warn('⚠️ [PushNotificationService] Validation error:', error?.response?.data);
      } else if (status === 500) {
        console.warn('⚠️ [PushNotificationService] Server error:', error?.response?.data);
      }
      return false;
    }
  }

  private async trySendTokenToBackend(token: string): Promise<boolean> {
    // Only attempt if we have an auth token
    try {
      const authToken = await apiService.getAuthToken();
      if (!authToken) return false;
      return await this.sendTokenToBackend(token);
    } catch {
      return false;
    }
  }

  async syncPendingToken(): Promise<void> {
    try {
      console.log('🔄 [PushNotificationService] Checking for pending push token...');
      const pending = await AsyncStorage.getItem('pending_push_token');
      
      if (pending) {
        console.log('🔄 [PushNotificationService] Found pending token, attempting to sync...');
        console.log('🔄 [PushNotificationService] Pending token length:', pending.length);
        
        const sent = await this.trySendTokenToBackend(pending);
        if (sent) {
          await AsyncStorage.removeItem('pending_push_token');
          console.log('✅ [PushNotificationService] Synced pending push token successfully');
        } else {
          console.warn('⚠️ [PushNotificationService] Failed to sync pending token, will retry later');
        }
      } else {
        console.log('ℹ️ [PushNotificationService] No pending token found');
      }
    } catch (e) {
      console.error('❌ [PushNotificationService] Failed to sync pending token:', e);
    }
  }

  async removePushToken(): Promise<void> {
    try {
      await apiService.delete('/notifications/push-token');
      this.pushToken = null;
    } catch (error) {
      console.error('❌ [PushNotificationService] Error removing token:', error);
    }
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  // Foreground message listener wrapper
  addMessageListener(listener: (remoteMessage: any) => void) {
    return messaging().onMessage(listener);
  }

  // Opened from background
  addNotificationOpenedListener(listener: (remoteMessage: any) => void) {
    return messaging().onNotificationOpenedApp(listener);
  }
}

export default new PushNotificationService();
