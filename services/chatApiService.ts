import { ApiResponse, apiService } from '../app/services/apiService';

// Chat interfaces matching Laravel backend
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
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
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
  sender?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  reactions?: MessageReaction[];
  read_by?: MessageRead[];
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface MessageRead {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface CreateChatRoomRequest {
  name?: string;
  type: 'private' | 'group';
  participant_ids: number[];
}

export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'file' | 'image' | 'audio' | 'video';
  file?: File;
  reply_to_id?: number;
}

export interface ChatRoomStatus {
  can_send_message: boolean;
  reason?: string;
  appointment_id?: number;
  session_active?: boolean;
  remaining_time?: number;
}

class ChatApiService {
  // Get user's chat rooms
  async getChatRooms(): Promise<ApiResponse<ChatRoom[]>> {
    return apiService.get<ChatRoom[]>('/chat/rooms');
  }

  // Get specific chat room with messages
  async getChatRoom(roomId: number, page: number = 1): Promise<ApiResponse<{
    room: ChatRoom;
    messages: ChatMessage[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get(`/chat/rooms/${roomId}`, { page });
  }

  // Create new chat room
  async createChatRoom(data: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> {
    return apiService.post<ChatRoom>('/chat/rooms', data);
  }

  // Send message to chat room
  async sendMessage(roomId: number, data: SendMessageRequest): Promise<ApiResponse<ChatMessage>> {
    if (data.file) {
      const formData = new FormData();
      formData.append('content', data.content);
      formData.append('message_type', data.message_type || 'file');
      formData.append('file', data.file);
      if (data.reply_to_id) {
        formData.append('reply_to_id', data.reply_to_id.toString());
      }
      
      return apiService.uploadFile<ChatMessage>(`/chat/rooms/${roomId}/messages`, formData);
    } else {
      return apiService.post<ChatMessage>(`/chat/rooms/${roomId}/messages`, data);
    }
  }

  // Mark messages as read
  async markAsRead(roomId: number, messageIds: number[]): Promise<ApiResponse<void>> {
    return apiService.post(`/chat/rooms/${roomId}/mark-read`, { message_ids: messageIds });
  }

  // Add reaction to message
  async addReaction(messageId: number, reaction: string): Promise<ApiResponse<MessageReaction>> {
    return apiService.post<MessageReaction>(`/chat/messages/${messageId}/reactions`, { reaction });
  }

  // Remove reaction from message
  async removeReaction(messageId: number, reaction: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/chat/messages/${messageId}/reactions/${reaction}`);
  }

  // Add participant to group chat
  async addParticipant(roomId: number, userId: number, role: 'admin' | 'member' = 'member'): Promise<ApiResponse<ChatParticipant>> {
    return apiService.post<ChatParticipant>(`/chat/rooms/${roomId}/participants`, {
      user_id: userId,
      role
    });
  }

  // Remove participant from group chat
  async removeParticipant(roomId: number, userId: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/chat/rooms/${roomId}/participants/${userId}`);
  }

  // Update participant role
  async updateParticipantRole(roomId: number, userId: number, role: 'admin' | 'member'): Promise<ApiResponse<ChatParticipant>> {
    return apiService.patch<ChatParticipant>(`/chat/rooms/${roomId}/participants/${userId}`, { role });
  }

  // Search messages in chat room
  async searchMessages(roomId: number, query: string, page: number = 1): Promise<ApiResponse<{
    messages: ChatMessage[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get(`/chat/rooms/${roomId}/search`, { query, page });
  }

  // Delete message (only for sender or admin)
  async deleteMessage(messageId: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/chat/messages/${messageId}`);
  }

  // Get chat room status (for checking if user can send messages)
  async getChatRoomStatus(roomId: number): Promise<ApiResponse<ChatRoomStatus>> {
    return apiService.get<ChatRoomStatus>(`/chat/rooms/${roomId}/status`);
  }

  // Leave group chat
  async leaveChatRoom(roomId: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/chat/rooms/${roomId}/leave`);
  }

  // Get typing status
  async setTypingStatus(roomId: number, isTyping: boolean): Promise<ApiResponse<void>> {
    return apiService.post(`/chat/rooms/${roomId}/typing`, { is_typing: isTyping });
  }

  // Get file upload URL for chat
  async getFileUploadUrl(roomId: number, fileName: string, fileSize: number): Promise<ApiResponse<{
    upload_url: string;
    file_url: string;
  }>> {
    return apiService.post(`/chat/rooms/${roomId}/upload-url`, {
      file_name: fileName,
      file_size: fileSize
    });
  }
}

export const chatApiService = new ChatApiService(); 