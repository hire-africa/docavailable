import { apiService } from '../app/services/apiService';
import encryptionService from './encryptionService';

export interface EncryptionStatus {
  encryption_enabled: boolean;
  has_keys: boolean;
  public_key?: string;
}

export interface RoomEncryptionStatus {
  room_id: number;
  encryption_enabled: boolean;
  can_enable: boolean;
}

export interface DecryptedMessage {
  message_id: number;
  decrypted_content: string;
  is_encrypted: boolean;
}

class EncryptionApiService {
  /**
   * Generate encryption keys for the current user
   */
  async generateKeys(): Promise<{ encryption_enabled: boolean; public_key: string }> {
    try {
      const response = await apiService.post('/encryption/generate-keys');
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to generate encryption keys');
      }
    } catch (error) {
      console.error('Error generating encryption keys:', error);
      throw error;
    }
  }

  /**
   * Get user's encryption status
   */
  async getEncryptionStatus(): Promise<EncryptionStatus> {
    try {
      const response = await apiService.get('/encryption/status');
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get encryption status');
      }
    } catch (error) {
      console.error('Error getting encryption status:', error);
      throw error;
    }
  }

  /**
   * Enable encryption for a chat room
   */
  async enableRoomEncryption(roomId: number): Promise<{ room_id: number; encryption_enabled: boolean }> {
    try {
      const response = await apiService.post(`/encryption/rooms/${roomId}/enable`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to enable room encryption');
      }
    } catch (error) {
      console.error('Error enabling room encryption:', error);
      throw error;
    }
  }

  /**
   * Get encryption status for a chat room
   */
  async getRoomEncryptionStatus(roomId: number): Promise<RoomEncryptionStatus> {
    try {
      const response = await apiService.get(`/encryption/rooms/${roomId}/status`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get room encryption status');
      }
    } catch (error) {
      console.error('Error getting room encryption status:', error);
      throw error;
    }
  }

  /**
   * Get room encryption key
   */
  async getRoomKey(roomId: number): Promise<{ room_id: number; encryption_key: string }> {
    try {
      const response = await apiService.get(`/encryption/rooms/${roomId}/key`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get room key');
      }
    } catch (error) {
      console.error('Error getting room key:', error);
      throw error;
    }
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(messageId: number, roomKey: string): Promise<DecryptedMessage> {
    try {
      const response = await apiService.post(`/encryption/messages/${messageId}/decrypt`, {
        room_key: roomKey,
      });
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to decrypt message');
      }
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }

  /**
   * Decrypt a message locally (client-side only)
   */
  async decryptMessageLocally(message: any, roomKey: string): Promise<string> {
    try {
      if (!message.is_encrypted) {
        return message.content;
      }

      const encryptedData = {
        encrypted_content: message.encrypted_content,
        iv: message.iv,
        tag: message.tag,
        algorithm: message.algorithm,
      };

      return await encryptionService.decryptMessage(encryptedData, roomKey);
    } catch (error) {
      console.error('Error decrypting message locally:', error);
      throw error;
    }
  }

  /**
   * Encrypt a message locally (client-side only)
   */
  async encryptMessageLocally(content: string, roomKey: string): Promise<any> {
    try {
      return await encryptionService.encryptMessage(content, roomKey);
    } catch (error) {
      console.error('Error encrypting message locally:', error);
      throw error;
    }
  }
}

export default new EncryptionApiService(); 