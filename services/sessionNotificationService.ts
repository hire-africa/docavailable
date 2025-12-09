import { NotificationService } from './notificationService';
import pushNotificationService from './pushNotificationService';
import { apiService } from './apiService';

export interface SessionNotificationData {
  sessionId: string;
  sessionType: 'text' | 'voice' | 'video' | 'appointment';
  doctorName?: string;
  patientName?: string;
  appointmentId?: string;
  reason?: string;
}

export class SessionNotificationService {
  /**
   * Send session started notification
   */
  static async sendSessionStartedNotification(
    sessionData: SessionNotificationData,
    recipientType: 'patient' | 'doctor',
    recipientId: string
  ): Promise<void> {
    try {
      const { sessionType, doctorName, patientName, sessionId, appointmentId } = sessionData;
      
      // Determine notification content based on recipient
      let title: string;
      let message: string;
      
      if (recipientType === 'patient') {
        title = 'Session Started';
        message = appointmentId 
          ? `Your appointment session with Dr. ${doctorName} has started`
          : `Your ${sessionType} session with Dr. ${doctorName} has started`;
      } else {
        title = 'New Session Started';
        message = appointmentId
          ? `Appointment session with ${patientName} has started`
          : `New ${sessionType} session with ${patientName} has started`;
      }

      // Add to local notifications
      await NotificationService.addNotification({
        type: 'system',
        title,
        message,
        actionUrl: appointmentId ? `/chat/${appointmentId}` : `/chat/${sessionId}`
      });

      // Send push notification via backend
      await this.sendPushNotification({
        title,
        message,
        type: 'session_started',
        recipientId,
        data: {
          sessionId,
          sessionType,
          appointmentId,
          action: 'session_started'
        }
      });

      console.log('✅ Session started notification sent:', { sessionId, recipientType, recipientId });
    } catch (error) {
      console.error('❌ Error sending session started notification:', error);
    }
  }

  /**
   * Send session ended notification
   */
  static async sendSessionEndedNotification(
    sessionData: SessionNotificationData,
    recipientType: 'patient' | 'doctor',
    recipientId: string,
    duration?: string
  ): Promise<void> {
    try {
      const { sessionType, doctorName, patientName, sessionId, appointmentId } = sessionData;
      
      // Determine notification content based on recipient
      let title: string;
      let message: string;
      
      if (recipientType === 'patient') {
        title = 'Session Ended';
        message = appointmentId 
          ? `Your appointment session with Dr. ${doctorName} has ended${duration ? ` (Duration: ${duration})` : ''}`
          : `Your ${sessionType} session with Dr. ${doctorName} has ended${duration ? ` (Duration: ${duration})` : ''}`;
      } else {
        title = 'Session Completed';
        message = appointmentId
          ? `Appointment session with ${patientName} has ended${duration ? ` (Duration: ${duration})` : ''}`
          : `${sessionType} session with ${patientName} has ended${duration ? ` (Duration: ${duration})` : ''}`;
      }

      // Add to local notifications
      await NotificationService.addNotification({
        type: 'system',
        title,
        message,
        actionUrl: '/sessions'
      });

      // Send push notification via backend
      await this.sendPushNotification({
        title,
        message,
        type: 'session_ended',
        recipientId,
        data: {
          sessionId,
          sessionType,
          appointmentId,
          duration,
          action: 'session_ended'
        }
      });

      console.log('✅ Session ended notification sent:', { sessionId, recipientType, recipientId, duration });
    } catch (error) {
      console.error('❌ Error sending session ended notification:', error);
    }
  }

  /**
   * Send session reminder notification (e.g., 5 minutes before scheduled appointment)
   */
  static async sendSessionReminderNotification(
    sessionData: SessionNotificationData,
    recipientType: 'patient' | 'doctor',
    recipientId: string,
    minutesUntilStart: number
  ): Promise<void> {
    try {
      const { sessionType, doctorName, patientName, appointmentId } = sessionData;
      
      let title: string;
      let message: string;
      
      if (recipientType === 'patient') {
        title = 'Upcoming Session';
        message = `Your ${sessionType} session with Dr. ${doctorName} starts in ${minutesUntilStart} minutes`;
      } else {
        title = 'Upcoming Session';
        message = `Your ${sessionType} session with ${patientName} starts in ${minutesUntilStart} minutes`;
      }

      // Add to local notifications
      await NotificationService.addNotification({
        type: 'reminder',
        title,
        message,
        actionUrl: appointmentId ? `/chat/${appointmentId}` : '/appointments'
      });

      // Send push notification via backend
      await this.sendPushNotification({
        title,
        message,
        type: 'session_reminder',
        recipientId,
        data: {
          sessionId: sessionData.sessionId,
          sessionType,
          appointmentId,
          minutesUntilStart,
          action: 'session_reminder'
        }
      });

      console.log('✅ Session reminder notification sent:', { sessionId: sessionData.sessionId, recipientType, minutesUntilStart });
    } catch (error) {
      console.error('❌ Error sending session reminder notification:', error);
    }
  }

  /**
   * Send push notification via backend API
   */
  private static async sendPushNotification(notificationData: {
    title: string;
    message: string;
    type: string;
    recipientId: string;
    data?: any;
  }): Promise<void> {
    try {
      const response = await apiService.post('/notifications/push', {
        title: notificationData.title,
        body: notificationData.message,
        type: notificationData.type,
        recipient_id: notificationData.recipientId,
        data: notificationData.data || {}
      });

      if (!response.success) {
        console.warn('⚠️ Backend push notification failed:', response.message);
      }
    } catch (error) {
      console.error('❌ Error sending push notification to backend:', error);
      // Don't throw - local notification was already added
    }
  }

  /**
   * Handle incoming session notification (when app receives push notification)
   */
  static async handleIncomingSessionNotification(notificationData: any): Promise<void> {
    try {
      const { action, sessionId, sessionType, appointmentId } = notificationData;
      
      console.log('📱 Handling incoming session notification:', { action, sessionId, sessionType });

      // Add to local notification store for UI display
      await NotificationService.addNotification({
        type: 'system',
        title: notificationData.title || 'Session Update',
        message: notificationData.body || notificationData.message || 'Session status updated',
        actionUrl: appointmentId ? `/chat/${appointmentId}` : `/chat/${sessionId}`
      });

      // You can add additional logic here based on the action
      switch (action) {
        case 'session_started':
          console.log('🟢 Session started notification received');
          break;
        case 'session_ended':
          console.log('🔴 Session ended notification received');
          break;
        case 'session_reminder':
          console.log('⏰ Session reminder notification received');
          break;
        default:
          console.log('📱 Unknown session notification action:', action);
      }
    } catch (error) {
      console.error('❌ Error handling incoming session notification:', error);
    }
  }
}
