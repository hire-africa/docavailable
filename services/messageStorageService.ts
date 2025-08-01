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
  // reactions?: MessageReaction[]; // COMMENTED OUT
  // read_by?: MessageRead[]; // COMMENTED OUT
  // is_edited?: boolean; // COMMENTED OUT
  // edited_at?: string; // COMMENTED OUT
  // reply_to_id?: string; // COMMENTED OUT
  // reply_to_message?: string; // COMMENTED OUT
  // reply_to_sender_name?: string; // COMMENTED OUT
  // delivery_status?: 'sending' | 'sent' | 'delivered' | 'read'; // COMMENTED OUT
  temp_id?: string;
}

// export interface MessageReaction { // COMMENTED OUT
//   reaction: string;
//   user_id: number;
//   user_name: string;
//   timestamp?: string;
// }

// export interface MessageRead { // COMMENTED OUT
//   user_id: number;
//   user_name: string;
//   read_at: string;
// }

export interface LocalStorageData {
  appointment_id: number;
  messages: Message[];
  last_sync: string;
  message_count: number;
}

class MessageStorageService {
  private readonly STORAGE_PREFIX = 'chat_messages_';
  private readonly SYNC_INTERVAL = 5000; // 30 seconds - much longer interval
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

  // private async checkConnectivity(): Promise<boolean> { // COMMENTED OUT
  //   const now = Date.now();
  //   if (now - this.lastConnectivityCheck < this.CONNECTIVITY_CHECK_INTERVAL) {
  //     return !this.offlineMode;
  //   }
  //   
  //   this.lastConnectivityCheck = now;
  //   
  //   try {
  //     const isConnected = await apiService.checkConnectivity();
  //     this.offlineMode = !isConnected;
  //     
  //     if (this.offlineMode) {
  //       console.log('📱 MessageStorageService: Entering offline mode');
  //     } else {
  //       console.log('📱 MessageStorageService: Back online');
  //     }
  //     
  //     return isConnected;
  //   } catch (error) {
  //     this.offlineMode = true;
  //     console.log('📱 MessageStorageService: Connectivity check failed, staying offline');
  //     return false;
  //   }
  // }

  private async notifyCallbacks(appointmentId: number, messages: Message[]): Promise<void> {
    const callback = this.updateCallbacks.get(appointmentId);
    if (callback) {
      // Sort messages by creation time
      const sortedMessages = messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      callback(sortedMessages);
    }
  }

  // private async mergeMessages(localMessages: Message[], serverMessages: Message[]): Promise<Message[]> { // COMMENTED OUT
  //   const mergedMap = new Map<string, Message>();
  //   
  //   // Add local messages first
  //   localMessages.forEach(message => {
  //     mergedMap.set(message.id, message);
  //     // Also track by temp_id for pending messages
  //     if (message.temp_id) {
  //       mergedMap.set(message.temp_id, message);
  //     }
  //   });
  //   
  //   // Merge server messages, handling duplicates
  //   serverMessages.forEach(serverMessage => {
  //     // Check if we have a local message with this temp_id
  //     const existingByTempId = Array.from(mergedMap.values()).find(
  //       localMsg => localMsg.temp_id === serverMessage.id || localMsg.id === serverMessage.id
  //     );
  //     
  //     if (existingByTempId) {
  //       // Update existing message with server data but preserve local delivery status
  //       const updatedMessage = {
  //         ...serverMessage,
  //         delivery_status: existingByTempId.delivery_status === 'sending' ? 'sent' : serverMessage.delivery_status,
  //         temp_id: existingByTempId.temp_id // Preserve temp_id for tracking
  //       };
  //       mergedMap.set(serverMessage.id, updatedMessage);
  //       
  //       // Remove the temp_id version if it exists
  //       if (existingByTempId.temp_id && existingByTempId.temp_id !== serverMessage.id) {
  //         mergedMap.delete(existingByTempId.temp_id);
  //       }
  //     } else {
  //       // New server message
  //       mergedMap.set(serverMessage.id, serverMessage);
  //     }
  //   });
  //   
  //   return Array.from(mergedMap.values());
  // }

