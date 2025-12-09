import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

class SignedUrlService {
  private cache: Map<string, SignedUrlCache> = new Map();
  private readonly CACHE_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  /**
   * Get a signed URL for a chat image
   * Uses cache if available and not expired
   */
  async getSignedUrl(imageId: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.cache.get(imageId);
      if (cached && Date.now() < cached.expiresAt - this.CACHE_BUFFER) {
        console.log('✅ [SignedURL] Using cached URL for:', imageId);
        return cached.url;
      }

      // Fetch new signed URL from backend
      console.log('🔄 [SignedURL] Fetching new signed URL for:', imageId);
      const response = await apiService.get(`/chat-images/${imageId}/signed-url`);
      
      if (response.success && response.data?.url) {
        const signedUrl = response.data.url;
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        
        // Cache the URL
        this.cache.set(imageId, {
          url: signedUrl,
          expiresAt: Date.now() + (expiresIn * 1000),
        });
        
        console.log('✅ [SignedURL] Cached new signed URL, expires in:', expiresIn, 'seconds');
        return signedUrl;
      }

      throw new Error('Failed to get signed URL from server');
    } catch (error) {
      console.error('❌ [SignedURL] Error getting signed URL:', error);
      throw error;
    }
  }

  /**
   * Get signed URL from media_url (extracts image ID from URL)
   */
  async getSignedUrlFromMediaUrl(mediaUrl: string): Promise<string> {
    try {
      // If it's already a signed URL (contains signature), return as-is
      if (mediaUrl.includes('X-Amz-Signature') || mediaUrl.includes('Signature=')) {
        console.log('✅ [SignedURL] URL is already signed');
        return mediaUrl;
      }

      // If it's a local file, return as-is
      if (mediaUrl.startsWith('file://')) {
        console.log('✅ [SignedURL] Local file, no signing needed');
        return mediaUrl;
      }

      // Extract image ID from URL or use the full URL as ID
      // Example: /storage/chat_images/appointment_145/1762379401_YoxmX4UUfE.jpg
      const imageId = mediaUrl.split('/').pop()?.split('?')[0] || mediaUrl;
      
      return await this.getSignedUrl(imageId);
    } catch (error) {
      console.error('❌ [SignedURL] Error processing media URL:', error);
      // Return original URL as fallback
      return mediaUrl;
    }
  }

  /**
   * Clear expired URLs from cache
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now >= value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached URLs
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [SignedURL] Cache cleared');
  }
}

export const signedUrlService = new SignedUrlService();
