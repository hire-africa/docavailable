import { useCallback, useEffect, useState } from 'react';
import { CacheStats, imageCacheService } from '../services/imageCacheService';

export const useProfilePictureCache = () => {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Preload profile pictures for better performance
   */
  const preloadProfilePictures = useCallback(async (urls: string[]) => {
    try {
      setIsLoading(true);
      console.log('useProfilePictureCache: Preloading', urls.length, 'profile pictures');
      
      // Filter out invalid URLs
      const validUrls = urls.filter(url => url && url.startsWith('http'));
      
      if (validUrls.length === 0) {
        console.log('useProfilePictureCache: No valid URLs to preload');
        return;
      }

      await imageCacheService.preloadImages(validUrls);
      console.log('useProfilePictureCache: Preloading completed');
    } catch (error) {
      console.error('useProfilePictureCache: Error preloading images:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get cached image URI
   */
  const getCachedImage = useCallback(async (url: string): Promise<string | null> => {
    try {
      return await imageCacheService.getCachedImage(url);
    } catch (error) {
      console.error('useProfilePictureCache: Error getting cached image:', error);
      return null;
    }
  }, []);

  /**
   * Download and cache an image
   */
  const downloadAndCache = useCallback(async (url: string): Promise<string | null> => {
    try {
      return await imageCacheService.downloadAndCache(url);
    } catch (error) {
      console.error('useProfilePictureCache: Error downloading and caching image:', error);
      return null;
    }
  }, []);

  /**
   * Remove image from cache
   */
  const removeFromCache = useCallback(async (url: string): Promise<void> => {
    try {
      await imageCacheService.removeFromCache(url);
    } catch (error) {
      console.error('useProfilePictureCache: Error removing from cache:', error);
    }
  }, []);

  /**
   * Clear all cached images
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await imageCacheService.clearCache();
      setCacheStats(null);
      console.log('useProfilePictureCache: Cache cleared');
    } catch (error) {
      console.error('useProfilePictureCache: Error clearing cache:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(async (): Promise<CacheStats> => {
    try {
      const stats = await imageCacheService.getCacheStats();
      setCacheStats(stats);
      return stats;
    } catch (error) {
      console.error('useProfilePictureCache: Error getting cache stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        oldestImage: 0,
        newestImage: 0
      };
    }
  }, []);

  /**
   * Format cache size for display
   */
  const formatCacheSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Check if cache is empty
   */
  const isCacheEmpty = useCallback((): boolean => {
    return !cacheStats || cacheStats.totalImages === 0;
  }, [cacheStats]);

  /**
   * Get cache usage percentage (assuming 50MB max)
   */
  const getCacheUsagePercentage = useCallback((): number => {
    if (!cacheStats || cacheStats.totalSize === 0) return 0;
    const maxSize = 50 * 1024 * 1024; // 50MB
    return Math.round((cacheStats.totalSize / maxSize) * 100);
  }, [cacheStats]);

  // Load cache stats on mount
  useEffect(() => {
    getCacheStats();
  }, [getCacheStats]);

  return {
    // State
    cacheStats,
    isLoading,
    
    // Actions
    preloadProfilePictures,
    getCachedImage,
    downloadAndCache,
    removeFromCache,
    clearCache,
    getCacheStats,
    
    // Utilities
    formatCacheSize,
    isCacheEmpty,
    getCacheUsagePercentage,
  };
};
