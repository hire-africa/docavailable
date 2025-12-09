import AsyncStorage from '@react-native-async-storage/async-storage';

export const CALLKEEP_STORAGE_KEY = 'callkeep:incomingCallData';

export interface StoredCallData {
  callId: string;
  appointmentId?: string;
  callType?: string;
  callerName?: string;
  [key: string]: any;
}

export const storeCallData = async (data: StoredCallData): Promise<void> => {
  try {
    await AsyncStorage.setItem(CALLKEEP_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('CallKeep storage write error:', error);
  }
};

export const getStoredCallData = async (): Promise<StoredCallData | null> => {
  try {
    const raw = await AsyncStorage.getItem(CALLKEEP_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredCallData;
  } catch (error) {
    console.error('CallKeep storage read error:', error);
    return null;
  }
};

export const clearStoredCallData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CALLKEEP_STORAGE_KEY);
  } catch (error) {
    console.error('CallKeep storage clear error:', error);
  }
};
