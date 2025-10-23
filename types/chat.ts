export interface ChatMessage {
  id: number;
  appointment_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'voice';
  media_url?: string;
  created_at: string;
  timestamp: string;
  delivery_status: 'sending' | 'sent' | 'delivered' | 'read';
  read_by?: Array<{
    user_id: number;
    user_name: string;
    read_at: string;
  }>;
  temp_id?: string;
}

export interface ChatConfig {
  baseUrl: string;
  appointmentId: string;
  userId: number;
  userName: string;
  apiKey: string;
  sessionType?: 'appointment' | 'text_session' | 'instant';
  webrtcConfig?: {
    signalingUrl: string;
    chatSignalingUrl: string;
  };
}

export interface ChatEvents {
  onMessage: (message: ChatMessage) => void;
  onError: (error: string) => void;
  onSessionEnded?: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => void;
}
