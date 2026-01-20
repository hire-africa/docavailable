import { ApiResponse, apiService } from './apiService';

// Notification interfaces matching Laravel backend
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'appointment' | 'text_session' | 'wallet' | 'custom';
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  type: 'appointment' | 'text_session' | 'wallet' | 'custom';
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferenceRequest {
  email_enabled?: boolean;
  push_enabled?: boolean;
  sms_enabled?: boolean;
}

export interface SendCustomNotificationRequest {
  user_ids: number[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationApiService {
  // Get user's notifications with pagination
  async getNotifications(page: number = 1, perPage: number = 20, unreadOnly: boolean = false): Promise<ApiResponse<{
    notifications: Notification[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    unread_count: number;
  }>> {
    return apiService.get('/notifications', { page, per_page: perPage, unread_only: unreadOnly });
  }

  // Mark notification as read
  async markAsRead(notificationId: number): Promise<ApiResponse<void>> {
    return apiService.post('/notifications/mark-read', { notification_id: notificationId.toString() });
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: number[]): Promise<ApiResponse<void>> {
    return apiService.post('/notifications/mark-read', { notification_ids: notificationIds.map(id => id.toString()) });
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse<void>> {
    return apiService.post('/notifications/mark-all-read', {});
  }

  // Delete notification
  async deleteNotification(notificationId: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/notifications/${notificationId}`);
  }

  // Delete multiple notifications
  async deleteMultipleNotifications(notificationIds: number[]): Promise<ApiResponse<void>> {
    return apiService.delete('/notifications', { notification_ids: notificationIds });
  }

  // Get notification preferences
  async getPreferences(): Promise<ApiResponse<NotificationPreference[]>> {
    return apiService.get<NotificationPreference[]>('/notifications/preferences');
  }

  // Update notification preference
  async updatePreference(type: 'appointment' | 'text_session' | 'wallet' | 'custom', data: UpdatePreferenceRequest): Promise<ApiResponse<NotificationPreference>> {
    return apiService.patch<NotificationPreference>(`/notifications/preferences/${type}`, data);
  }

  // Update push token
  async updatePushToken(token: string): Promise<ApiResponse<void>> {
    return apiService.post('/notifications/push-token', { token });
  }

  // Remove push token
  async removePushToken(): Promise<ApiResponse<void>> {
    return apiService.delete('/notifications/push-token');
  }

  // Get notification by ID
  async getNotification(notificationId: number): Promise<ApiResponse<Notification>> {
    return apiService.get<Notification>(`/notifications/${notificationId}`);
  }

  // Get notifications by type
  async getNotificationsByType(type: 'appointment' | 'text_session' | 'wallet' | 'custom', page: number = 1): Promise<ApiResponse<{
    notifications: Notification[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get('/notifications', { type, page });
  }

  // Get unread count
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return apiService.get<{ count: number }>('/notifications/unread-count');
  }

  // Admin: Send custom notification
  async sendCustomNotification(data: SendCustomNotificationRequest): Promise<ApiResponse<{
    sent_count: number;
    failed_count: number;
  }>> {
    return apiService.post('/admin/notifications/send', data);
  }

  // Admin: Get all notifications (for admin dashboard)
  async getAllNotifications(page: number = 1, userId?: number): Promise<ApiResponse<{
    notifications: Notification[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    const params: any = { page };
    if (userId) params.user_id = userId;
    return apiService.get('/admin/notifications', params);
  }
}

export const notificationApiService = new NotificationApiService(); 