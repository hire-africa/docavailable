import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import apiService from '../app/services/apiService';
import ringtoneService from './ringtoneService';

export class CallNotificationService {
  private static instance: CallNotificationService;
  private activeCallNotificationId: string | null = null;

  static getInstance(): CallNotificationService {
    if (!CallNotificationService.instance) {
      CallNotificationService.instance = new CallNotificationService();
    }
    return CallNotificationService.instance;
  }

  /**
   * Show enhanced call notification with action buttons
   */
  async showIncomingCallNotification(callData: {
    appointmentId: string;
    callerName: string;
    callerId: string;
    callType: 'audio' | 'video';
    callerProfilePicture?: string;
  }): Promise<string> {
    try {
      // Start custom ringtone
      await ringtoneService.start();

      const notificationId = await notifee.displayNotification({
        title: `${callData.callerName} - ${callData.callType === 'video' ? 'Video Call' : 'Voice Call'}`,
        body: 'Incoming call...',
        data: {
          type: 'incoming_call',
          appointment_id: callData.appointmentId,
          doctor_id: callData.callerId,
          doctor_name: callData.callerName,
          call_type: callData.callType,
          categoryId: 'incoming_call',
        },
        android: {
          channelId: 'incoming_calls_v3',
          importance: AndroidImportance.HIGH,
          sound: 'ringtone',
          vibrationPattern: [0, 250, 250, 250],
          visibility: AndroidVisibility.PUBLIC,
          pressAction: { id: 'default' },
          fullScreenAction: { id: 'default' },
          actions: [
            { title: 'Answer', pressAction: { id: 'answer' } },
            { title: 'Decline', pressAction: { id: 'decline' } },
          ],
        },
      });

      this.activeCallNotificationId = notificationId;
      return notificationId;
    } catch (error) {
      console.error('Failed to show incoming call notification:', error);
      throw error;
    }
  }

  /**
   * Dismiss the active call notification
   */
  async dismissCallNotification(notificationId?: string): Promise<void> {
    try {
      // Stop custom ringtone
      await ringtoneService.stop();

      const id = notificationId || this.activeCallNotificationId;
      if (id) {
        await Notifications.dismissNotificationAsync(id);
        if (id === this.activeCallNotificationId) {
          this.activeCallNotificationId = null;
        }
      }
    } catch (error) {
      console.error('Failed to dismiss call notification:', error);
    }
  }

  /**
   * Handle call decline from notification
   */
  async handleCallDecline(callData: {
    appointmentId: string;
    callerId: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      // Stop ringtone and dismiss notification
      await ringtoneService.stop();
      await this.dismissCallNotification();

      // Send decline signal to backend
      await apiService.post('/api/call-sessions/decline', {
        appointment_id: callData.appointmentId,
        caller_id: callData.callerId,
        session_id: callData.sessionId,
        reason: 'declined_by_user'
      });

      console.log('Call declined successfully');
    } catch (error) {
      console.error('Failed to decline call:', error);
      throw error;
    }
  }

  /**
   * Handle call answer from notification
   */
  async handleCallAnswer(callData: {
    appointmentId: string;
    callerId: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      // Stop ringtone and dismiss notification
      await ringtoneService.stop();
      await this.dismissCallNotification();

      // Send answer signal to backend
      const res = await apiService.post('/api/call-sessions/answer', {
        appointment_id: callData.appointmentId,
        caller_id: callData.callerId,
        session_id: callData.sessionId,
        action: 'answered'
      });

      console.log('Call answered successfully');
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  /**
   * Clear all call notifications
   */
  async clearAllCallNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      this.activeCallNotificationId = null;
    } catch (error) {
      console.error('Failed to clear call notifications:', error);
    }
  }
}

export default CallNotificationService.getInstance();
