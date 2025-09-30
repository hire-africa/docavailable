import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import apiService from '../app/services/apiService';

class PushNotificationService {
  private pushToken: string | null = null;

  // Request permission (iOS) and obtain FCM token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('🔔 [PushNotificationService] Registering for FCM...');

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

      await this.sendTokenToBackend(token);

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        this.pushToken = newToken;
        console.log('🔄 [PushNotificationService] FCM token refreshed');
        await this.sendTokenToBackend(newToken);
      });

      return token;
    } catch (error) {
      console.error('❌ [PushNotificationService] Failed to register for FCM:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const response = await apiService.post('/notifications/push-token', {
        push_token: token,
        provider: 'fcm'
      });
      if (!response.success) {
        console.warn('⚠️ [PushNotificationService] Backend rejected token:', response.message);
      }
    } catch (error) {
      console.error('❌ [PushNotificationService] Error sending token:', error);
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
