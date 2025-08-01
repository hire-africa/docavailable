import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../app/services/apiService';

export interface Message {
  id: string;
  appointment_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'voice';
  media_url?: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  reactions?: MessageReaction[];
  read_by?: MessageRead[];
  is_edited?: boolean;
  edited_at?: string;
  reply_to_id?: string;
  reply_to_message?: string;
  reply_to_sender_name?: string;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read';
  temp_id?: string;
}

export interface MessageReaction {
  reaction: string;
  user_id: number;
  user_name: string;
  timestamp?: string;
}

export interface MessageRead {
  user_id: number;
  user_name: string;
  read_at: string;
}

export interface LocalStorageData {
  appointment_id: number;
  messages: Message[];
  last_sync: string;
  message_count: number;
}

class MessageStorageService {
  private readonly STORAGE_PREFIX = 'chat_messages_';
  private readonly SYNC_INTERVAL = 5000;
  private syncTimers: Map<number, ReturnType<typeof setInterval>> = new Map();
  private updateCallbacks: Map<number, (messages: Message[]) => void> = new Map();
  
  private errorLogTimestamps: Map<string, number> = new Map();
  private readonly ERROR_LOG_COOLDOWN = 10000;

  private logErrorOnce(message: string, error?: any, context?: string): void {
    const key = `${message}-${context || 'default'}`;
    const now = Date.now();
    const lastLog = this.errorLogTimestamps.get(key);
    
    if (!lastLog || (now - lastLog) > this.ERROR_LOG_COOLDOWN) {
      this.errorLogTimestamps.set(key, now);
      console.error(message, error);
    }
  }

  async storeMessage(appointmentId: number, message: Message): Promise<void> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await this.getLocalData(appointmentId);
      
      const exists = data.messages.some(m => m.id === message.id);
      if (!exists) {
        data.messages.push(message);
        data.message_count = data.messages.length;
        data.last_sync = new Date().toISOString();
        
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      this.logErrorOnce('Error storing message locally:', error, `appointment-${appointmentId}`);
    }
  }

  async getMessages(appointmentId: number): Promise<Message[]> {
    try {
      const data = await this.getLocalData(appointmentId);
      return data.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch (error) {
      this.logErrorOnce('Error getting messages from local storage:', error, `appointment-${appointmentId}`);
      return [];
    }
  }

  async loadFromServer(appointmentId: number): Promise<Message[]> {
    try {
      const response = await apiService.get(`/chat/${appointmentId}/local-storage`);
      
      if (response.success && response.data) {
        const serverData = response.data as LocalStorageData;
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(serverData));
        return serverData.messages;
      }
      
      return [];
    } catch (error) {
      this.logErrorOnce('Error loading messages from server:', error, `appointment-${appointmentId}`);
      return [];
    }
  }

  async sendMessage(appointmentId: number, messageText: string, senderId: number, senderName: string): Promise<Message | null> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: messageId,
        appointment_id: appointmentId,
        sender_id: senderId,
        sender_name: senderName,
        message: messageText,
        message_type: 'text',
        delivery_status: 'sending',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await this.storeMessage(appointmentId, message);
      
      const callback = this.updateCallbacks.get(appointmentId);
      if (callback) {
        const currentMessages = await this.getMessages(appointmentId);
        callback(currentMessages);
      }
      
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: messageText,
        message_type: 'text'
      });
      
      if (response.success && response.data) {
        const serverMessage = response.data as Message;
        await this.updateMessageInStorage(appointmentId, messageId, serverMessage);
        
        if (callback) {
          const updatedMessages = await this.getMessages(appointmentId);
          callback(updatedMessages);
        }
        
        return serverMessage;
      }
      
      return message;
    } catch (error) {
      this.logErrorOnce('Error sending message:', error, `appointment-${appointmentId}`);
      return null;
    }
  }

  private async updateMessageInStorage(appointmentId: number, tempId: string, updatedMessage: Message): Promise<void> {
    try {
      const data = await this.getLocalData(appointmentId);
      const messageIndex = data.messages.findIndex(m => m.id === tempId);
      
      if (messageIndex !== -1) {
        data.messages[messageIndex] = updatedMessage;
        data.last_sync = new Date().toISOString();
        
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(data));
        
        const callback = this.updateCallbacks.get(appointmentId);
        if (callback) {
          callback(data.messages);
        }
      }
    } catch (error) {
      this.logErrorOnce('Error updating message in storage:', error, `message-${tempId}`);
    }
  }

  registerUpdateCallback(appointmentId: number, callback: (messages: Message[]) => void): void {
    this.updateCallbacks.set(appointmentId, callback);
  }

  unregisterUpdateCallback(appointmentId: number): void {
    this.updateCallbacks.delete(appointmentId);
  }

  startAutoSync(appointmentId: number): void {
    this.stopAutoSync(appointmentId);
    
    const timer = setInterval(async () => {
      try {
        const serverMessages = await this.loadFromServer(appointmentId);
        
        if (serverMessages.length > 0) {
          const callback = this.updateCallbacks.get(appointmentId);
          if (callback) {
            const localMessages = await this.getMessages(appointmentId);
            const allMessages = [...localMessages, ...serverMessages];
            callback(allMessages);
          }
        }
      } catch (error: any) {
        // Silent error handling
      }
    }, this.SYNC_INTERVAL);
    
    this.syncTimers.set(appointmentId, timer);
  }

  stopAutoSync(appointmentId: number): void {
    const timer = this.syncTimers.get(appointmentId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(appointmentId);
    }
  }

  private async getLocalData(appointmentId: number): Promise<LocalStorageData> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return {
        appointment_id: appointmentId,
        messages: [],
        last_sync: new Date().toISOString(),
        message_count: 0
      };
    } catch (error) {
      this.logErrorOnce('Error getting local data:', error, `appointment-${appointmentId}`);
      return {
        appointment_id: appointmentId,
        messages: [],
        last_sync: new Date().toISOString(),
        message_count: 0
      };
    }
  }

  private getStorageKey(appointmentId: number): string {
    return `${this.STORAGE_PREFIX}${appointmentId}`;
  }
}

export const messageStorageService = new MessageStorageService();
