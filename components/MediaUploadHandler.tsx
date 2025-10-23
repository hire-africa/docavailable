import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useMediaUpload } from '../hooks/useMediaUpload';

interface MediaUploadHandlerProps {
  appointmentId: number;
  onImageUploaded?: (tempId: string) => void;
  onVoiceUploaded?: (tempId: string) => void;
  onError?: (error: string) => void;
}

const { width } = Dimensions.get('window');

export const MediaUploadHandler: React.FC<MediaUploadHandlerProps> = ({
  appointmentId,
  onImageUploaded,
  onVoiceUploaded,
  onError,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const {
    pickAndUploadImage,
    takePhotoAndUpload,
    startVoiceRecording,
    stopVoiceRecordingAndUpload,
    cancelVoiceRecording,
    imageUploadState,
    voiceUploadState,
    voiceRecordingState,
    retryUpload,
    cancelUpload,
    clearError,
  } = useMediaUpload();

  const handleImagePick = async () => {
    try {
      setShowOptions(false);
      const result = await pickAndUploadImage(appointmentId);
      
      if (result.success && result.tempId) {
        onImageUploaded?.(result.tempId);
      } else {
        onError?.(result.error || 'Failed to upload image');
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to upload image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowOptions(false);
      const result = await takePhotoAndUpload(appointmentId);
      
      if (result.success && result.tempId) {
        onImageUploaded?.(result.tempId);
      } else {
        onError?.(result.error || 'Failed to take photo');
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to take photo');
    }
  };

  const handleVoiceRecord = async () => {
    try {
      if (isRecording) {
        // Stop recording
        const result = await stopVoiceRecordingAndUpload(appointmentId);
        setIsRecording(false);
        
        if (result.success && result.tempId) {
          onVoiceUploaded?.(result.tempId);
        } else {
          onError?.(result.error || 'Failed to record voice');
        }
      } else {
        // Start recording
        const success = await startVoiceRecording();
        if (success) {
          setIsRecording(true);
        } else {
          onError?.('Failed to start recording');
        }
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to record voice');
    }
  };

  const handleCancelRecording = async () => {
    try {
      await cancelVoiceRecording();
      setIsRecording(false);
    } catch (error: any) {
      onError?.(error.message || 'Failed to cancel recording');
    }
  };

  const handleRetryUpload = async (tempId: string, type: 'image' | 'voice') => {
    try {
      const success = await retryUpload(tempId, type);
      if (!success) {
        onError?.('Failed to retry upload');
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to retry upload');
    }
  };

  const handleCancelUpload = async (tempId: string, type: 'image' | 'voice') => {
    try {
      const success = await cancelUpload(tempId, type);
      if (!success) {
        onError?.('Failed to cancel upload');
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to cancel upload');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Image Upload Button */}
      <TouchableOpacity
        style={styles.mediaButton}
        onPress={() => setShowOptions(true)}
        disabled={imageUploadState.isUploading}
      >
        <Ionicons 
          name="image-outline" 
          size={24} 
          color={imageUploadState.isUploading ? '#999' : '#007AFF'} 
        />
        {imageUploadState.isUploading && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIndicator} />
        )}
      </TouchableOpacity>

      {/* Voice Recording Button */}
      <TouchableOpacity
        style={[
          styles.mediaButton,
          isRecording && styles.recordingButton,
          voiceUploadState.isUploading && styles.disabledButton
        ]}
        onPress={handleVoiceRecord}
        disabled={voiceUploadState.isUploading}
      >
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={24} 
          color={
            isRecording ? '#fff' : 
            voiceUploadState.isUploading ? '#999' : '#FF3B30'
          } 
        />
        {voiceUploadState.isUploading && (
          <ActivityIndicator size="small" color="#FF3B30" style={styles.loadingIndicator} />
        )}
      </TouchableOpacity>

      {/* Recording Duration Display */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>
            {formatDuration(voiceRecordingState.duration)}
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRecording}
          >
            <Ionicons name="close" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Progress Indicators */}
      {imageUploadState.isUploading && (
        <View style={styles.uploadIndicator}>
          <Text style={styles.uploadText}>
            Image: {imageUploadState.uploadProgress}%
          </Text>
          {imageUploadState.uploadStatus === 'failed' && imageUploadState.tempId && (
            <View style={styles.retryContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleRetryUpload(imageUploadState.tempId!, 'image')}
              >
                <Ionicons name="refresh" size={16} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelUploadButton}
                onPress={() => handleCancelUpload(imageUploadState.tempId!, 'image')}
              >
                <Ionicons name="close" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {voiceUploadState.isUploading && (
        <View style={styles.uploadIndicator}>
          <Text style={styles.uploadText}>
            Voice: {voiceUploadState.uploadProgress}%
          </Text>
          {voiceUploadState.uploadStatus === 'failed' && voiceUploadState.tempId && (
            <View style={styles.retryContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleRetryUpload(voiceUploadState.tempId!, 'voice')}
              >
                <Ionicons name="refresh" size={16} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelUploadButton}
                onPress={() => handleCancelUpload(voiceUploadState.tempId!, 'voice')}
              >
                <Ionicons name="close" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Image Source Selection Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleImagePick}
            >
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera-outline" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  cancelButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  uploadText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
  },
  retryContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  retryButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  cancelUploadButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#007AFF',
  },
  cancelOption: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
