import { apiService } from '../app/services/apiService';
import { chatApiService } from './chatApiService';
import { notificationApiService } from './notificationApiService';
import { walletApiService } from './walletApiService';

// Configuration for feature flags
interface FeatureFlags {
  useBackendForChat: boolean;
  useBackendForWallet: boolean;
  useBackendForNotifications: boolean;
  useBackendForAppointments: boolean;
}

// Default feature flags - can be updated via environment variables or settings
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  useBackendForChat: true,
  useBackendForWallet: true,
  useBackendForNotifications: true,
  useBackendForAppointments: true, // Now using backend for appointments
};

class HybridService {
  private featureFlags: FeatureFlags;

  constructor() {
    this.featureFlags = { ...DEFAULT_FEATURE_FLAGS };
    this.loadFeatureFlags();
  }

  private async loadFeatureFlags() {
    try {
      // Load from AsyncStorage or environment variables
      const flags = await this.getStoredFeatureFlags();
      this.featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...flags };
    } catch (error) {
      console.warn('Failed to load feature flags, using defaults:', error);
    }
  }

  private async getStoredFeatureFlags(): Promise<Partial<FeatureFlags>> {
    // This could load from AsyncStorage or environment variables
    return {};
  }

  // Update feature flags (for testing or gradual rollout)
  async updateFeatureFlags(flags: Partial<FeatureFlags>) {
    this.featureFlags = { ...this.featureFlags, ...flags };
    // Store updated flags
    await this.storeFeatureFlags();
  }

  private async storeFeatureFlags() {
    // Store in AsyncStorage for persistence
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('feature_flags', JSON.stringify(this.featureFlags));
    } catch (error) {
      console.warn('Failed to store feature flags:', error);
    }
  }

  // Test backend connectivity
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await apiService.get('/health');
      return response.success;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  // Chat Services
  async getChatRooms() {
    try {
      return await chatApiService.getChatRooms();
    } catch (error) {
      console.warn('Backend chat failed:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  // Wallet Services
  async getWallet() {
    try {
      return await walletApiService.getWallet();
    } catch (error) {
      console.warn('Backend wallet failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  // Notification Services
  async getNotifications(page: number = 1) {
    try {
      return await notificationApiService.getNotifications(page);
    } catch (error) {
      console.warn('Backend notifications failed:', error);
      return { success: false, data: { notifications: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 }, unread_count: 0 }, error: error.message };
    }
  }

  // Appointment Services
  async getAppointments(userId: string, userType: 'patient' | 'doctor') {
    try {
      return await this.getBackendAppointments(userId, userType);
    } catch (error) {
      console.warn('Backend appointments failed:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  private async getBackendAppointments(userId: string, userType: 'patient' | 'doctor') {
    // This would be implemented when we move appointments to backend
    throw new Error('Backend appointments not yet implemented');
  }

  // Migration helper methods
  async migrateUserData(userId: string) {
    try {
      console.log('Starting user data migration for:', userId);
      
      // Migrate to backend
      const response = await apiService.post('/users/migrate', {
        user_id: userId,
      });

      if (response.success) {
        console.log('User data migrated successfully');
        return response;
      } else {
        throw new Error('Migration failed');
      }
    } catch (error) {
      console.error('User data migration failed:', error);
      throw error;
    }
  }

  async syncData(userId: string) {
    try {
      console.log('Starting data sync for user:', userId);
      
      // Sync to backend
      const response = await apiService.post('/users/sync', {
        user_id: userId,
      });

      if (response.success) {
        console.log('Data sync completed successfully');
        return response;
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Data sync failed:', error);
      throw error;
    }
  }

  // Get current feature flags
  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  // Check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    return await this.testBackendConnection();
  }
}

export const hybridService = new HybridService(); 