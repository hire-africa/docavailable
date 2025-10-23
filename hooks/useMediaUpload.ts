import { useCallback, useEffect, useState } from 'react';
import { enhancedImageService, ImageUploadResult } from '../services/enhancedImageService';
import { enhancedVoiceService, VoiceRecordingResult } from '../services/enhancedVoiceService';
import { UploadProgress } from '../services/mediaUploadQueueService';

interface MediaUploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  tempId?: string;
}

interface UseMediaUploadReturn {
  // Image upload functions
  pickAndUploadImage: (appointmentId: number) => Promise<ImageUploadResult>;
  takePhotoAndUpload: (appointmentId: number) => Promise<ImageUploadResult>;
  
  // Voice upload functions
  startVoiceRecording: () => Promise<boolean>;
  stopVoiceRecordingAndUpload: (appointmentId: number) => Promise<VoiceRecordingResult>;
  cancelVoiceRecording: () => Promise<boolean>;
  
  // Upload state
  imageUploadState: MediaUploadState;
  voiceUploadState: MediaUploadState;
  voiceRecordingState: {
    isRecording: boolean;
    duration: number;
  };
  
  // Utility functions
  retryUpload: (tempId: string, type: 'image' | 'voice') => Promise<boolean>;
  cancelUpload: (tempId: string, type: 'image' | 'voice') => Promise<boolean>;
  clearError: () => void;
}

