import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Notification {
  id: string;
  type: 'appointment' | 'message' | 'payment' | 'system' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  recipientType?: 'all' | 'doctors' | 'patients' | 'specific';
  recipientId?: string;
  sentBy?: string;
}

const NOTIFICATIONS_KEY = 'docava_notifications';

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const notifications = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  static async saveNotifications(notifications: Notification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getNotifications();
      return notifications.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
      await this.saveNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  static async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date(),
        isRead: false
      };
      notifications.unshift(newNotification);
      await this.saveNotifications(notifications);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }

  static async sendNotificationToUsers(
    title: string,
    message: string,
    type: 'appointment' | 'message' | 'payment' | 'system' | 'reminder',
    recipientType: 'all' | 'doctors' | 'patients' | 'specific',
    recipientId?: string,
    sentBy?: string
  ): Promise<void> {
    try {
      // In a real app, this would send to backend API
      // For now, we'll simulate by adding to local storage
      const notification: Notification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date(),
        isRead: false,
        recipientType,
        recipientId,
        sentBy
      };

      const notifications = await this.getNotifications();
      notifications.unshift(notification);
      await this.saveNotifications(notifications);

      // In real app, this would trigger push notifications
      console.log('Notification sent:', {
        title,
        message,
        recipientType,
        recipientId,
        sentBy
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  static async getNotificationsForUser(
    userType: 'doctor' | 'patient',
    userId?: string
  ): Promise<Notification[]> {
    try {
      // Get existing local notifications (includes automated ones)
      const localNotifications = await this.getNotifications();
      
      // Try to get admin notifications from API
      let adminNotifications: Notification[] = [];
      try {
        console.log('🔔 Fetching admin notifications from docavailable.com...');
        
        const response = await fetch(`https://docavailable.com/api/notifications?userType=${userType}&userId=${userId || ''}`);
        console.log('🔔 Admin API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔔 Admin API response data:', data);
          
          if (data.success && data.notifications) {
            // Convert API notifications to our format
            adminNotifications = data.notifications.map((n: any) => {
              console.log('🔔 Processing admin notification:', {
                id: n.id,
                title: n.title,
                type: n.type,
                originalType: n.type
              });
              
              return {
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                timestamp: new Date(n.timestamp),
                isRead: n.isRead || false,
                actionUrl: this.getActionUrlForType(n.type),
                recipientType: n.recipientType,
                recipientId: n.recipientId,
                sentBy: n.sentBy
              };
            });
            console.log('🔔 Admin notifications loaded:', adminNotifications.length, adminNotifications);
          } else {
            console.log('🔔 No admin notifications found in response');
          }
        } else {
          console.log('🔔 Admin API error:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.log('🔔 Admin API not available, using local storage only:', apiError);
      }

      // Combine local and admin notifications
      const allNotifications = [...localNotifications, ...adminNotifications];
      
      // Remove duplicates based on ID
      const uniqueNotifications = allNotifications.reduce((acc, current) => {
        const existing = acc.find(item => item.id === current.id);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as Notification[]);

      // Sort by timestamp (newest first)
      uniqueNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Filter based on recipient type
      const filteredNotifications = uniqueNotifications.filter(notification => {
        // If no recipient type specified, show to all (automated notifications)
        if (!notification.recipientType) return true;
        
        // Filter based on recipient type (admin notifications)
        switch (notification.recipientType) {
          case 'all':
            return true;
          case 'doctors':
            return userType === 'doctor';
          case 'patients':
            return userType === 'patient';
          case 'specific':
            return notification.recipientId === userId;
          default:
            return true;
        }
      });

      // Save combined notifications back to local storage
      await this.saveNotifications(filteredNotifications);
      
      return filteredNotifications;
    } catch (error) {
      console.error('Error getting notifications for user:', error);
      return [];
    }
  }

  private static getActionUrlForType(type: string): string | undefined {
    switch (type) {
      case 'appointment':
        return '/appointments';
      case 'message':
        return '/messages';
      case 'payment':
        return '/earnings';
      case 'wallet':
        return '/earnings';
      case 'system':
        return undefined;
      default:
        return undefined;
    }
  }
}
