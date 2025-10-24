export interface ChatMessage {
  id: string | number; // Support both string and number IDs for compatibility - updated for WebRTC
  appointment_id?: number; // Made optional for WebRTC messages
  sender_id: number;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'voice';
  media_url?: string;
  created_at: string;
  timestamp?: string; // Made optional for WebRTC messages
  delivery_status: 'sending' | 'sent' | 'delivered' | 'read';
  read_by?: Array<{
    user_id: number;
    user_name: string;
    read_at: string;
  }>;
  temp_id?: string;
  is_own_message?: boolean; // Added for UI purposes
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
