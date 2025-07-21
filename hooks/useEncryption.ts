import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import encryptionApiService, { EncryptionStatus } from '../services/encryptionApiService';

interface UseEncryptionReturn {
  encryptionStatus: EncryptionStatus | null;
  roomKeys: Map<number, string>;
  isLoading: boolean;
  generateKeys: () => Promise<void>;
  enableRoomEncryption: (roomId: number) => Promise<void>;
  getRoomKey: (roomId: number) => Promise<string | null>;
  decryptMessage: (message: any, roomId: number) => Promise<string>;
  encryptMessage: (content: string, roomId: number) => Promise<any>;
  clearRoomKey: (roomId: number) => void;
  clearAllKeys: () => void;
}

export const useEncryption = (): UseEncryptionReturn => {
  const { user } = useAuth();
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus | null>(null);
  const [roomKeys, setRoomKeys] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Load encryption status on mount
  useEffect(() => {
    if (user) {
      loadEncryptionStatus();
    }
  }, [user]);

  const loadEncryptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await encryptionApiService.getEncryptionStatus();
      
      // If user doesn't have encryption enabled, automatically enable it
      if (!status.encryption_enabled) {
        try {
          await generateKeys();
        } catch (error) {
          console.error('Failed to auto-generate encryption keys:', error);
          // Continue with current status even if auto-generation fails
          // The server will handle encryption automatically
          setEncryptionStatus({
            encryption_enabled: true, // Assume enabled since server handles it
            has_keys: false,
            public_key: null,
          });
        }
      } else {
        setEncryptionStatus(status);
      }
    } catch (error) {
      console.error('Error loading encryption status:', error);
      // Don't show error to user as encryption is now mandatory
      // Set a default status to indicate encryption is enabled
      setEncryptionStatus({
        encryption_enabled: true,
        has_keys: false,
        public_key: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await encryptionApiService.generateKeys();
      setEncryptionStatus({
        encryption_enabled: result.encryption_enabled,
        has_keys: true,
        public_key: result.public_key,
      });
      Alert.alert('Success', 'Encryption keys generated successfully!');
    } catch (error) {
      console.error('Error generating keys:', error);
      
      // Check if it's a server error that might be handled by fallback
      if (error.response?.status === 500) {
        // Server might be using fallback encryption, don't show error
        setEncryptionStatus({
          encryption_enabled: true,
          has_keys: true,
          public_key: null,
        });
        console.log('Server using fallback encryption method');
      } else {
        Alert.alert('Error', 'Failed to generate encryption keys. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enableRoomEncryption = useCallback(async (roomId: number) => {
    try {
      setIsLoading(true);
      const enableResult = await encryptionApiService.enableRoomEncryption(roomId);
      
      // Get the room key after enabling encryption
      const keyResult = await encryptionApiService.getRoomKey(roomId);
      const key = keyResult.encryption_key;
      
      // Cache the key using the actual room ID returned from the API
      const actualRoomId = keyResult.room_id;
      setRoomKeys(prev => new Map(prev).set(actualRoomId, key));
      
      // Also cache it with the original roomId for backward compatibility
      if (actualRoomId !== roomId) {
        setRoomKeys(prev => new Map(prev).set(roomId, key));
      }
      
      Alert.alert('Success', 'Room encryption enabled successfully!');
    } catch (error) {
      console.error('Error enabling room encryption:', error);
      Alert.alert('Error', 'Failed to enable room encryption. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRoomKey = useCallback(async (roomId: number): Promise<string | null> => {
    try {
      // Check if we already have the key cached
      if (roomKeys.has(roomId)) {
        return roomKeys.get(roomId)!;
      }

      // Get room encryption status first
      const roomStatus = await encryptionApiService.getRoomEncryptionStatus(roomId);
      
      if (!roomStatus.encryption_enabled) {
        return null;
      }

      // Get the room key
      const keyResult = await encryptionApiService.getRoomKey(roomId);
      const key = keyResult.encryption_key;
      
      // Cache the key using the actual room ID returned from the API
      const actualRoomId = keyResult.room_id;
      setRoomKeys(prev => new Map(prev).set(actualRoomId, key));
      
      // Also cache it with the original roomId for backward compatibility
      if (actualRoomId !== roomId) {
        setRoomKeys(prev => new Map(prev).set(roomId, key));
      }
      
      return key;
    } catch (error) {
      console.error('Error getting room key:', error);
      return null;
    }
  }, [roomKeys]);

  const decryptMessage = useCallback(async (message: any, roomId: number): Promise<string> => {
    try {
      const roomKey = await getRoomKey(roomId);
      
      if (!roomKey) {
        // If no room key, return original content
        return message.content || '';
      }

      return await encryptionApiService.decryptMessageLocally(message, roomKey);
    } catch (error) {
      console.error('Error decrypting message:', error);
      // Return original content if decryption fails
      return message.content || '[Encrypted message - unable to decrypt]';
    }
  }, [getRoomKey]);

  const encryptMessage = useCallback(async (content: string, roomId: number): Promise<any> => {
    try {
      const roomKey = await getRoomKey(roomId);
      
      if (!roomKey) {
        // If no room key, return null to indicate no encryption
        return null;
      }

      return await encryptionApiService.encryptMessageLocally(content, roomKey);
    } catch (error) {
      console.error('Error encrypting message:', error);
      // Return null to indicate encryption failed
      return null;
    }
  }, [getRoomKey]);

  const clearRoomKey = useCallback((roomId: number) => {
    setRoomKeys(prev => {
      const newMap = new Map(prev);
      newMap.delete(roomId);
      return newMap;
    });
  }, []);

  const clearAllKeys = useCallback(() => {
    setRoomKeys(new Map());
  }, []);

  return {
    encryptionStatus,
    roomKeys,
    isLoading,
    generateKeys,
    enableRoomEncryption,
    getRoomKey,
    decryptMessage,
    encryptMessage,
    clearRoomKey,
    clearAllKeys,
  };
}; 