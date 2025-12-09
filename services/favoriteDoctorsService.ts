import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorite_doctors';

interface FavoriteDoctor {
  id: string | number;
  name: string;
  specialization: string;
  profile_picture_url?: string;
  savedAt: number;
}

class FavoriteDoctorsService {
  /**
   * Add a doctor to favorites
   */
  async addFavorite(doctor: any): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      
      // Check if already favorited
      if (favorites.some(fav => fav.id === doctor.id)) {
        return;
      }

      const favorite: FavoriteDoctor = {
        id: doctor.id,
        name: doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim(),
        specialization: doctor.specialization || 'General Medicine',
        profile_picture_url: doctor.profile_picture_url,
        savedAt: Date.now(),
      };

      favorites.push(favorite);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error adding favorite doctor:', error);
      throw error;
    }
  }

  /**
   * Remove a doctor from favorites
   */
  async removeFavorite(doctorId: string | number): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter(fav => fav.id !== doctorId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing favorite doctor:', error);
      throw error;
    }
  }

  /**
   * Get all favorite doctors
   */
  async getFavorites(): Promise<FavoriteDoctor[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting favorite doctors:', error);
      return [];
    }
  }

  /**
   * Check if a doctor is favorited
   */
  async isFavorite(doctorId: string | number): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.id === doctorId);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Clear all favorites
   */
  async clearFavorites(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing favorites:', error);
      throw error;
    }
  }

  /**
   * Get count of favorite doctors
   */
  async getFavoritesCount(): Promise<number> {
    try {
      const favorites = await this.getFavorites();
      return favorites.length;
    } catch (error) {
      console.error('Error getting favorites count:', error);
      return 0;
    }
  }
}

export default new FavoriteDoctorsService();
