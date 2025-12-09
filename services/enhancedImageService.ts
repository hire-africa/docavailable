import * as ImagePicker from 'expo-image-picker';
import { mediaUploadQueueService, UploadProgress } from './mediaUploadQueueService';

interface ImageUploadResult {
  success: boolean;
  tempId?: string;
  error?: string;
}

interface ImageUploadOptions {
  quality?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

class EnhancedImageService {
  private defaultOptions: ImageUploadOptions = {
    quality: 0.8,
    allowsEditing: false,
    aspect: [4, 3]
  };

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Pick image from gallery and add to upload queue
   */
  async pickAndQueueImage(
    appointmentId: number, 
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    try {
      console.log('📸 [EnhancedImage] Starting image pick and queue process');
      
      // Check permissions
      const hasPermission = await this.requestMediaLibraryPermissions();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Permission denied. Please allow access to photo library.'
        };
      }

      // Pick image
      const imageUri = await this.pickImage(options);
      if (!imageUri) {
        return {
          success: false,
          error: 'No image selected'
        };
      }

      // Generate temp ID for immediate UI feedback
      const tempId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📸 [EnhancedImage] Adding image to upload queue:', tempId);
      
      // Add to upload queue
      const uploadId = await mediaUploadQueueService.addToQueue({
        type: 'image',
        appointmentId,
        fileUri: imageUri,
        tempId,
      });

      console.log('✅ [EnhancedImage] Image added to queue successfully:', uploadId);
      
      return {
        success: true,
        tempId
      };
    } catch (error: any) {
      console.error('❌ [EnhancedImage] Error picking and queuing image:', error);
      return {
        success: false,
        error: error.message || 'Failed to pick image'
      };
    }
  }

  /**
   * Take photo with camera and add to upload queue
   */
  async takePhotoAndQueue(
    appointmentId: number, 
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    try {
      console.log('📸 [EnhancedImage] Starting camera photo and queue process');
      
      // Check camera permissions
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Permission denied. Please allow camera access.'
        };
      }

      // Take photo
      const imageUri = await this.takePhoto(options);
      if (!imageUri) {
        return {
          success: false,
          error: 'No photo taken'
        };
      }

      // Generate temp ID for immediate UI feedback
      const tempId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📸 [EnhancedImage] Adding photo to upload queue:', tempId);
      
      // Add to upload queue
      const uploadId = await mediaUploadQueueService.addToQueue({
        type: 'image',
        appointmentId,
        fileUri: imageUri,
        tempId,
      });

      console.log('✅ [EnhancedImage] Photo added to queue successfully:', uploadId);
      
      return {
        success: true,
        tempId
      };
    } catch (error: any) {
      console.error('❌ [EnhancedImage] Error taking photo and queuing:', error);
      return {
        success: false,
        error: error.message || 'Failed to take photo'
      };
    }
  }

  /**
   * Pick image from gallery
   */
  private async pickImage(options: ImageUploadOptions = {}): Promise<string | null> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
        base64: false,
      });

      if (result.canceled) {
        console.log('📸 [EnhancedImage] Image picker canceled');
        return null;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📸 [EnhancedImage] Image selected:', {
          uri: asset.uri.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });
        return asset.uri;
      }

      return null;
    } catch (error) {
      console.error('❌ [EnhancedImage] Error picking image:', error);
      return null;
    }
  }

  /**
   * Take photo with camera
   */
  private async takePhoto(options: ImageUploadOptions = {}): Promise<string | null> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
        base64: false,
      });

      if (result.canceled) {
        console.log('📸 [EnhancedImage] Camera canceled');
        return null;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📸 [EnhancedImage] Photo taken:', {
          uri: asset.uri.substring(0, 50) + '...',
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });
        return asset.uri;
      }

      return null;
    } catch (error) {
      console.error('❌ [EnhancedImage] Error taking photo:', error);
      return null;
    }
  }

  /**
   * Subscribe to upload progress for a specific image
   */
  subscribeToImageProgress(tempId: string, callback: (progress: UploadProgress) => void): () => void {
    return mediaUploadQueueService.subscribeToProgress(tempId, callback);
  }

  /**
   * Get upload status for a specific image
   */
  async getImageUploadStatus(tempId: string) {
    return await mediaUploadQueueService.getUploadStatus(tempId);
  }

  /**
   * Get all pending image uploads for an appointment
   */
  async getPendingImageUploads(appointmentId: number) {
    const queue = await mediaUploadQueueService.getQueue();
    return queue.filter(upload => 
      upload.type === 'image' && 
      upload.appointmentId === appointmentId && 
      (upload.status === 'pending' || upload.status === 'uploading')
    );
  }

  /**
   * Cancel a specific image upload
   */
  async cancelImageUpload(tempId: string): Promise<boolean> {
    try {
      const queue = await mediaUploadQueueService.getQueue();
      const uploadIndex = queue.findIndex(upload => upload.tempId === tempId && upload.type === 'image');
      
      if (uploadIndex !== -1) {
        queue.splice(uploadIndex, 1);
        await mediaUploadQueueService.saveQueue(queue);
        console.log('❌ [EnhancedImage] Canceled image upload:', tempId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EnhancedImage] Error canceling image upload:', error);
      return false;
    }
  }

  /**
   * Retry a failed image upload
   */
  async retryImageUpload(tempId: string): Promise<boolean> {
    try {
      const queue = await mediaUploadQueueService.getQueue();
      const uploadIndex = queue.findIndex(upload => upload.tempId === tempId && upload.type === 'image');
      
      if (uploadIndex !== -1) {
        queue[uploadIndex].status = 'pending';
        queue[uploadIndex].retryCount = 0;
        queue[uploadIndex].error = undefined;
        
        await mediaUploadQueueService.saveQueue(queue);
        await mediaUploadQueueService.processQueue();
        
        console.log('🔄 [EnhancedImage] Retrying image upload:', tempId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EnhancedImage] Error retrying image upload:', error);
      return false;
    }
  }

  /**
   * Get image upload statistics
   */
  async getImageUploadStats() {
    const stats = await mediaUploadQueueService.getQueueStats();
    const queue = await mediaUploadQueueService.getQueue();
    const imageUploads = queue.filter(upload => upload.type === 'image');
    
    return {
      ...stats,
      imageUploads: imageUploads.length,
      imagePending: imageUploads.filter(u => u.status === 'pending').length,
      imageUploading: imageUploads.filter(u => u.status === 'uploading').length,
      imageCompleted: imageUploads.filter(u => u.status === 'completed').length,
      imageFailed: imageUploads.filter(u => u.status === 'failed').length,
    };
  }
}

export const enhancedImageService = new EnhancedImageService();
export type { ImageUploadOptions, ImageUploadResult };

