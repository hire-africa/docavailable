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
  private readonly SYNC_INTERVAL = 15000; // 15 seconds base interval (increased from 5s)
  private readonly ACTIVE_SYNC_INTERVAL = 5000; // 5 seconds when active (increased from 3s)
  private readonly IDLE_SYNC_INTERVAL = 30000; // 30 seconds when idle (increased from 15s)
  private readonly MAX_ERRORS = 3;
  private readonly ERROR_BACKOFF_MULTIPLIER = 2;
  private syncTimers: Map<number, ReturnType<typeof setInterval>> = new Map();
  private updateCallbacks: Map<number, (messages: Message[]) => void> = new Map();
  private syncInProgress: Map<number, boolean> = new Map();
  private consecutiveErrors: Map<number, number> = new Map();
  
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

  // Check if user is authenticated before making API calls
  private async isAuthenticated(): Promise<boolean> {
    try {
      const token = await apiService.getAuthToken();
      return !!token;
    } catch (error) {
      return false;
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
      try {
        // Sort messages by creation time
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        callback(sortedMessages);
      } catch (error) {
        this.logErrorOnce('Error in update callback:', error, `callback-${appointmentId}`);
      }
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
      
      // For image messages, also check by media_url to prevent duplicates
      let imageExists = false;
      if (message.message_type === 'image' && message.media_url) {
        imageExists = data.messages.some(m => 
          m.message_type === 'image' && 
          m.media_url === message.media_url &&
          m.sender_id === message.sender_id
        );
      }
      
      if (!exists && !imageExists) {
        // Special protection for image messages
        if (message.message_type === 'image') {
          console.log(`🔒 Storing image message with strong protection: ${message.id}`);
          console.log(`📷 Image message details:`, {
            id: message.id,
            temp_id: message.temp_id,
            media_url: message.media_url?.substring(0, 50) + '...',
            sender_id: message.sender_id,
            delivery_status: message.delivery_status
          });
        }
        
        data.messages.push(message);
        data.message_count = data.messages.length;
        data.last_sync = new Date().toISOString();
        
        await AsyncStorage.setItem(key, JSON.stringify(data));
        
        // Notify callbacks only once
        await this.notifyCallbacks(appointmentId, data.messages);
        
        if (message.message_type === 'image') {
          console.log(`✅ Image message stored successfully: ${message.id}`);
        }
      } else {
        if (message.message_type === 'image') {
          console.log(`⚠️ Image message duplicate detected:`, {
            id: message.id,
            temp_id: message.temp_id,
            media_url: message.media_url?.substring(0, 50) + '...',
            exists,
            imageExists
          });
        } else {
          console.log(`⚠️ Duplicate message detected, skipping: ${message.id}`);
        }
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
      // Check authentication before making API call
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('❌ User not authenticated, skipping server load');
        return await this.getMessages(appointmentId);
      }

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
      // Check authentication before sending message
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('❌ User not authenticated, cannot send message');
        return null;
      }

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
        // Nudge an immediate sync so recipients see it faster
        setTimeout(() => {
          this.forceSync(appointmentId).catch(() => undefined);
        }, 300);
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

  async sendVoiceMessage(appointmentId: number, mediaUrl: string, senderId: number, senderName: string, voiceMessageId?: string): Promise<Message | null> {
    try {
      // Check authentication before sending message
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('❌ User not authenticated, cannot send voice message');
        return null;
      }

      const tempId = voiceMessageId || `voice_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: tempId,
        appointment_id: appointmentId,
        sender_id: senderId,
        sender_name: senderName,
        message: `🎤 Voice message (${tempId.substring(-8)})`, // Include unique identifier in message
        message_type: 'voice',
        media_url: mediaUrl,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_status: 'sending',
        temp_id: tempId
      };
      
      // Store message locally first
      await this.storeMessage(appointmentId, message);
      
      // Update delivery status to 'sent'
      console.log(`📤 Voice message sent, updating status to 'sent' for tempId: ${tempId}`);
      await this.updateMessageDeliveryStatus(appointmentId, tempId, 'sent');
      
      // Send to server with temp_id for duplicate detection
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: '🎤 Voice message',
        message_type: 'voice',
        media_url: mediaUrl,
        temp_id: tempId
      });
      
      if (response.success && response.data) {
        const serverMessage = response.data as Message;
        
        // Update message with server response and mark as delivered
        console.log(`📤 Voice message delivered, updating status to 'delivered' for messageId: ${serverMessage.id}`);
        await this.updateMessageInStorage(appointmentId, tempId, serverMessage);
        await this.updateMessageDeliveryStatus(appointmentId, serverMessage.id, 'delivered');
        // Immediate sync for faster propagation
        setTimeout(() => {
          this.forceSync(appointmentId).catch(() => undefined);
        }, 300);
        
        return serverMessage;
      } else {
        // If server request failed, keep as 'sent' status
        return message;
      }
    } catch (error) {
      this.logErrorOnce('Error sending voice message:', error, `appointment-${appointmentId}`);
      return null;
    }
  }

  async sendImageMessage(appointmentId: number, mediaUrl: string, senderId: number, senderName: string, imageMessageId?: string): Promise<Message | null> {
    try {
      // Check authentication before sending message
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('❌ User not authenticated, cannot send image message');
        return null;
      }

      const tempId = imageMessageId || `image_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: tempId,
        appointment_id: appointmentId,
        sender_id: senderId,
        sender_name: senderName,
        message: `📷 Image message (${tempId.substring(-8)})`, // Include unique identifier in message
        message_type: 'image',
        media_url: mediaUrl,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_status: 'sending',
        temp_id: tempId
      };
      
      // Store message locally first
      await this.storeMessage(appointmentId, message);
      
      // Add a small delay to ensure local storage is complete before any sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update delivery status to 'sent'
      console.log(`📤 Image message sent, updating status to 'sent' for tempId: ${tempId}`);
      await this.updateMessageDeliveryStatus(appointmentId, tempId, 'sent');
      
      // Send to server with temp_id for duplicate detection
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: '📷 Image message',
        message_type: 'image',
        media_url: mediaUrl,
        temp_id: tempId
      });
      
      if (response.success && response.data) {
        const serverMessage = response.data as Message;
        
        console.log(`📤 Server response for image message:`, {
          id: serverMessage.id,
          temp_id: serverMessage.temp_id,
          media_url: serverMessage.media_url?.substring(0, 50) + '...',
          message_type: serverMessage.message_type,
          delivery_status: serverMessage.delivery_status
        });
        
        // Check if server response is missing critical fields
        if (!serverMessage.media_url) {
          console.log(`⚠️ WARNING: Server response missing media_url, will preserve local media_url`);
        }
        if (serverMessage.message_type !== 'image') {
          console.log(`⚠️ WARNING: Server response has wrong message_type: ${serverMessage.message_type}, will preserve local`);
        }
        
        // Update message with server response and mark as delivered
        console.log(`📤 Image message delivered, updating status to 'delivered' for messageId: ${serverMessage.id}`);
        await this.updateMessageInStorage(appointmentId, tempId, serverMessage);
        await this.updateMessageDeliveryStatus(appointmentId, serverMessage.id, 'delivered');
        // Immediate sync for faster propagation
        setTimeout(() => {
          this.forceSync(appointmentId).catch(() => undefined);
        }, 300);
        
        return serverMessage;
      } else {
        // If server request failed, keep as 'sent' status
        return message;
      }
    } catch (error) {
      this.logErrorOnce('Error sending image message:', error, `appointment-${appointmentId}`);
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
        
        // Update the message with server data but preserve local delivery status and media_url
        data.messages[messageIndex] = {
          ...updatedMessage,
          delivery_status: deliveryStatus,
          temp_id: tempId, // Preserve temp_id for tracking
          // CRITICAL: Preserve the original media_url if server doesn't have it
          media_url: updatedMessage.media_url || existingMessage.media_url,
          // Ensure message_type is preserved
          message_type: updatedMessage.message_type || existingMessage.message_type,
        };
        
        console.log(`📤 Updated image message in storage:`, {
          id: data.messages[messageIndex].id,
          temp_id: data.messages[messageIndex].temp_id,
          media_url: data.messages[messageIndex].media_url?.substring(0, 50) + '...',
          delivery_status: data.messages[messageIndex].delivery_status
        });
        
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

    // Initialize tracking
    this.syncInProgress.set(appointmentId, false);
    this.consecutiveErrors.set(appointmentId, 0);

    // Helper to schedule the next sync with optional backoff
    const scheduleNextSync = (delayMs: number) => {
      // Clear any existing timer before scheduling a new one
      const existing = this.syncTimers.get(appointmentId);
      if (existing) {
        clearTimeout(existing as unknown as number);
      }
      const timer = setTimeout(async () => {
        await performSync();
      }, delayMs) as unknown as ReturnType<typeof setInterval>;
      this.syncTimers.set(appointmentId, timer);
    };

    const performSync = async () => {
      // Prevent overlapping syncs
      if (this.syncInProgress.get(appointmentId)) {
        return;
      }
      this.syncInProgress.set(appointmentId, true);

      try {
        // Ensure user is authenticated before polling
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
          // Try again later without counting as an error
          scheduleNextSync(this.SYNC_INTERVAL);
          return;
        }

        await this.loadFromServer(appointmentId);

        // Reset error counter on success and schedule next run at base interval
        this.consecutiveErrors.set(appointmentId, 0);
        scheduleNextSync(this.SYNC_INTERVAL);
      } catch (error) {
        // Backoff on errors
        const prev = this.consecutiveErrors.get(appointmentId) || 0;
        const currentErrors = prev + 1;
        this.consecutiveErrors.set(appointmentId, currentErrors);

        // Exponential backoff up to 60s
        const backoff = Math.min(this.SYNC_INTERVAL * Math.pow(2, currentErrors), 60000);
        scheduleNextSync(backoff);
      } finally {
        this.syncInProgress.set(appointmentId, false);
      }
    };

    // Kick off first sync shortly after start to avoid blocking UI thread
    scheduleNextSync(250);
  }

  stopAutoSync(appointmentId: number): void {
    const timer = this.syncTimers.get(appointmentId);
    if (timer) {
      clearTimeout(timer as unknown as number);
      this.syncTimers.delete(appointmentId);
    }
    // Clean up tracking maps
    this.syncInProgress.delete(appointmentId);
    this.consecutiveErrors.delete(appointmentId);
  }

  // Allow manual immediate sync (e.g., after sending a message)
  async forceSync(appointmentId: number): Promise<void> {
    try {
      // Perform an immediate sync and then resume normal schedule
      await this.loadFromServer(appointmentId);
      // After force sync, reset error counter and reschedule base interval
      this.consecutiveErrors.set(appointmentId, 0);
      const existing = this.syncTimers.get(appointmentId);
      if (existing) {
        clearTimeout(existing as unknown as number);
      }
      const timer = setTimeout(async () => {
        // Chain back into the normal loop
        this.startAutoSync(appointmentId);
      }, this.SYNC_INTERVAL) as unknown as ReturnType<typeof setInterval>;
      this.syncTimers.set(appointmentId, timer);
    } catch (error) {
      this.logErrorOnce('Error during forceSync:', error, `appointment-${appointmentId}`);
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
    let preservedLocalMessages = 0;
    
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
      } else {
        // CRITICAL FIX: Preserve local messages that don't exist on server yet
        // This prevents newly sent messages (especially images) from disappearing
        // Only log occasionally to reduce spam (10% chance)
        if (Math.random() < 0.1) {
          console.log(`🔒 PRESERVING local message not on server: ${localMessage.id} (${localMessage.message_type})`);
        }
        mergedMap.set(localMessage.id, localMessage);
        preservedLocalMessages++;
      }
    });
    
    // Only log merge stats occasionally to reduce spam (5% chance)
    if (Math.random() < 0.05) {
      console.log(`📊 Merge stats: ${mergedReadReceipts} read receipts, ${mergedDeliveryStatus} delivery status, ${protectedDeliveryStatus} protected, ${preservedLocalMessages} local messages preserved`);
    }
    
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
      // Check authentication before making API call
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.log('❌ User not authenticated, skipping mark as read');
        return;
      }

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
