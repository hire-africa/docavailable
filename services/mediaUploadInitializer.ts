import { mediaUploadQueueService } from './mediaUploadQueueService';

/**
 * Initialize the media upload queue service
 * Call this when your app starts to ensure the queue is ready
 */
export const initializeMediaUpload = async (): Promise<void> => {
  try {
    console.log('🚀 [MediaUpload] Initializing media upload system...');
    
    // Initialize the queue service
    await mediaUploadQueueService.initialize();
    
    // Get initial queue stats
    const stats = await mediaUploadQueueService.getQueueStats();
    console.log('📊 [MediaUpload] Queue stats:', stats);
    
    // Clean up old completed uploads
    await mediaUploadQueueService.cleanupCompletedUploads();
    
    console.log('✅ [MediaUpload] Media upload system initialized successfully');
  } catch (error) {
    console.error('❌ [MediaUpload] Failed to initialize media upload system:', error);
  }
};

/**
 * Get media upload statistics
 */
export const getMediaUploadStats = async () => {
  try {
    return await mediaUploadQueueService.getQueueStats();
  } catch (error) {
    console.error('❌ [MediaUpload] Failed to get upload stats:', error);
    return {
      total: 0,
      pending: 0,
      uploading: 0,
      completed: 0,
      failed: 0,
    };
  }
};

/**
 * Clean up completed uploads
 */
export const cleanupMediaUploads = async (): Promise<void> => {
  try {
    await mediaUploadQueueService.cleanupCompletedUploads();
    console.log('🧹 [MediaUpload] Cleaned up completed uploads');
  } catch (error) {
    console.error('❌ [MediaUpload] Failed to cleanup uploads:', error);
  }
};
