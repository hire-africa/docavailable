import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageProps, StyleSheet, View } from 'react-native';
import { imageCacheService } from '../services/imageCacheService';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  fallbackSource?: any;
  showLoadingIndicator?: boolean;
  loadingIndicatorColor?: string;
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
  onError?: (error: any) => void;
}

const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  fallbackSource,
  showLoadingIndicator = true,
  loadingIndicatorColor = '#4CAF50',
  onCacheHit,
  onCacheMiss,
  onError,
  style,
  ...imageProps
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    console.log('CachedImage: useEffect triggered with uri:', uri);
    if (!uri) {
      console.log('CachedImage: No URI provided, showing error');
      setLoading(false);
      setError(true);
      return;
    }

    loadImage();
  }, [uri]);

  const loadImage = async () => {
    try {
      console.log('CachedImage: Starting to load image:', uri);
      setLoading(true);
      setError(false);

      // Check cache first
      console.log('CachedImage: Checking cache for:', uri);
      const cachedUri = await imageCacheService.getCachedImage(uri);
      
      if (cachedUri) {
        console.log('CachedImage: Cache hit, using cached URI:', cachedUri);
        setImageUri(cachedUri);
        setLoading(false);
        onCacheHit?.();
        console.log('CachedImage: Cache hit for:', uri);
        return;
      }

      // Cache miss - download and cache
      console.log('CachedImage: Cache miss, downloading:', uri);
      onCacheMiss?.();
      console.log('CachedImage: Cache miss for:', uri);
      
      const downloadedUri = await imageCacheService.downloadAndCache(uri);
      
      if (downloadedUri) {
        console.log('CachedImage: Download successful, using URI:', downloadedUri);
        setImageUri(downloadedUri);
        setLoading(false);
      } else {
        console.log('CachedImage: Download failed, no URI returned');
        throw new Error('Failed to download image');
      }
    } catch (err) {
      console.error('CachedImage: Error loading image:', err);
      setError(true);
      setLoading(false);
      onError?.(err);
    }
  };

  const handleImageError = (error: any) => {
    console.error('CachedImage: Image load error:', error);
    setError(true);
    setLoading(false);
    onError?.(error);
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Show loading indicator
  if (loading && showLoadingIndicator) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={loadingIndicatorColor} />
      </View>
    );
  }

  // Show fallback or error state
  if (error || !imageUri) {
    if (fallbackSource) {
      return (
        <Image
          source={fallbackSource}
          style={style}
          {...imageProps}
        />
      );
    }
    return null;
  }

  // Show cached image
  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      onLoad={handleImageLoad}
      onError={handleImageError}
      {...imageProps}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CachedImage;