  async storeMessage(appointmentId: number, message: Message): Promise<void> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await this.getLocalData(appointmentId);
      
      // Check for duplicates by id or temp_id
      const exists = data.messages.some(m => 
        m.id === message.id || 
        (message.temp_id && m.temp_id === message.temp_id) ||
        (m.temp_id && message.id === m.temp_id)
      );
      
      if (!exists) {
        data.messages.push(message);
        data.message_count = data.messages.length;
        data.last_sync = new Date().toISOString();
        
        await AsyncStorage.setItem(key, JSON.stringify(data));
        
        // Notify callbacks only once
        await this.notifyCallbacks(appointmentId, data.messages);
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
        
        // Update local storage with server data
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(serverData));
        
        // Notify callbacks with server messages
        await this.notifyCallbacks(appointmentId, serverData.messages);
        
        return serverData.messages;
      }
      
      return [];
    } catch (error) {
      this.logErrorOnce('Error loading messages from server:', error, `appointment-${appointmentId}`);
      // Return local messages on error
      return await this.getMessages(appointmentId);
    }
  }

  async sendMessage(appointmentId: number, messageText: string, senderId: number, senderName: string): Promise<Message | null> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: tempId, // Use temp_id as id initially
        appointment_id: appointmentId,
        sender_id: senderId,
        sender_name: senderName,
        message: messageText,
        message_type: 'text',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        temp_id: tempId // Store temp_id for tracking
      };
      
      // Store message locally first
      await this.storeMessage(appointmentId, message);
      
      // Send to server with temp_id for duplicate detection
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: messageText,
        message_type: 'text',
        temp_id: tempId // Send temp_id to backend
      });
      
      if (response.success && response.data) {
        const serverMessage = response.data as Message;
        
        // Update message with server response
        await this.updateMessageInStorage(appointmentId, tempId, serverMessage);
        
        return serverMessage;
      } else {
        return message;
      }
    } catch (error) {
      this.logErrorOnce('Error sending message:', error, `appointment-${appointmentId}`);
      return null;
    }
  }

  private async updateMessageInStorage(appointmentId: number, tempId: string, updatedMessage: Message): Promise<void> {
    try {
      const data = await this.getLocalData(appointmentId);
      const messageIndex = data.messages.findIndex(m => 
        m.id === tempId || m.temp_id === tempId
      );
      
      if (messageIndex !== -1) {
        // Update the message with server data
        data.messages[messageIndex] = {
          ...updatedMessage,
          temp_id: tempId, // Preserve temp_id for tracking
        };
        
        data.last_sync = new Date().toISOString();
        
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(data));
        
        // Notify callbacks only once
        await this.notifyCallbacks(appointmentId, data.messages);
      }
    } catch (error) {
      this.logErrorOnce('Error updating message in storage:', error, `message-${tempId}`);
    }
  }

  // private async updateMessageDeliveryStatus(appointmentId: number, messageId: string, status: 'sending' | 'sent' | 'delivered' | 'read'): Promise<void> { // COMMENTED OUT
  //   try {
  //     const data = await this.getLocalData(appointmentId);
  //     const messageIndex = data.messages.findIndex(m => 
  //       m.id === messageId || m.temp_id === messageId
  //     );
  //     
  //     if (messageIndex !== -1) {
  //       data.messages[messageIndex].delivery_status = status;
  //       data.last_sync = new Date().toISOString();
  //       
  //       const key = this.getStorageKey(appointmentId);
  //       await AsyncStorage.setItem(key, JSON.stringify(data));
  //       
  //       // Notify callbacks only once
  //       await this.notifyCallbacks(appointmentId, data.messages);
  //     }
  //   } catch (error) {
  //     this.logErrorOnce('Error updating message delivery status:', error, `message-${messageId}`);
  //   }
  // }

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
        // Only sync if there are no pending messages to avoid conflicts
        // This is a simplified check. In a real app, you'd have a pendingMessages map
        // and only sync if there are no pending messages for this appointment.
        // For now, we'll just check if the last sync was recent.
        const data = await this.getLocalData(appointmentId);
        const lastSyncTime = new Date(data.last_sync).getTime();
        const now = Date.now();

        if (now - lastSyncTime > this.SYNC_INTERVAL) {
          await this.loadFromServer(appointmentId);
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

  async preloadMessages(appointmentId: number): Promise<void> {
    try {
      // Preload messages from server for better performance
      await this.loadFromServer(appointmentId);
    } catch (error) {
      this.logErrorOnce('Error preloading messages:', error, `appointment-${appointmentId}`);
    }
  }

  async getMessagesOptimized(appointmentId: number): Promise<Message[]> {
    try {
      // Get messages with optimized loading
      const messages = await this.getMessages(appointmentId);
      return messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch (error) {
      this.logErrorOnce('Error getting optimized messages:', error, `appointment-${appointmentId}`);
      return [];
    }
  }

  // async markMessagesAsRead(appointmentId: number, userId: number): Promise<void> { // COMMENTED OUT
  //   try {
  //     // Mark messages as read locally
  //     const data = await this.getLocalData(appointmentId);
  //     const updatedMessages = data.messages.map(message => {
  //       if (!message.read_by) {
  //         message.read_by = [];
  //       }
  //       
  //       const alreadyRead = message.read_by.some(read => read.user_id === userId);
  //       if (!alreadyRead) {
  //         message.read_by.push({
  //           user_id: userId,
  //           user_name: `User ${userId}`, // This should be replaced with actual user name
  //           read_at: new Date().toISOString()
  //         });
  //       }
  //       return message;
  //     });
  //     
  //     data.messages = updatedMessages;
  //     data.last_sync = new Date().toISOString();
  //     
  //     const key = this.getStorageKey(appointmentId);
  //     await AsyncStorage.setItem(key, JSON.stringify(data));
  //     
  //     // Check connectivity before notifying server
  //     const isConnected = await this.checkConnectivity();
  //     if (isConnected) {
  //       try {
  //         await apiService.post(`/chat/${appointmentId}/mark-read`, {
  //           user_id: userId,
  //           timestamp: new Date().toISOString()
  //         });
  //       } catch (error) {
  //         // Silent error for server notification
  //       }
  //     }
  //   } catch (error) {
  //     this.logErrorOnce('Error marking messages as read:', error, `appointment-${appointmentId}`);
  //   }
  // }

  // async startTyping(appointmentId: number, userId: number, userName: string): Promise<void> { // COMMENTED OUT
  //   try {
  //     const isConnected = await this.checkConnectivity();
  //     if (!isConnected) {
  //       console.log('📱 MessageStorageService: Skipping typing indicator - offline mode');
  //       return;
  //     }
  //     
  //     await apiService.post(`/chat/${appointmentId}/typing/start`, {
  //       user_id: userId,
  //       user_name: userName
  //     });
  //   } catch (error) {
  //     this.logErrorOnce('Error starting typing indicator:', error, `appointment-${appointmentId}`);
  //   }
  // }

  // async stopTyping(appointmentId: number, userId: number): Promise<void> { // COMMENTED OUT
  //   try {
  //     const isConnected = await this.checkConnectivity();
  //     if (!isConnected) {
  //       console.log('📱 MessageStorageService: Skipping typing indicator - offline mode');
  //     }
  //     
  //     await apiService.post(`/chat/${appointmentId}/typing/stop`, {
  //       user_id: userId
  //     });
  //   } catch (error) {
  //     this.logErrorOnce('Error stopping typing indicator:', error, `appointment-${appointmentId}`);
  //   }
  // }
}

export const messageStorageService = new MessageStorageService();
