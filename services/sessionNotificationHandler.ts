import { SessionNotificationService } from './sessionNotificationService';
import pushNotificationService from './pushNotificationService';
import { NotificationService } from './notificationService';

/**
 * Handler for integrating session notifications with the app's notification system
 */
export class SessionNotificationHandler {
  private static isInitialized = false;

  /**
   * Initialize session notification handlers
   */
  static initialize(): void {
    if (this.isInitialized) {
      console.log('📱 SessionNotificationHandler already initialized');
      return;
    }

    console.log('📱 Initializing SessionNotificationHandler...');

    // Handle foreground notifications
    pushNotificationService.addMessageListener((remoteMessage) => {
      this.handleForegroundNotification(remoteMessage);
    });

    // Handle notifications when app is opened from background
    pushNotificationService.addNotificationOpenedListener((remoteMessage) => {
      this.handleNotificationOpened(remoteMessage);
    });

    this.isInitialized = true;
    console.log('✅ SessionNotificationHandler initialized');
  }

  /**
   * Handle foreground notifications (when app is open)
   */
  private static async handleForegroundNotification(remoteMessage: any): Promise<void> {
    try {
      console.log('📱 Received foreground notification:', remoteMessage);

      const { data, notification } = remoteMessage;
      
      // Check if this is a session-related notification
      if (data?.type && this.isSessionNotification(data.type)) {
        console.log('🔔 Processing session notification in foreground:', data.type);
        
        // Handle the session notification
        await SessionNotificationService.handleIncomingSessionNotification({
          ...data,
          title: notification?.title,
          body: notification?.body,
          message: notification?.body
        });

        // Show in-app notification or update UI as needed
        this.showInAppNotification(notification?.title || 'Session Update', notification?.body || 'Session status updated');
      }
    } catch (error) {
      console.error('❌ Error handling foreground session notification:', error);
    }
  }

  /**
   * Handle notifications when app is opened from background/killed state
   */
  private static async handleNotificationOpened(remoteMessage: any): Promise<void> {
    try {
      console.log('📱 App opened from notification:', remoteMessage);

      const { data, notification } = remoteMessage;
      
      // Check if this is a session-related notification
      if (data?.type && this.isSessionNotification(data.type)) {
        console.log('🔔 Processing session notification from background:', data.type);
        
        // Handle the session notification
        await SessionNotificationService.handleIncomingSessionNotification({
          ...data,
          title: notification?.title,
          body: notification?.body,
          message: notification?.body
        });

        // Navigate to appropriate screen based on notification data
        this.navigateFromNotification(data);
      }
    } catch (error) {
      console.error('❌ Error handling background session notification:', error);
    }
  }

  /**
   * Check if notification type is session-related
   */
  private static isSessionNotification(type: string): boolean {
    const sessionTypes = [
      'session_started',
      'session_ended',
      'session_reminder',
      'session_billing',
      'session_timeout'
    ];
    return sessionTypes.includes(type);
  }

  /**
   * Show in-app notification (you can customize this based on your UI framework)
   */
  private static showInAppNotification(title: string, message: string): void {
    // You can implement this based on your notification UI system
    // For example, using a toast, banner, or modal
    console.log('📱 In-app notification:', { title, message });
    
    // Example: You could use a toast library or custom notification component
    // Toast.show({ type: 'info', text1: title, text2: message });
  }

  /**
   * Navigate to appropriate screen based on notification data
   */
  private static navigateFromNotification(data: any): void {
    try {
      const { action, sessionId, appointmentId } = data;
      
      console.log('🧭 Navigating from notification:', { action, sessionId, appointmentId });

      // You'll need to implement navigation based on your routing system
      // This is just an example structure
      
      switch (action) {
        case 'session_started':
          if (appointmentId) {
            // Navigate to appointment chat
            console.log('🧭 Navigate to appointment chat:', appointmentId);
            // router.push(`/chat/${appointmentId}`);
          } else if (sessionId) {
            // Navigate to session chat
            console.log('🧭 Navigate to session chat:', sessionId);
            // router.push(`/chat/${sessionId}`);
          }
          break;
          
        case 'session_ended':
          // Navigate to session history or dashboard
          console.log('🧭 Navigate to sessions');
          // router.push('/sessions');
          break;
          
        case 'session_reminder':
          if (appointmentId) {
            console.log('🧭 Navigate to appointment:', appointmentId);
            // router.push(`/appointments/${appointmentId}`);
          }
          break;
          
        default:
          console.log('🧭 Navigate to default screen (dashboard)');
          // router.push('/dashboard');
      }
    } catch (error) {
      console.error('❌ Error navigating from notification:', error);
    }
  }

  /**
   * Test session notifications (for development/testing)
   */
  static async testSessionNotifications(): Promise<void> {
    console.log('🧪 Testing session notifications...');
    
    try {
      // Test session started notification
      await SessionNotificationService.sendSessionStartedNotification(
        {
          sessionId: 'test-session-123',
          sessionType: 'text',
          doctorName: 'Dr. Test Doctor'
        },
        'patient',
        'test-patient-id'
      );

      // Test session ended notification
      setTimeout(async () => {
        await SessionNotificationService.sendSessionEndedNotification(
          {
            sessionId: 'test-session-123',
            sessionType: 'text',
            doctorName: 'Dr. Test Doctor'
          },
          'patient',
          'test-patient-id',
          '15 minutes'
        );
      }, 5000);

      console.log('✅ Test notifications sent');
    } catch (error) {
      console.error('❌ Error testing session notifications:', error);
    }
  }
}
