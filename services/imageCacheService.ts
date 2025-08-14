import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface CachedImage {
  url: string;
  localUri: string;
  timestamp: number;
  size: number;
  contentType: string;
}

export interface CacheStats {
  totalImages: number;
  totalSize: number;
  oldestImage: number;
  newestImage: number;
}

class ImageCacheService {
  private readonly CACHE_PREFIX = 'image_cache_';
  private readonly CACHE_INDEX_KEY = 'image_cache_index';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_CACHE_ENTRIES = 100;

  /**
   * Get cached image URI for a given URL
   */
  async getCachedImage(url: string): Promise<string | null> {
    try {
      const normalizedUrl = this.normalizeImageUrl(url);
      const noMediumUrl = this.normalizeImageUrlWithoutMedium(url);
      console.log('ImageCacheService: Getting cached image for:', normalizedUrl);
      const cacheKey = this.getCacheKey(normalizedUrl);
      console.log('ImageCacheService: Cache key:', cacheKey);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        // Try fallback key without medium variant
        const fallbackKey = this.getCacheKey(noMediumUrl);
        const fallbackData = await AsyncStorage.getItem(fallbackKey);
        if (!fallbackData) {
          console.log('ImageCacheService: No cached data found');
          return null;
        }
        const fallbackCached: CachedImage = JSON.parse(fallbackData);
        if (this.isCacheValid(fallbackCached)) {
          console.log('ImageCacheService: Cache hit (no-medium) for:', noMediumUrl);
          return fallbackCached.localUri;
        } else {
          await this.removeFromCache(noMediumUrl);
          console.log('ImageCacheService: Cache expired for (no-medium):', noMediumUrl);
          return null;
        }
      }

      const cached: CachedImage = JSON.parse(cachedData);
      console.log('ImageCacheService: Found cached data:', cached);
      
      // Check if cache is still valid
      if (this.isCacheValid(cached)) {
        console.log('ImageCacheService: Cache hit for:', normalizedUrl);
        return cached.localUri;
      } else {
        // Remove expired cache
        await this.removeFromCache(normalizedUrl);
        console.log('ImageCacheService: Cache expired for:', normalizedUrl);
        return null;
      }
    } catch (error) {
      console.error('ImageCacheService: Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Cache an image URL with its local URI
   */
  async cacheImage(url: string, localUri: string, contentType: string = 'image/jpeg'): Promise<void> {
    try {
      const normalizedUrl = this.normalizeImageUrl(url);
      // Get file size if possible using FileSystem
      let size = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists && fileInfo.size) {
          size = fileInfo.size;
        }
      } catch (error) {
        console.warn('ImageCacheService: Could not determine file size:', error);
      }

      const cachedImage: CachedImage = {
        url: normalizedUrl,
        localUri,
        timestamp: Date.now(),
        size,
        contentType
      };

      const cacheKey = this.getCacheKey(normalizedUrl);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedImage));
      
      // Update cache index
      await this.updateCacheIndex(normalizedUrl, cachedImage);
      
      // Clean up old cache entries if needed
      await this.cleanupCache();
      
