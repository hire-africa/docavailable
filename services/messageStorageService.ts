import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../app/services/apiService';

export interface Message {
  id: string;
  appointment_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface LocalStorageData {
  appointment_id: number;
  messages: Message[];
  last_sync: string;
  message_count: number;
}

class MessageStorageService {
  private readonly STORAGE_PREFIX = 'chat_messages_';
  private readonly SYNC_INTERVAL = 5000; // Keep at 10 seconds (safe)
  private syncTimers: Map<number, NodeJS.Timeout> = new Map();
  private errorCount: Map<number, number> = new Map(); // Track errors per chat
  private readonly MAX_ERRORS = 3; // Stop polling after 3 consecutive errors
  private updateCallbacks: Map<number, (messages: Message[]) => void> = new Map();

  /**
   * Store a message locally
   */
  async storeMessage(appointmentId: number, message: Message): Promise<void> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await this.getLocalData(appointmentId);
      
      // Add message if it doesn't exist
      const exists = data.messages.some(m => m.id === message.id);
      if (!exists) {
        data.messages.push(message);
        data.message_count = data.messages.length;
        data.last_sync = new Date().toISOString();
        
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`Message stored locally for appointment ${appointmentId}`);
      }
    } catch (error) {
      console.error('Error storing message locally:', error);
    }
  }

  /**
   * Get messages from local storage
   */
  async getMessages(appointmentId: number): Promise<Message[]> {
    try {
      const data = await this.getLocalData(appointmentId);
      return data.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch (error) {
      console.error('Error getting messages from local storage:', error);
      return [];
    }
  }

  /**
   * Load messages from server and store locally
   */
  async loadFromServer(appointmentId: number): Promise<Message[]> {
    try {
      const response = await apiService.get(`/chat/${appointmentId}/local-storage`);
      
      if (response.success && response.data) {
        const serverData: LocalStorageData = response.data;
        
        // Store in local storage
        const key = this.getStorageKey(appointmentId);
        await AsyncStorage.setItem(key, JSON.stringify(serverData));
        
        console.log(`Loaded ${serverData.message_count} messages from server for appointment ${appointmentId}`);
        return serverData.messages;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading messages from server:', error);
      return [];
    }
  }

  /**
   * Sync local messages to server
   */
  async syncToServer(appointmentId: number): Promise<boolean> {
    try {
      const data = await this.getLocalData(appointmentId);
      
      if (data.messages.length === 0) {
        return true;
      }
      
      const response = await apiService.post(`/chat/${appointmentId}/sync`, {
        messages: data.messages
      });
      
      if (response.success) {
        console.log(`Synced ${data.messages.length} messages to server for appointment ${appointmentId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error syncing messages to server:', error);
      return false;
    }
  }

  /**
   * Send a message (store locally and send to server)
   */
  async sendMessage(appointmentId: number, messageText: string, senderId: number, senderName: string): Promise<Message | null> {
    try {
      // Create temporary message for immediate display
      const tempMessage: Message = {
        id: `temp_${Date.now()}_${Math.random()}`,
        appointment_id: appointmentId,
        sender_id: senderId,
        sender_name: senderName,
        message: messageText,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store locally first for immediate display
      await this.storeMessage(appointmentId, tempMessage);
      
      // Send to server
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: messageText
      });
      
      if (response.success && response.data) {
        const serverMessage: Message = response.data;
        
        // Replace temp message with server message
        await this.replaceMessage(appointmentId, tempMessage.id, serverMessage);
        
        console.log(`Message sent successfully for appointment ${appointmentId}`);
        return serverMessage;
      }
      
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Replace a temporary message with server message
   */
  private async replaceMessage(appointmentId: number, tempId: string, serverMessage: Message): Promise<void> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await this.getLocalData(appointmentId);
      
      // Find and replace temp message
      const messageIndex = data.messages.findIndex(m => m.id === tempId);
      if (messageIndex !== -1) {
        data.messages[messageIndex] = serverMessage;
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error replacing message:', error);
    }
  }

  /**
   * Register callback for real-time updates
   */
  registerUpdateCallback(appointmentId: number, callback: (messages: Message[]) => void): void {
    this.updateCallbacks.set(appointmentId, callback);
  }

  /**
   * Unregister callback for real-time updates
   */
  unregisterUpdateCallback(appointmentId: number): void {
    this.updateCallbacks.delete(appointmentId);
  }

  /**
   * Start auto-sync for an appointment with error protection and real-time updates
   */
  startAutoSync(appointmentId: number): void {
    // Clear existing timer
    this.stopAutoSync(appointmentId);
    
    // Reset error count
    this.errorCount.set(appointmentId, 0);
    
    // Start new timer with error protection and real-time updates
    const timer = setInterval(async () => {
      const currentErrors = this.errorCount.get(appointmentId) || 0;
      
      // Stop polling if too many errors
      if (currentErrors >= this.MAX_ERRORS) {
        console.warn(`Stopping auto-sync for appointment ${appointmentId} due to too many errors`);
        this.stopAutoSync(appointmentId);
        return;
      }
      
      try {
        // First sync local messages to server
        await this.syncToServer(appointmentId);
        
        // Then fetch new messages from server
        const newMessages = await this.loadFromServer(appointmentId);
        
        // Update UI if callback is registered - ALWAYS update, not just when length > 0
        const callback = this.updateCallbacks.get(appointmentId);
        if (callback) {
          callback(newMessages);
          console.log(`Real-time update: ${newMessages.length} messages for appointment ${appointmentId}`);
        }
        
        // Reset error count on success
        this.errorCount.set(appointmentId, 0);
      } catch (error: any) {
        console.error(`Auto-sync error for appointment ${appointmentId}:`, error);
        
        // Stop auto-sync immediately for authentication errors
        if (error.message?.includes('401') || error.message?.includes('Unauthenticated')) {
          console.warn(`Stopping auto-sync for appointment ${appointmentId} due to authentication error`);
          this.stopAutoSync(appointmentId);
          return;
        }
        
        const newErrorCount = currentErrors + 1;
        this.errorCount.set(appointmentId, newErrorCount);
        
        // Stop polling if too many errors
        if (newErrorCount >= this.MAX_ERRORS) {
          console.warn(`Stopping auto-sync for appointment ${appointmentId} after ${newErrorCount} errors`);
          this.stopAutoSync(appointmentId);
        }
      }
    }, this.SYNC_INTERVAL);
    
    this.syncTimers.set(appointmentId, timer);
    console.log(`Safe auto-sync with real-time updates started for appointment ${appointmentId}`);
  }

  /**
   * Stop auto-sync for an appointment
   */
  stopAutoSync(appointmentId: number): void {
    const timer = this.syncTimers.get(appointmentId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(appointmentId);
      this.errorCount.delete(appointmentId); // Clean up error count
      this.unregisterUpdateCallback(appointmentId); // Clean up callback
      console.log(`Auto-sync stopped for appointment ${appointmentId}`);
    }
  }

  /**
   * Clear all messages for an appointment
   */
  async clearMessages(appointmentId: number): Promise<void> {
    try {
      const key = this.getStorageKey(appointmentId);
      await AsyncStorage.removeItem(key);
      this.stopAutoSync(appointmentId);
      console.log(`Messages cleared for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }

  /**
   * Get local storage data for an appointment
   */
  private async getLocalData(appointmentId: number): Promise<LocalStorageData> {
    try {
      const key = this.getStorageKey(appointmentId);
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      // Return default structure
      return {
        appointment_id: appointmentId,
        messages: [],
        last_sync: new Date().toISOString(),
        message_count: 0
      };
    } catch (error) {
      console.error('Error getting local data:', error);
      return {
        appointment_id: appointmentId,
        messages: [],
        last_sync: new Date().toISOString(),
        message_count: 0
      };
    }
  }

  /**
   * Get storage key for appointment
   */
  private getStorageKey(appointmentId: number): string {
    return `${this.STORAGE_PREFIX}${appointmentId}`;
  }

  /**
   * Get all active chat rooms from local storage
   */
  async getActiveChatRooms(): Promise<number[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      const activeRooms: number[] = [];
      
      for (const key of chatKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const chatData: LocalStorageData = JSON.parse(data);
          if (chatData.messages.length > 0) {
            activeRooms.push(chatData.appointment_id);
          }
        }
      }
      
      return activeRooms;
    } catch (error) {
      console.error('Error getting active chat rooms:', error);
      return [];
    }
  }
}

export const messageStorageService = new MessageStorageService(); 