import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../app/services/apiService';
import reactNativeEncryptionService from './reactNativeEncryptionService';

interface LocalMessage {
  id: string;
  session_id: number;
  sender_id: number;
  encrypted_content: string;
  iv: string;
  tag: string;
  algorithm: string;
  is_encrypted: boolean;
  timestamp: string;
  metadata: any;
  synced_at: string;
}

interface SessionKey {
  session_id: number;
  encryption_key: string;
  algorithm: string;
  created_at: string;
  expires_at: string;
}

interface SessionMetadata {
  session_id: number;
  patient_id: number;
  doctor_id: number;
  status: string;
  started_at: string;
  ended_at: string;
  last_activity_at: string;
  patient: {
    id: number;
    name: string;
    profile_picture: string;
  } | null;
  doctor: {
    id: number;
    name: string;
    specialization: string;
    profile_picture: string;
  } | null;
  last_synced_at: string;
}

interface DecryptedMessage {
  id: string;
  session_id: number;
  sender_id: number;
  text: string;
  timestamp: string;
  metadata: any;
}

class LocalStorageService {
  private storagePrefix = 'text_session_';
  private keyPrefix = 'session_key_';
  private metadataPrefix = 'session_metadata_';

  constructor() {
    // No need to instantiate since we're using the default export
  }

