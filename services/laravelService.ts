import { apiService } from '../app/services/apiService';

// User interfaces
export interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_type: 'patient' | 'doctor' | 'admin';
  date_of_birth?: string;
  gender?: string;
  country?: string;
  city?: string;
  years_of_experience?: number;
  occupation?: string;
  bio?: string;
  health_history?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  rating?: number;
  total_ratings?: number;
  created_at: string;
  updated_at: string;
  // Profile picture fields
  profile_picture?: string;
  profile_picture_url?: string;
  // Document fields
  national_id?: string;
  national_id_url?: string;
  medical_degree?: string;
  medical_degree_url?: string;
  medical_licence?: string;
  medical_licence_url?: string;
  // Doctor specific fields
  specialization?: string;
  sub_specialization?: string;
  // Additional fields that might be used
  role?: string;
  is_online_for_instant_sessions?: boolean;
}

// Appointment interfaces
export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  date: string;
  time: string;
  consultation_type: 'text' | 'voice' | 'video';
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
  notes?: string;
  chat_id?: string;
  scheduled_time: string;
  patient_joined?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  sessions_deducted: number;
  no_show: boolean;
  completed_at?: string;
  earnings_awarded: number;
  created_at: string;
  updated_at: string;
  patient?: UserData;
  doctor?: UserData;
}

// Subscription interfaces
export interface Subscription {
  id: number;
  user_id: number;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  plan_currency: string;
  text_sessions_remaining: number;
  voice_calls_remaining: number;
  video_calls_remaining: number;
  total_text_sessions: number;
  total_voice_calls: number;
  total_video_calls: number;
  activated_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Chat interfaces
export interface ChatRoom {
  id: number;
  name?: string;
  type: 'private' | 'group';
  created_by: number;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatParticipant {
  id: number;
  chat_room_id: number;
  user_id: number;
  role: 'admin' | 'member';
  joined_at: string;
  user?: UserData;
}

export interface ChatMessage {
  id: number;
  chat_room_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: number;
  created_at: string;
  updated_at: string;
  sender?: UserData;
  reactions?: MessageReaction[];
  read_by?: MessageRead[];
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
  user?: UserData;
}

export interface MessageRead {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
  user?: UserData;
}

// Wallet interfaces
export interface DoctorWallet {
  id: number;
  doctor_id: number;
  balance: number;
  total_earnings: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Notification interfaces
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

class LaravelService {
  // User operations
  async getCurrentUser(): Promise<any> { // Changed from ApiResponse to any as ApiResponse is removed
    return apiService.get<UserData>('/user');
  }

  async updateUser(userId: number, data: Partial<UserData>): Promise<any> { // Changed from ApiResponse to any
    return apiService.patch<UserData>(`/users/${userId}`, data);
  }

  async getDoctors(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<UserData[]>('/doctors');
  }

  async getDoctorById(doctorId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<UserData>(`/doctors/${doctorId}`);
  }

  // Appointment operations
  async getAppointments(userType: 'patient' | 'doctor'): Promise<any> { // Changed from ApiResponse to any
    const endpoint = userType === 'doctor' ? '/doctor/appointments' : '/patient/appointments';
    return apiService.get<Appointment[]>(endpoint);
  }

  async createAppointment(data: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<any> { // Changed from ApiResponse to any
    return apiService.post<Appointment>('/appointments', data);
  }

  async updateAppointment(appointmentId: number, data: Partial<Appointment>): Promise<any> { // Changed from ApiResponse to any
    return apiService.patch<Appointment>(`/appointments/${appointmentId}`, data);
  }

  async cancelAppointment(appointmentId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.delete(`/appointments/${appointmentId}`);
  }

  async getAvailableDoctors(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<UserData[]>('/available-doctors');
  }

  // Subscription operations
  async getSubscription(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<Subscription>('/subscription');
  }

  async createSubscription(data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<any> { // Changed from ApiResponse to any
    return apiService.post<Subscription>('/create_subscription', data);
  }

  async updateSubscription(data: Partial<Subscription>): Promise<any> { // Changed from ApiResponse to any
    return apiService.patch<Subscription>('/update_subscription', data);
  }

  // Chat operations
  async getChatRooms(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<ChatRoom[]>('/chat/rooms');
  }

  async getChatRoom(roomId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<ChatRoom>(`/chat/rooms/${roomId}`);
  }

  async createPrivateChat(participantId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.post<ChatRoom>('/chat/private', { participant_id: participantId });
  }


  // Wallet operations (for doctors)
  async getWallet(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<DoctorWallet>('/doctor/wallet');
  }

  async getTransactions(page: number = 1): Promise<any> { // Changed from ApiResponse to any
    return apiService.get('/doctor/wallet/transactions', { page });
  }

  async requestWithdrawal(amount: number, paymentMethod: string, paymentDetails: Record<string, any>): Promise<any> { // Changed from ApiResponse to any
    return apiService.post('/doctor/wallet/withdraw', {
      amount,
      payment_method: paymentMethod,
      payment_details: paymentDetails
    });
  }

  // Notification operations
  async getNotifications(page: number = 1): Promise<any> { // Changed from ApiResponse to any
    return apiService.get('/notifications', { page });
  }

  async markNotificationAsRead(notificationId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.patch(`/notifications/${notificationId}/read`);
  }

  async getNotificationPreferences(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<NotificationPreference[]>('/notifications/preferences');
  }

  async updateNotificationPreference(type: string, data: Partial<NotificationPreference>): Promise<any> { // Changed from ApiResponse to any
    return apiService.patch<NotificationPreference>(`/notifications/preferences/${type}`, data);
  }

  async updatePushToken(token: string): Promise<any> { // Changed from ApiResponse to any
    return apiService.post('/notifications/push-token', { token });
  }

  // Text session operations
  async getAvailableDoctorsForTextSession(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get<UserData[]>('/text-sessions/available-doctors');
  }

  async getActiveTextSession(): Promise<any> { // Changed from ApiResponse to any
    return apiService.get('/text-sessions/active');
  }

  async startTextSession(doctorId: number): Promise<any> { // Changed from ApiResponse to any
    return apiService.post('/text-sessions/start', { doctor_id: doctorId });
  }

  async endTextSession(): Promise<any> { // Changed from ApiResponse to any
    return apiService.post('/text-sessions/end');
  }

  // File upload operations
  async uploadProfilePicture(file: File): Promise<any> { // Changed from ApiResponse to any
    const formData = new FormData();
    formData.append('file', file);
    return apiService.uploadFile<{ url: string }>('/upload/profile-picture', formData);
  }

  async uploadChatImage(file: File): Promise<any> { // Changed from ApiResponse to any
    const formData = new FormData();
    formData.append('file', file);
    return apiService.uploadFile<{ url: string }>('/upload/chat-image', formData);
  }

  // Real-time operations (WebSocket)
  subscribeToChatRoom(roomId: number, callback: (message: ChatMessage) => void): () => void {
    // This would connect to Laravel WebSocket server
    // For now, return a no-op unsubscribe function
    console.warn('WebSocket subscription not yet implemented');
    return () => {};
  }

  subscribeToUserUpdates(userId: number, callback: (user: UserData) => void): () => void {
    // This would connect to Laravel WebSocket server
    console.warn('WebSocket subscription not yet implemented');
    return () => {};
  }

  // Helper methods
  async testConnection(): Promise<boolean> {
    try {
      const response = await apiService.get('/health');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.getCurrentUser();
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export const laravelService = new LaravelService(); 