import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import apiService from '../app/services/apiService';

class PushNotificationService {
  private pushToken: string | null = null;

  // Request permission (iOS) and obtain FCM token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('🔔 [PushNotificationService] Registering for FCM...');

      // Ensure FCM auto-init is on (Android). iOS ignores this.
      try { await messaging().setAutoInitEnabled(true); } catch {}

      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled && Platform.OS === 'ios') {
        console.warn('❌ [PushNotificationService] Notification permission not granted');
        return null;
      }

      const token = await messaging().getToken();
      this.pushToken = token;
      console.log('🔑 [PushNotificationService] FCM token:', token);

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
      const response = await apiService.post('/notifications/push-token', {
        push_token: token,
        provider: 'fcm'
      });
      if (!response.success) {
        console.warn('⚠️ [PushNotificationService] Backend rejected token:', response.message);
        return false;
      }
      return true;
    } catch (error: any) {
      // Common case: 401 when not authenticated yet
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('🕒 [PushNotificationService] Not authenticated; will retry after login');
      } else {
        console.error('❌ [PushNotificationService] Error sending token:', error?.message || error);
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
      const pending = await AsyncStorage.getItem('pending_push_token');
      if (pending) {
        const sent = await this.trySendTokenToBackend(pending);
        if (sent) {
          await AsyncStorage.removeItem('pending_push_token');
          console.log('✅ [PushNotificationService] Synced pending push token');
        }
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