  /**
   * Store messages locally for a session
   */
  async storeMessages(sessionId: number, messages: LocalMessage[]): Promise<void> {
    try {
      const key = `${this.storagePrefix}${sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(messages));
      console.log(`Stored ${messages.length} messages locally for session ${sessionId}`);
    } catch (error) {
      console.error('Error storing messages locally:', error);
      throw error;
    }
  }

  /**
   * Get messages from local storage
   */
  async getMessages(sessionId: number): Promise<LocalMessage[]> {
    try {
      const key = `${this.storagePrefix}${sessionId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting messages from local storage:', error);
      return [];
    }
  }

  /**
   * Store session encryption key locally
   */
  async storeSessionKey(sessionId: number, sessionKey: SessionKey): Promise<void> {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(sessionKey));
      console.log(`Stored encryption key locally for session ${sessionId}`);
    } catch (error) {
      console.error('Error storing session key locally:', error);
      throw error;
    }
  }

  /**
   * Get session encryption key from local storage
   */
  async getSessionKey(sessionId: number): Promise<SessionKey | null> {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session key from local storage:', error);
      return null;
    }
  }

  /**
   * Store session metadata locally
   */
  async storeSessionMetadata(sessionId: number, metadata: SessionMetadata): Promise<void> {
    try {
      const key = `${this.metadataPrefix}${sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(metadata));
      console.log(`Stored metadata locally for session ${sessionId}`);
    } catch (error) {
      console.error('Error storing session metadata locally:', error);
      throw error;
    }
  }

  /**
   * Get session metadata from local storage
   */
  async getSessionMetadata(sessionId: number): Promise<SessionMetadata | null> {
    try {
      const key = `${this.metadataPrefix}${sessionId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session metadata from local storage:', error);
      return null;
    }
  }

  /**
   * Decrypt messages from local storage
   */
  async getDecryptedMessages(sessionId: number): Promise<DecryptedMessage[]> {
    try {
      const messages = await this.getMessages(sessionId);
      const sessionKey = await this.getSessionKey(sessionId);

      if (!sessionKey) {
        console.error('Session key not found for decryption');
        return [];
      }

      const decryptedMessages: DecryptedMessage[] = [];

      for (const message of messages) {
        try {
          if (message.is_encrypted) {
            const decryptedText = await reactNativeEncryptionService.decryptMessage({
              encrypted_content: message.encrypted_content,
              iv: message.iv,
              tag: message.tag,
              algorithm: message.algorithm
            }, sessionKey.encryption_key);

            decryptedMessages.push({
              id: message.id,
              session_id: message.session_id,
              sender_id: message.sender_id,
              text: decryptedText,
              timestamp: message.timestamp,
              metadata: message.metadata
            });
          } else {
            decryptedMessages.push({
              id: message.id,
              session_id: message.session_id,
              sender_id: message.sender_id,
              text: message.encrypted_content, // Plain text content
              timestamp: message.timestamp,
              metadata: message.metadata
            });
          }
        } catch (error) {
          console.error(`Error decrypting message ${message.id}:`, error);
          decryptedMessages.push({
            id: message.id,
            session_id: message.session_id,
            sender_id: message.sender_id,
            text: '[Encrypted message - unable to decrypt]',
            timestamp: message.timestamp,
            metadata: message.metadata
          });
        }
      }

      return decryptedMessages;
    } catch (error) {
      console.error('Error getting decrypted messages:', error);
      return [];
    }
  }

  /**
   * Sync messages from server to local storage
   */
  async syncFromServer(sessionId: number): Promise<boolean> {
    try {
      const response = await apiService.get(`/text-sessions/${sessionId}/local-storage`);
      
      if (response.success) {
        const { messages, encryption_key, session_metadata } = response.data;
        
        // Store messages locally
        await this.storeMessages(sessionId, messages);
        
        // Store encryption key
        if (encryption_key) {
          await this.storeSessionKey(sessionId, encryption_key);
        }
        
        // Store session metadata
        if (session_metadata) {
          await this.storeSessionMetadata(sessionId, session_metadata);
        }
        
        console.log(`Synced ${messages.length} messages from server for session ${sessionId}`);
        return true;
      } else {
        console.error('Failed to sync from server:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error syncing from server:', error);
      return false;
    }
  }

  /**
   * Sync messages from local storage to server
   */
  async syncToServer(sessionId: number): Promise<boolean> {
    try {
      const messages = await this.getMessages(sessionId);
      
      if (messages.length === 0) {
        return true; // Nothing to sync
      }
      
      const response = await apiService.post(`/text-sessions/${sessionId}/sync`, {
        messages: messages
      });
      
      if (response.success) {
        console.log(`Synced ${response.data.synced_count} messages to server for session ${sessionId}`);
        return true;
      } else {
        console.error('Failed to sync to server:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error syncing to server:', error);
      return false;
    }
  }

  /**
   * Add a new message to local storage
   */
  async addMessage(sessionId: number, message: LocalMessage): Promise<void> {
    try {
      const messages = await this.getMessages(sessionId);
      messages.push(message);
      await this.storeMessages(sessionId, messages);
      console.log(`Added message ${message.id} to local storage for session ${sessionId}`);
    } catch (error) {
      console.error('Error adding message to local storage:', error);
      throw error;
    }
  }

  /**
   * Get all session IDs stored locally
   */
  async getAllSessionIds(): Promise<number[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      return sessionKeys.map(key => parseInt(key.replace(this.storagePrefix, '')));
    } catch (error) {
      console.error('Error getting all session IDs:', error);
      return [];
    }
  }

  /**
   * Clear all data for a session
   */
  async clearSession(sessionId: number): Promise<void> {
    try {
      const keys = [
        `${this.storagePrefix}${sessionId}`,
        `${this.keyPrefix}${sessionId}`,
        `${this.metadataPrefix}${sessionId}`
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log(`Cleared all local data for session ${sessionId}`);
    } catch (error) {
      console.error('Error clearing session data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalSize: number;
  }> {
    try {
      const sessionIds = await this.getAllSessionIds();
      let totalMessages = 0;
      let totalSize = 0;
      
      for (const sessionId of sessionIds) {
        const messages = await this.getMessages(sessionId);
        totalMessages += messages.length;
        
        // Estimate size (rough calculation)
        const messagesData = JSON.stringify(messages);
        totalSize += messagesData.length;
      }
      
      return {
        totalSessions: sessionIds.length,
        totalMessages,
        totalSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Clean up old sessions (older than specified days)
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    try {
      const sessionIds = await this.getAllSessionIds();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let cleanedCount = 0;
      
      for (const sessionId of sessionIds) {
        const metadata = await this.getSessionMetadata(sessionId);
        
        if (metadata && new Date(metadata.last_activity_at) < cutoffDate) {
          await this.clearSession(sessionId);
          cleanedCount++;
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} old sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }

  /**
   * Export session data for backup
   */
  async exportSession(sessionId: number): Promise<any> {
    try {
      const messages = await this.getMessages(sessionId);
      const sessionKey = await this.getSessionKey(sessionId);
      const metadata = await this.getSessionMetadata(sessionId);
      
      return {
        session_id: sessionId,
        exported_at: new Date().toISOString(),
        messages,
        encryption_key: sessionKey,
        session_metadata: metadata
      };
    } catch (error) {
      console.error('Error exporting session:', error);
      throw error;
    }
  }

  /**
   * Import session data from backup
   */
  async importSession(sessionData: any): Promise<boolean> {
    try {
      const { session_id, messages, encryption_key, session_metadata } = sessionData;
      
      if (messages) {
        await this.storeMessages(session_id, messages);
      }
      
      if (encryption_key) {
        await this.storeSessionKey(session_id, encryption_key);
      }
      
      if (session_metadata) {
        await this.storeSessionMetadata(session_id, session_metadata);
      }
      
      console.log(`Imported session ${session_id} from backup`);
      return true;
    } catch (error) {
      console.error('Error importing session:', error);
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService; 