      console.log('ImageCacheService: Cached image:', normalizedUrl);
    } catch (error) {
      console.error('ImageCacheService: Error caching image:', error);
    }
  }

  /**
   * Remove an image from cache
   */
  async removeFromCache(url: string): Promise<void> {
    try {
      const normalizedUrl = this.normalizeImageUrl(url);
      const cacheKey = this.getCacheKey(normalizedUrl);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const cached: CachedImage = JSON.parse(cachedData);
        
        // Delete the actual file
        try {
          const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(cached.localUri);
          }
        } catch (fileError) {
          console.warn('ImageCacheService: Could not delete file:', fileError);
        }
      }
      
      await AsyncStorage.removeItem(cacheKey);
      await this.removeFromCacheIndex(normalizedUrl);
      console.log('ImageCacheService: Removed from cache:', normalizedUrl);
    } catch (error) {
      console.error('ImageCacheService: Error removing from cache:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);
      
      // Clear cache directory
      const cacheDir = `${FileSystem.cacheDirectory}image_cache/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        }
      } catch (dirError) {
        console.warn('ImageCacheService: Could not delete cache directory:', dirError);
      }
      
      console.log('ImageCacheService: Cache cleared');
    } catch (error) {
      console.error('ImageCacheService: Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const index = await this.getCacheIndex();
      const images = Object.values(index);
      
      if (images.length === 0) {
        return {
          totalImages: 0,
          totalSize: 0,
          oldestImage: 0,
          newestImage: 0
        };
      }

      const totalSize = images.reduce((sum, img) => sum + img.size, 0);
      const timestamps = images.map(img => img.timestamp);
      
      return {
        totalImages: images.length,
        totalSize,
        oldestImage: Math.min(...timestamps),
        newestImage: Math.max(...timestamps)
      };
    } catch (error) {
      console.error('ImageCacheService: Error getting cache stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        oldestImage: 0,
        newestImage: 0
      };
    }
  }

  /**
   * Download and cache an image from URL
   */
  async downloadAndCache(url: string): Promise<string | null> {
    try {
      const normalizedUrl = this.normalizeImageUrl(url);
      const noMediumUrl = this.normalizeImageUrlWithoutMedium(url);
      // Check if already cached
      const cachedUri = await this.getCachedImage(normalizedUrl);
      if (cachedUri) {
        return cachedUri;
      }

      const candidates = Array.from(new Set([normalizedUrl, noMediumUrl]));
      for (const candidate of candidates) {
        console.log('ImageCacheService: Downloading image:', candidate);
        const localUri = await this.downloadToLocalFile(candidate);
        if (localUri) {
          // Cache under both keys to ensure future hits regardless of variant
          await this.cacheImage(candidate, localUri, 'image/jpeg');
          // Also cache under the other key if different
          for (const alt of candidates) {
            if (alt !== candidate) {
              await this.cacheImage(alt, localUri, 'image/jpeg');
            }
          }
          return localUri;
        }
      }
      
      return null;
    } catch (error) {
      console.error('ImageCacheService: Error downloading image:', error);
      return null;
    }
  }

  /**
   * Preload multiple images
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.downloadAndCache(url));
    await Promise.allSettled(promises);
  }

  /**
   * Private helper methods
   */
  private getCacheKey(url: string): string {
    const hash = this.hashString(url);
    return `${this.CACHE_PREFIX}${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Normalize image URLs to stable, processed variants and route
   * - Force /api/images route (converts /storage to /api/images)
   * - For profile pictures, prefer the processed _medium variant
   */
  private normalizeImageUrl(url: string): string {
    if (!url) return url;

    try {
      // If it's a relative path like "profile_pictures/abc.jpg", turn into full /api/images URL
      if (!/^https?:\/\//i.test(url)) {
        const clean = url.replace(/^\/+/, '').replace(/^storage\//, '');
        return `https://docavailable-1.onrender.com/api/images/${this.appendMediumIfProfilePicture(clean)}`;
      }

      // Convert any /storage/... to /api/images/...
      const parsed = new URL(url);
      let path = parsed.pathname;
      if (path.startsWith('/storage/')) {
        path = path.substring('/storage/'.length);
      } else if (path.startsWith('/api/images/')) {
        path = path.substring('/api/images/'.length);
      } else if (path.startsWith('/')) {
        path = path.substring(1);
      }

      // If the path refers to profile_pictures, ensure _medium suffix
      const normalizedPath = this.appendMediumIfProfilePicture(path);
      return `https://docavailable-1.onrender.com/api/images/${normalizedPath}`;
    } catch (_e) {
      // If URL parsing fails, fall back to heuristic
      const clean = url.replace(/^https?:\/\/[^/]+\//, '').replace(/^storage\//, '');
      const normalizedPath = this.appendMediumIfProfilePicture(clean.replace(/^\/+/, ''));
      return `https://docavailable-1.onrender.com/api/images/${normalizedPath}`;
    }
  }

  private normalizeImageUrlWithoutMedium(url: string): string {
    if (!url) return url;
    try {
      if (!/^https?:\/\//i.test(url)) {
        const clean = url.replace(/^\/+/, '').replace(/^storage\//, '');
        return `https://docavailable-1.onrender.com/api/images/${clean}`;
      }
      const parsed = new URL(url);
      let path = parsed.pathname;
      if (path.startsWith('/storage/')) {
        path = path.substring('/storage/'.length);
      } else if (path.startsWith('/api/images/')) {
        path = path.substring('/api/images/'.length);
      } else if (path.startsWith('/')) {
        path = path.substring(1);
      }
      return `https://docavailable-1.onrender.com/api/images/${path}`;
    } catch (_e) {
      const clean = url.replace(/^https?:\/\/[^/]+\//, '').replace(/^storage\//, '');
      return `https://docavailable-1.onrender.com/api/images/${clean.replace(/^\/+/, '')}`;
    }
  }

  private appendMediumIfProfilePicture(path: string): string {
    // Only modify profile_pictures folder files
    if (!/^profile_pictures\//.test(path)) return path;
    // Skip if already has a known suffix
    if (/_thumb\.|_medium\.|_preview\./i.test(path)) return path;
    // Insert _medium before extension for common image types
    return path.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '_medium.$1');
  }

  private isCacheValid(cached: CachedImage): boolean {
    const now = Date.now();
    return (now - cached.timestamp) < this.MAX_CACHE_AGE;
  }

  private async getCacheIndex(): Promise<Record<string, CachedImage>> {
    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.error('ImageCacheService: Error getting cache index:', error);
      return {};
    }
  }

  private async updateCacheIndex(url: string, cachedImage: CachedImage): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      index[url] = cachedImage;
      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('ImageCacheService: Error updating cache index:', error);
    }
  }

  private async removeFromCacheIndex(url: string): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      delete index[url];
      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('ImageCacheService: Error removing from cache index:', error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      const images = Object.values(index);
      
      // Remove expired images
      const now = Date.now();
      const validImages = images.filter(img => (now - img.timestamp) < this.MAX_CACHE_AGE);
      
      // Calculate total size
      const totalSize = validImages.reduce((sum, img) => sum + img.size, 0);
      
      // If cache is too large or has too many entries, remove oldest images
      if (totalSize > this.MAX_CACHE_SIZE || validImages.length > this.MAX_CACHE_ENTRIES) {
        const sortedImages = validImages.sort((a, b) => a.timestamp - b.timestamp);
        const imagesToRemove = sortedImages.slice(0, Math.floor(sortedImages.length * 0.3)); // Remove 30% of oldest images
        
        for (const img of imagesToRemove) {
          await this.removeFromCache(img.url);
        }
        
        console.log('ImageCacheService: Cleaned up', imagesToRemove.length, 'old images');
      }
    } catch (error) {
      console.error('ImageCacheService: Error cleaning up cache:', error);
    }
  }

  private async downloadToLocalFile(url: string): Promise<string | null> {
    try {
      // Create cache directory if it doesn't exist
      const cacheDir = `${FileSystem.cacheDirectory}image_cache/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Generate unique filename
      const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const fileUri = `${cacheDir}${filename}`;

      // Download the file directly using expo-file-system
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadResult.status === 200) {
        return fileUri;
      } else {
        console.error('ImageCacheService: Download failed with status:', downloadResult.status);
        return null;
      }
    } catch (error) {
      console.error('ImageCacheService: Error downloading to local file:', error);
      return null;
    }
  }
}

export const imageCacheService = new ImageCacheService();
