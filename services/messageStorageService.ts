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
        
        // Merge server data with local data to preserve local read receipts
        const localData = await this.getLocalData(appointmentId);
        const mergedMessages = this.mergeMessagesWithReadReceipts(localData.messages, serverData.messages);
        
        // Update local storage with merged data
        const updatedData = {
          ...serverData,
          messages: mergedMessages,
          last_sync: new Date().toISOString()
        };
        
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(updatedData));
        
        // Notify callbacks with merged messages
        await this.notifyCallbacks(appointmentId, mergedMessages);
        
        return mergedMessages;
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
        delivery_status: 'sending',
        temp_id: tempId // Store temp_id for tracking
      };
      
      // Store message locally first
      await this.storeMessage(appointmentId, message);
      
      // Update delivery status to 'sent'
      console.log(`📤 Message sent, updating status to 'sent' for tempId: ${tempId}`);
      await this.updateMessageDeliveryStatus(appointmentId, tempId, 'sent');
      
      // Send to server with temp_id for duplicate detection
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: messageText,
        message_type: 'text',
        temp_id: tempId // Send temp_id to backend
      });
      
      if (response.success && response.data) {
        const serverMessage = response.data as Message;
        
        // Update message with server response and mark as delivered
        console.log(`📤 Message delivered, updating status to 'delivered' for messageId: ${serverMessage.id}`);
        await this.updateMessageInStorage(appointmentId, tempId, serverMessage);
        await this.updateMessageDeliveryStatus(appointmentId, serverMessage.id, 'delivered');
        
        return serverMessage;
      } else {
        // If server request failed, keep as 'sent' status
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
        const existingMessage = data.messages[messageIndex];
        
        // STRONG PROTECTION: Never allow delivery status downgrades
        let deliveryStatus = updatedMessage.delivery_status;
        if (existingMessage.delivery_status && updatedMessage.delivery_status) {
          const localStatus = this.getDeliveryStatusPriority(existingMessage.delivery_status);
          const serverStatus = this.getDeliveryStatusPriority(updatedMessage.delivery_status);
          
          console.log(`🔍 updateMessageInStorage: Comparing delivery status for message ${tempId}: local=${existingMessage.delivery_status}(${localStatus}) vs server=${updatedMessage.delivery_status}(${serverStatus})`);
          
          // ALWAYS preserve local status if it's higher or equal
          if (localStatus >= serverStatus) {
            deliveryStatus = existingMessage.delivery_status;
            console.log(`✅ PROTECTED: Preserved local delivery status: ${existingMessage.delivery_status} over server: ${updatedMessage.delivery_status}`);
          } else {
            // This should never happen, but log it as a warning
            console.log(`⚠️ WARNING: Server tried to downgrade delivery status from ${existingMessage.delivery_status} to ${updatedMessage.delivery_status} - BLOCKED`);
            deliveryStatus = existingMessage.delivery_status;
          }
        } else if (existingMessage.delivery_status && !updatedMessage.delivery_status) {
          // If server doesn't have delivery status but local does, preserve local
          deliveryStatus = existingMessage.delivery_status;
          console.log(`✅ PROTECTED: Preserved local delivery status when server had none: ${existingMessage.delivery_status}`);
        }
        
        // Update the message with server data but preserve local delivery status
        data.messages[messageIndex] = {
          ...updatedMessage,
          delivery_status: deliveryStatus,
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
        // Silent error handling for auto-sync to prevent spam
        this.logErrorOnce('Auto-sync error:', error, `auto-sync-${appointmentId}`);
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

  private getDeliveryStatusPriority(status: 'sending' | 'sent' | 'delivered' | 'read'): number {
    switch (status) {
      case 'sending': return 1;
      case 'sent': return 2;
      case 'delivered': return 3;
      case 'read': return 4;
      default: return 0;
    }
  }

  private mergeMessagesWithReadReceipts(localMessages: Message[], serverMessages: Message[]): Message[] {
    const mergedMap = new Map<string, Message>();
    
    // Add server messages first (server is authoritative for message content)
    serverMessages.forEach(message => {
      mergedMap.set(message.id, message);
    });
    
    // Merge local data (read receipts and delivery status) into server messages
    let mergedReadReceipts = 0;
    let mergedDeliveryStatus = 0;
    let protectedDeliveryStatus = 0;
    localMessages.forEach(localMessage => {
      const serverMessage = mergedMap.get(localMessage.id);
      if (serverMessage) {
        // Merge read receipts
        if (localMessage.read_by && localMessage.read_by.length > 0) {
          // Initialize read_by array if it doesn't exist
          if (!serverMessage.read_by) {
            serverMessage.read_by = [];
          }
          
          // Merge read receipts, avoiding duplicates
          localMessage.read_by.forEach(localRead => {
            const alreadyExists = serverMessage.read_by!.some(
              serverRead => serverRead.user_id === localRead.user_id
            );
            if (!alreadyExists) {
              serverMessage.read_by!.push(localRead);
              mergedReadReceipts++;
            }
          });
        }
        
        // STRONG PROTECTION: Never allow delivery status downgrades, BUT allow upgrades for read receipts
        if (localMessage.delivery_status && serverMessage.delivery_status) {
          const localStatus = this.getDeliveryStatusPriority(localMessage.delivery_status);
          const serverStatus = this.getDeliveryStatusPriority(serverMessage.delivery_status);
          
          // SPECIAL CASE: Allow upgrade from 'delivered' to 'read' when server has read receipts
          if (localMessage.delivery_status === 'delivered' && serverMessage.delivery_status === 'read' && 
              serverMessage.read_by && serverMessage.read_by.length > 0) {
            serverMessage.delivery_status = 'read';
            mergedDeliveryStatus++;
          }
          // ALWAYS preserve local status if it's higher or equal (for other cases)
          else if (localStatus >= serverStatus) {
            serverMessage.delivery_status = localMessage.delivery_status;
            mergedDeliveryStatus++;
          } else {
            // This should never happen, but log it as a warning
            console.log(`⚠️ WARNING: Server tried to downgrade delivery status from ${localMessage.delivery_status} to ${serverMessage.delivery_status} - BLOCKED`);
            serverMessage.delivery_status = localMessage.delivery_status;
            protectedDeliveryStatus++;
          }
        } else if (localMessage.delivery_status && !serverMessage.delivery_status) {
          // If server doesn't have delivery status but local does, preserve local
          serverMessage.delivery_status = localMessage.delivery_status;
          mergedDeliveryStatus++;
        }
      }
    });
    

    
    return Array.from(mergedMap.values()).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
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

  async markMessagesAsRead(appointmentId: number, userId: number): Promise<void> {
    try {
      // Mark messages as read locally
      const data = await this.getLocalData(appointmentId);
      
      const updatedMessages = data.messages.map(message => {
        if (!message.read_by) {
          message.read_by = [];
        }
        
        const alreadyRead = message.read_by.some(read => read.user_id === userId);
        if (!alreadyRead) {
          message.read_by.push({
            user_id: userId,
            user_name: `User ${userId}`, // This should be replaced with actual user name
            read_at: new Date().toISOString()
          });
          
          // Update delivery status to 'read' for messages that are now read
          if (message.sender_id !== userId) {
            // Check if this message should be marked as read (has read_by entries)
            const hasReadEntries = message.read_by && message.read_by.length > 0;
            
            if (hasReadEntries && message.delivery_status !== 'read') {
              message.delivery_status = 'read';
            } else if (!message.delivery_status && hasReadEntries) {
              // If no delivery status but has read entries, set it to 'read'
              message.delivery_status = 'read';
            }
          }
        }
        return message;
      });
      
      data.messages = updatedMessages;
      data.last_sync = new Date().toISOString();
      
      const key = this.getStorageKey(appointmentId);
      await AsyncStorage.setItem(key, JSON.stringify(data));
      
      // Notify callbacks
      await this.notifyCallbacks(appointmentId, data.messages);
      
      // Notify server with improved error handling and retry logic
      try {
        const response = await apiService.post(`/chat/${appointmentId}/mark-read`, {
          user_id: userId,
          timestamp: new Date().toISOString()
        });
        
        if (!response.success) {
          console.log('❌ Server returned error for mark-read:', response.message);
        }
      } catch (error: any) {
        // Log error but don't throw to prevent infinite loops
        console.log('❌ Failed to notify server of read status:', error?.message || error);
        
        // Don't retry on timeout errors to prevent infinite loops
        if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
          return;
        }
        
        // For other errors, we could implement a retry mechanism in the future
        // For now, just log the error and continue
      }
    } catch (error) {
      this.logErrorOnce('Error marking messages as read:', error, `appointment-${appointmentId}`);
    }
  }

  async updateMessageDeliveryStatus(appointmentId: number, messageId: string, status: 'sending' | 'sent' | 'delivered' | 'read'): Promise<void> {
    try {
      const data = await this.getLocalData(appointmentId);
      const messageIndex = data.messages.findIndex(m => 
        m.id === messageId || m.temp_id === messageId
      );
      
      if (messageIndex !== -1) {
        const oldStatus = data.messages[messageIndex].delivery_status;
        data.messages[messageIndex].delivery_status = status;
        data.last_sync = new Date().toISOString();
        
        console.log(`📤 Delivery status updated: ${oldStatus} → ${status} for messageId: ${messageId}`);
        
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(data));
        
        // Notify callbacks
        await this.notifyCallbacks(appointmentId, data.messages);
      }
    } catch (error) {
      this.logErrorOnce('Error updating message delivery status:', error, `message-${messageId}`);
    }
  }

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
