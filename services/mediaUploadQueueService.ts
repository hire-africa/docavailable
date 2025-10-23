import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

interface QueuedUpload {
  id: string;
  type: 'image' | 'voice';
  appointmentId: number;
  fileUri: string;
  tempId: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
  createdAt: string;
  error?: string;
  mediaUrl?: string;
}

interface UploadProgress {
  uploadId: string;
  progress: number;
  status: QueuedUpload['status'];
  error?: string;
}

class MediaUploadQueueService {
  private queueKey = 'media_upload_queue';
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds
  private isProcessing = false;
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();

  constructor() {
    // Start processing queue on initialization
    this.processQueue();
  }

  /**
   * Add upload to queue
   */
  async addToQueue(upload: Omit<QueuedUpload, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<string> {
    const queuedUpload: QueuedUpload = {
      ...upload,
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const queue = await this.getQueue();
    queue.push(queuedUpload);
    await this.saveQueue(queue);
    
    console.log(`📤 [MediaQueue] Added ${upload.type} upload to queue:`, queuedUpload.id);
    
    // Start processing queue
    this.processQueue();
    
    return queuedUpload.id;
  }

  /**
   * Get current upload queue
   */
  async getQueue(): Promise<QueuedUpload[]> {
    try {
      const data = await AsyncStorage.getItem(this.queueKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting upload queue:', error);
      return [];
    }
  }

  /**
   * Save queue to async storage
   */
  async saveQueue(queue: QueuedUpload[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving upload queue:', error);
    }
  }

  /**
   * Process pending uploads in queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;
    
    try {
      const queue = await this.getQueue();
      const pendingUploads = queue.filter(upload => upload.status === 'pending');
      
      console.log(`📤 [MediaQueue] Processing ${pendingUploads.length} pending uploads`);
      
      for (const upload of pendingUploads) {
        await this.processUpload(upload);
      }
    } catch (error) {
      console.error('Error processing upload queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual upload
   */
  private async processUpload(upload: QueuedUpload): Promise<void> {
    try {
      console.log(`📤 [MediaQueue] Processing upload ${upload.id} (${upload.type})`);
      
      // Update status to uploading
      await this.updateUploadStatus(upload.id, 'uploading');
      this.notifyProgress(upload.id, 'uploading', 0);
      
      // Check and refresh auth token
      const tokenIsValid = await this.checkAndRefreshToken();
      if (!tokenIsValid) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Upload the file
      this.notifyProgress(upload.id, 'uploading', 50);
      const mediaUrl = await this.uploadFile(upload);
      
      if (mediaUrl) {
        this.notifyProgress(upload.id, 'uploading', 80);
        
        // Send message through WebRTC
        await this.sendMediaMessage(upload, mediaUrl);
        
        // Update with media URL and mark as completed
        await this.updateUploadStatus(upload.id, 'completed', mediaUrl);
        this.notifyProgress(upload.id, 'completed', 100);
        
        console.log(`✅ [MediaQueue] Upload completed: ${upload.id}`);
      } else {
        throw new Error('Upload failed - no media URL returned');
      }
    } catch (error: any) {
      console.error(`❌ [MediaQueue] Upload failed for ${upload.id}:`, error);
      
      const queue = await this.getQueue();
      const uploadIndex = queue.findIndex(u => u.id === upload.id);
      
      if (uploadIndex !== -1) {
        queue[uploadIndex].retryCount++;
        queue[uploadIndex].error = error.message;
        
        if (queue[uploadIndex].retryCount < this.maxRetries) {
          queue[uploadIndex].status = 'pending';
          console.log(`🔄 [MediaQueue] Retrying upload ${upload.id} (attempt ${queue[uploadIndex].retryCount + 1})`);
          
          // Retry after delay with exponential backoff
          const retryDelay = this.retryDelay * Math.pow(2, queue[uploadIndex].retryCount - 1);
          setTimeout(() => this.processQueue(), retryDelay);
        } else {
          queue[uploadIndex].status = 'failed';
          console.log(`❌ [MediaQueue] Upload failed permanently: ${upload.id}`);
        }
        
        await this.saveQueue(queue);
        this.notifyProgress(upload.id, queue[uploadIndex].status, 0, error.message);
      }
    }
  }

  /**
   * Upload file to server
   */
  private async uploadFile(upload: QueuedUpload): Promise<string | null> {
    const formData = new FormData();
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    if (upload.type === 'image') {
      const fileName = `image_${uniqueId}.jpg`;
      formData.append('file', {
        uri: upload.fileUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
      formData.append('appointment_id', upload.appointmentId.toString());
      
      console.log(`📤 [MediaQueue] Uploading image: ${fileName}`);
      const response = await apiService.uploadFile('/upload/chat-image', formData);
      return response?.data?.media_url || null;
    } else if (upload.type === 'voice') {
      const fileName = `voice_${uniqueId}.m4a`;
      formData.append('file', {
        uri: upload.fileUri,
        type: 'audio/mp4',
        name: fileName,
      } as any);
      formData.append('appointment_id', upload.appointmentId.toString());
      
      console.log(`📤 [MediaQueue] Uploading voice: ${fileName}`);
      const response = await apiService.uploadFile('/upload/voice-message', formData);
      return response?.data?.media_url || response?.data?.url || null;
    }
    
    return null;
  }

  /**
   * Send media message through WebRTC
   */
  private async sendMediaMessage(upload: QueuedUpload, mediaUrl: string): Promise<void> {
    try {
      // Import WebRTC service dynamically to avoid circular dependencies
      const { webrtcChatService } = await import('./webrtcChatService');
      
      const messageData = {
        type: 'chat-message',
        content: upload.type === 'image' ? 'Image' : 'Voice message',
        messageType: upload.type,
        senderId: this.getCurrentUserId(),
        senderName: this.getCurrentUserName(),
        mediaUrl: mediaUrl,
        tempId: upload.tempId,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sending'
      };
      
      console.log(`📤 [MediaQueue] Sending ${upload.type} message through WebRTC`);
      
      // Send through WebSocket
      if (webrtcChatService.isConnected && webrtcChatService.websocket) {
        webrtcChatService.websocket.send(JSON.stringify(messageData));
      } else {
        console.warn('⚠️ [MediaQueue] WebRTC not connected, message will be sent when connection is restored');
      }
    } catch (error) {
      console.error('Error sending media message through WebRTC:', error);
      throw error;
    }
  }

  /**
   * Check and refresh authentication token
   */
  private async checkAndRefreshToken(): Promise<boolean> {
    try {
      // Check if token is valid by making a simple API call
      const response = await apiService.get('/user/profile');
      return response.success;
    } catch (error) {
      console.log('🔄 [MediaQueue] Token invalid, attempting refresh...');
      
      try {
        // Try to refresh token
        await apiService.refreshToken();
        return true;
      } catch (refreshError) {
        console.error('❌ [MediaQueue] Token refresh failed:', refreshError);
        return false;
      }
    }
  }

  /**
   * Update upload status in queue
   */
  private async updateUploadStatus(id: string, status: QueuedUpload['status'], mediaUrl?: string): Promise<void> {
    const queue = await this.getQueue();
    const uploadIndex = queue.findIndex(u => u.id === id);
    
    if (uploadIndex !== -1) {
      queue[uploadIndex].status = status;
      if (mediaUrl) {
        queue[uploadIndex].mediaUrl = mediaUrl;
      }
      await this.saveQueue(queue);
    }
  }

  /**
   * Subscribe to upload progress
   */
  subscribeToProgress(uploadId: string, callback: (progress: UploadProgress) => void): () => void {
    this.progressCallbacks.set(uploadId, callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(uploadId);
    };
  }

  /**
   * Notify progress subscribers
   */
  private notifyProgress(uploadId: string, status: QueuedUpload['status'], progress: number, error?: string): void {
    const callback = this.progressCallbacks.get(uploadId);
    if (callback) {
      callback({
        uploadId,
        progress,
        status,
        error
      });
    }
  }

  /**
   * Get upload status by temp ID
   */
  async getUploadStatus(tempId: string): Promise<QueuedUpload | null> {
    const queue = await this.getQueue();
    return queue.find(upload => upload.tempId === tempId) || null;
  }

  /**
   * Clean up completed uploads
   */
  async cleanupCompletedUploads(): Promise<void> {
    const queue = await this.getQueue();
    const activeQueue = queue.filter(upload => upload.status !== 'completed');
    await this.saveQueue(activeQueue);
    console.log(`🧹 [MediaQueue] Cleaned up ${queue.length - activeQueue.length} completed uploads`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
  }> {
    const queue = await this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(u => u.status === 'pending').length,
      uploading: queue.filter(u => u.status === 'uploading').length,
      completed: queue.filter(u => u.status === 'completed').length,
      failed: queue.filter(u => u.status === 'failed').length,
    };
  }

  // Helper methods
  private getCurrentUserId(): number {
    // This should be integrated with your auth service
    // For now, return a placeholder
    return 1;
  }

  private getCurrentUserName(): string {
    // This should be integrated with your auth service
    // For now, return a placeholder
    return 'User';
  }

  /**
   * Initialize queue processing on app start
   */
  async initialize(): Promise<void> {
    console.log('🚀 [MediaQueue] Initializing media upload queue service');
    await this.processQueue();
  }
}

export const mediaUploadQueueService = new MediaUploadQueueService();
export type { QueuedUpload, UploadProgress };
