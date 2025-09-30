import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiService from '../app/services/apiService';

// Configure notification behavior - moved to initialization method

class PushNotificationService {
  private pushToken: string | null = null;

  /**
   * Register for push notifications and get the push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('🔔 [PushNotificationService] Starting push notification registration...');

      // Check if we're in a development environment or simulator
      if (__DEV__) {
        console.log('🔔 [PushNotificationService] Development mode - skipping push notifications');
        return null;
      }

      // Check if native modules are available
      if (!Device || !Notifications) {
        console.warn('⚠️ [PushNotificationService] Native modules not available, skipping push notifications');
        return null;
      }

      // Configure notification behavior here instead of at module load
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (error) {
        console.warn('⚠️ [PushNotificationService] Failed to set notification handler:', error);
        return null;
      }

      // Check if device is physical
      if (!Device.isDevice) {
        console.log('⚠️ [PushNotificationService] Must use physical device for push notifications');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ [PushNotificationService] Push notification permission denied');
        return null;
      }

      console.log('✅ [PushNotificationService] Push notification permission granted');

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '55ebf2c0-d2b4-42ff-9b39-e65328778c63', // From app.config.js
      });

      this.pushToken = token.data;
      console.log('🔑 [PushNotificationService] Push token obtained:', this.pushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('direct_calls', {
          name: 'Direct Calls',
          description: 'Incoming call notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });

        await Notifications.setNotificationChannelAsync('chat_messages', {
          name: 'Chat Messages',
          description: 'New message notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
        });
      }

      // Send token to backend
      await this.sendTokenToBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('❌ [PushNotificationService] Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      console.log('📤 [PushNotificationService] Sending token to backend...');
      
      const response = await apiService.post('/notifications/push-token', {
        push_token: token
      });

      if (response.success) {
        console.log('✅ [PushNotificationService] Token sent to backend successfully');
      } else {
        console.log('⚠️ [PushNotificationService] Failed to send token to backend:', response.message);
      }
    } catch (error) {
      console.error('❌ [PushNotificationService] Error sending token to backend:', error);
    }
  }

  /**
   * Remove push token from backend
   */
  async removePushToken(): Promise<void> {
    try {
      console.log('🗑️ [PushNotificationService] Removing push token...');
      
      await apiService.delete('/notifications/push-token');
      this.pushToken = null;
      
      console.log('✅ [PushNotificationService] Push token removed successfully');
    } catch (error) {
      console.error('❌ [PushNotificationService] Error removing push token:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Handle notification received while app is in foreground
   */
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Handle notification tapped/opened
   */
  addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await this.getPermissionsStatus();
    return status === 'granted';
  }
}

export default new PushNotificationService();