export const useMediaUpload = (): UseMediaUploadReturn => {
  const [imageUploadState, setImageUploadState] = useState<MediaUploadState>({
    isUploading: false,
    uploadProgress: 0,
    uploadStatus: 'pending',
  });

  const [voiceUploadState, setVoiceUploadState] = useState<MediaUploadState>({
    isUploading: false,
    uploadProgress: 0,
    uploadStatus: 'pending',
  });

  const [voiceRecordingState, setVoiceRecordingState] = useState({
    isRecording: false,
    duration: 0,
  });

  // Update voice recording state periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (voiceRecordingState.isRecording) {
      interval = setInterval(() => {
        setVoiceRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 0.1
        }));
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [voiceRecordingState.isRecording]);

  // Pick image from gallery and upload
  const pickAndUploadImage = useCallback(async (appointmentId: number): Promise<ImageUploadResult> => {
    try {
      setImageUploadState({
        isUploading: true,
        uploadProgress: 0,
        uploadStatus: 'pending',
        error: undefined,
      });

      const result = await enhancedImageService.pickAndQueueImage(appointmentId);
      
      if (result.success && result.tempId) {
        setImageUploadState(prev => ({
          ...prev,
          tempId: result.tempId,
          uploadStatus: 'pending',
        }));

        // Subscribe to upload progress
        const unsubscribe = enhancedImageService.subscribeToImageProgress(
          result.tempId,
          (progress: UploadProgress) => {
            setImageUploadState(prev => ({
              ...prev,
              uploadProgress: progress.progress,
              uploadStatus: progress.status,
              error: progress.error,
              isUploading: progress.status === 'uploading' || progress.status === 'pending',
            }));
          }
        );

        // Clean up subscription after completion or failure
        if (result.tempId) {
          setTimeout(() => {
            unsubscribe();
          }, 30000); // Clean up after 30 seconds
        }
      } else {
        setImageUploadState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'failed',
          error: result.error,
        }));
      }

      return result;
    } catch (error: any) {
      setImageUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadStatus: 'failed',
        error: error.message || 'Failed to pick image',
      }));
      
      return {
        success: false,
        error: error.message || 'Failed to pick image',
      };
    }
  }, []);

  // Take photo with camera and upload
  const takePhotoAndUpload = useCallback(async (appointmentId: number): Promise<ImageUploadResult> => {
    try {
      setImageUploadState({
        isUploading: true,
        uploadProgress: 0,
        uploadStatus: 'pending',
        error: undefined,
      });

      const result = await enhancedImageService.takePhotoAndQueue(appointmentId);
      
      if (result.success && result.tempId) {
        setImageUploadState(prev => ({
          ...prev,
          tempId: result.tempId,
          uploadStatus: 'pending',
        }));

        // Subscribe to upload progress
        const unsubscribe = enhancedImageService.subscribeToImageProgress(
          result.tempId,
          (progress: UploadProgress) => {
            setImageUploadState(prev => ({
              ...prev,
              uploadProgress: progress.progress,
              uploadStatus: progress.status,
              error: progress.error,
              isUploading: progress.status === 'uploading' || progress.status === 'pending',
            }));
          }
        );

        // Clean up subscription after completion or failure
        if (result.tempId) {
          setTimeout(() => {
            unsubscribe();
          }, 30000); // Clean up after 30 seconds
        }
      } else {
        setImageUploadState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'failed',
          error: result.error,
        }));
      }

      return result;
    } catch (error: any) {
      setImageUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadStatus: 'failed',
        error: error.message || 'Failed to take photo',
      }));
      
      return {
        success: false,
        error: error.message || 'Failed to take photo',
      };
    }
  }, []);

  // Start voice recording
  const startVoiceRecording = useCallback(async (): Promise<boolean> => {
    try {
      const success = await enhancedVoiceService.startRecording();
      
      if (success) {
        setVoiceRecordingState({
          isRecording: true,
          duration: 0,
        });
      }
      
      return success;
    } catch (error: any) {
      console.error('Error starting voice recording:', error);
      return false;
    }
  }, []);

  // Stop voice recording and upload
  const stopVoiceRecordingAndUpload = useCallback(async (appointmentId: number): Promise<VoiceRecordingResult> => {
    try {
      setVoiceRecordingState({
        isRecording: false,
        duration: 0,
      });

      setVoiceUploadState({
        isUploading: true,
        uploadProgress: 0,
        uploadStatus: 'pending',
        error: undefined,
      });

      const result = await enhancedVoiceService.stopRecordingAndQueue(appointmentId);
      
      if (result.success && result.tempId) {
        setVoiceUploadState(prev => ({
          ...prev,
          tempId: result.tempId,
          uploadStatus: 'pending',
        }));

        // Subscribe to upload progress
        const unsubscribe = enhancedVoiceService.subscribeToVoiceProgress(
          result.tempId,
          (progress: UploadProgress) => {
            setVoiceUploadState(prev => ({
              ...prev,
              uploadProgress: progress.progress,
              uploadStatus: progress.status,
              error: progress.error,
              isUploading: progress.status === 'uploading' || progress.status === 'pending',
            }));
          }
        );

        // Clean up subscription after completion or failure
        if (result.tempId) {
          setTimeout(() => {
            unsubscribe();
          }, 30000); // Clean up after 30 seconds
        }
      } else {
        setVoiceUploadState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'failed',
          error: result.error,
        }));
      }

      return result;
    } catch (error: any) {
      setVoiceUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadStatus: 'failed',
        error: error.message || 'Failed to record voice',
      }));
      
      return {
        success: false,
        error: error.message || 'Failed to record voice',
      };
    }
  }, []);

  // Cancel voice recording
  const cancelVoiceRecording = useCallback(async (): Promise<boolean> => {
    try {
      const success = await enhancedVoiceService.cancelRecording();
      
      if (success) {
        setVoiceRecordingState({
          isRecording: false,
          duration: 0,
        });
      }
      
      return success;
    } catch (error: any) {
      console.error('Error canceling voice recording:', error);
      return false;
    }
  }, []);

  // Retry upload
  const retryUpload = useCallback(async (tempId: string, type: 'image' | 'voice'): Promise<boolean> => {
    try {
      if (type === 'image') {
        return await enhancedImageService.retryImageUpload(tempId);
      } else {
        return await enhancedVoiceService.retryVoiceUpload(tempId);
      }
    } catch (error) {
      console.error('Error retrying upload:', error);
      return false;
    }
  }, []);

  // Cancel upload
  const cancelUpload = useCallback(async (tempId: string, type: 'image' | 'voice'): Promise<boolean> => {
    try {
      if (type === 'image') {
        return await enhancedImageService.cancelImageUpload(tempId);
      } else {
        return await enhancedVoiceService.cancelVoiceUpload(tempId);
      }
    } catch (error) {
      console.error('Error canceling upload:', error);
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setImageUploadState(prev => ({
      ...prev,
      error: undefined,
    }));
    setVoiceUploadState(prev => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  return {
    // Image upload functions
    pickAndUploadImage,
    takePhotoAndUpload,
    
    // Voice upload functions
    startVoiceRecording,
    stopVoiceRecordingAndUpload,
    cancelVoiceRecording,
    
    // Upload state
    imageUploadState,
    voiceUploadState,
    voiceRecordingState,
    
    // Utility functions
    retryUpload,
    cancelUpload,
    clearError,
  };
};
