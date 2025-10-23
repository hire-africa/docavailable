import { Audio } from 'expo-av';
import { mediaUploadQueueService, UploadProgress } from './mediaUploadQueueService';

interface VoiceRecordingResult {
  success: boolean;
  tempId?: string;
  error?: string;
}

interface VoiceRecordingOptions {
  quality?: Audio.RecordingOptionsPresets;
  maxDuration?: number;
  android?: {
    extension: string;
    outputFormat: string;
    audioEncoder: string;
    sampleRate: number;
    numberOfChannels: number;
    bitRate: number;
  };
  ios?: {
    extension: string;
    outputFormat: string;
    audioQuality: string;
    sampleRate: number;
    numberOfChannels: number;
    bitRate: number;
    linearPCMBitDepth: number;
    linearPCMIsBigEndian: boolean;
    linearPCMIsFloat: boolean;
  };
}

class EnhancedVoiceService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private recordingDuration = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private defaultOptions: VoiceRecordingOptions = {
    quality: Audio.RecordingOptionsPresets.HIGH_QUALITY,
    maxDuration: 300, // 5 minutes max
  };

  constructor() {
    this.setupAudioMode();
  }

  /**
   * Setup audio mode for recording
   */
  private async setupAudioMode(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
    } catch (error) {
      console.error('Error setting up audio mode:', error);
    }
  }

  /**
   * Request audio recording permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  /**
   * Start recording voice message
   */
  async startRecording(): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.log('🎤 [EnhancedVoice] Already recording');
        return false;
      }

      // Check permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Permission denied. Please allow microphone access.');
      }

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      console.log('🎤 [EnhancedVoice] Starting voice recording');
      
      // Create new recording
      this.recording = new Audio.Recording();
      
      // Start recording
      await this.recording.prepareToRecordAsync(this.defaultOptions);
      await this.recording.startAsync();
      
      this.isRecording = true;
      this.recordingDuration = 0;
      
      // Start duration timer
      this.startDurationTimer();
      
      console.log('✅ [EnhancedVoice] Voice recording started');
      return true;
    } catch (error: any) {
      console.error('❌ [EnhancedVoice] Error starting recording:', error);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stop recording and add to upload queue
   */
  async stopRecordingAndQueue(appointmentId: number): Promise<VoiceRecordingResult> {
    try {
      if (!this.isRecording || !this.recording) {
        return {
          success: false,
          error: 'No active recording to stop'
        };
      }

      console.log('🎤 [EnhancedVoice] Stopping voice recording');
      
      // Stop recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        return {
          success: false,
          error: 'Failed to get recording URI'
        };
      }

      // Reset recording state
      this.isRecording = false;
      this.stopDurationTimer();
      
      console.log('🎤 [EnhancedVoice] Voice recording stopped:', {
        uri: uri.substring(0, 50) + '...',
        duration: this.recordingDuration
      });

      // Generate temp ID for immediate UI feedback
      const tempId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🎤 [EnhancedVoice] Adding voice to upload queue:', tempId);
      
      // Add to upload queue
      const uploadId = await mediaUploadQueueService.addToQueue({
        type: 'voice',
        appointmentId,
        fileUri: uri,
        tempId,
      });

      console.log('✅ [EnhancedVoice] Voice added to queue successfully:', uploadId);
      
      return {
        success: true,
        tempId
      };
    } catch (error: any) {
      console.error('❌ [EnhancedVoice] Error stopping recording and queuing:', error);
      this.isRecording = false;
      this.stopDurationTimer();
      return {
        success: false,
        error: error.message || 'Failed to stop recording'
      };
    }
  }

  /**
   * Cancel current recording
   */
  async cancelRecording(): Promise<boolean> {
    try {
      if (!this.isRecording || !this.recording) {
        return false;
      }

      console.log('🎤 [EnhancedVoice] Canceling voice recording');
      
      await this.recording.stopAndUnloadAsync();
      this.isRecording = false;
      this.stopDurationTimer();
      
      console.log('✅ [EnhancedVoice] Voice recording canceled');
      return true;
    } catch (error) {
      console.error('❌ [EnhancedVoice] Error canceling recording:', error);
      return false;
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.recordingDuration
    };
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      this.recordingDuration += 0.1;
    }, 100);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Subscribe to upload progress for a specific voice message
   */
  subscribeToVoiceProgress(tempId: string, callback: (progress: UploadProgress) => void): () => void {
    return mediaUploadQueueService.subscribeToProgress(tempId, callback);
  }

  /**
   * Get upload status for a specific voice message
   */
  async getVoiceUploadStatus(tempId: string) {
    return await mediaUploadQueueService.getUploadStatus(tempId);
  }

  /**
   * Get all pending voice uploads for an appointment
   */
  async getPendingVoiceUploads(appointmentId: number) {
    const queue = await mediaUploadQueueService.getQueue();
    return queue.filter(upload => 
      upload.type === 'voice' && 
      upload.appointmentId === appointmentId && 
      (upload.status === 'pending' || upload.status === 'uploading')
    );
  }

  /**
   * Cancel a specific voice upload
   */
  async cancelVoiceUpload(tempId: string): Promise<boolean> {
    try {
      const queue = await mediaUploadQueueService.getQueue();
      const uploadIndex = queue.findIndex(upload => upload.tempId === tempId && upload.type === 'voice');
      
      if (uploadIndex !== -1) {
        queue.splice(uploadIndex, 1);
        await mediaUploadQueueService.saveQueue(queue);
        console.log('❌ [EnhancedVoice] Canceled voice upload:', tempId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EnhancedVoice] Error canceling voice upload:', error);
      return false;
    }
  }

  /**
   * Retry a failed voice upload
   */
  async retryVoiceUpload(tempId: string): Promise<boolean> {
    try {
      const queue = await mediaUploadQueueService.getQueue();
      const uploadIndex = queue.findIndex(upload => upload.tempId === tempId && upload.type === 'voice');
      
      if (uploadIndex !== -1) {
        queue[uploadIndex].status = 'pending';
        queue[uploadIndex].retryCount = 0;
        queue[uploadIndex].error = undefined;
        
        await mediaUploadQueueService.saveQueue(queue);
        await mediaUploadQueueService.processQueue();
        
        console.log('🔄 [EnhancedVoice] Retrying voice upload:', tempId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EnhancedVoice] Error retrying voice upload:', error);
      return false;
    }
  }

  /**
   * Get voice upload statistics
   */
  async getVoiceUploadStats() {
    const stats = await mediaUploadQueueService.getQueueStats();
    const queue = await mediaUploadQueueService.getQueue();
    const voiceUploads = queue.filter(upload => upload.type === 'voice');
    
    return {
      ...stats,
      voiceUploads: voiceUploads.length,
      voicePending: voiceUploads.filter(u => u.status === 'pending').length,
      voiceUploading: voiceUploads.filter(u => u.status === 'uploading').length,
      voiceCompleted: voiceUploads.filter(u => u.status === 'completed').length,
      voiceFailed: voiceUploads.filter(u => u.status === 'failed').length,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isRecording && this.recording) {
        await this.cancelRecording();
      }
      
      if (this.recording) {
        this.recording = null;
      }
      
      this.stopDurationTimer();
      console.log('🧹 [EnhancedVoice] Voice service cleaned up');
    } catch (error) {
      console.error('❌ [EnhancedVoice] Error during cleanup:', error);
    }
  }
}

export const enhancedVoiceService = new EnhancedVoiceService();
export type { VoiceRecordingOptions, VoiceRecordingResult };

