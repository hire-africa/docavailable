import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { validateMessage } from '../utils/messageSanitization';
import { MediaUploadHandler } from './MediaUploadHandler';

interface ChatInputWithMediaProps {
  appointmentId: number;
  onSendMessage: (message: string) => void;
  onImageUploaded?: (tempId: string) => void;
  onVoiceUploaded?: (tempId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInputWithMedia: React.FC<ChatInputWithMediaProps> = ({
  appointmentId,
  onSendMessage,
  onImageUploaded,
  onVoiceUploaded,
  placeholder = "Type a message...",
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const validationResult = validateMessage(message);
  const isMessageValid = validationResult.isValid || message.trim() === '';

  const {
    voiceRecordingState,
    imageUploadState,
    voiceUploadState,
  } = useMediaUpload();

  const handleSendMessage = () => {
    if (!isMessageValid) {
      Alert.alert('Invalid Message', validationResult.reasons.join('\n'));
      return;
    }

    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      inputRef.current?.blur();
    }
  };

  const handleImageUploaded = (tempId: string) => {
    onImageUploaded?.(tempId);
  };

  const handleVoiceUploaded = (tempId: string) => {
    onVoiceUploaded?.(tempId);
  };

  const handleError = (error: string) => {
    Alert.alert('Upload Error', error, [{ text: 'OK' }]);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUploading = imageUploadState.isUploading || voiceUploadState.isUploading;
  const hasError = imageUploadState.error || voiceUploadState.error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Upload Status Bar */}
      {(isUploading || hasError) && (
        <View style={styles.statusBar}>
          {imageUploadState.isUploading && (
            <View style={styles.statusItem}>
              <Ionicons name="image" size={16} color="#007AFF" />
              <Text style={styles.statusText}>
                Image: {imageUploadState.uploadProgress}%
              </Text>
            </View>
          )}

          {voiceUploadState.isUploading && (
            <View style={styles.statusItem}>
              <Ionicons name="mic" size={16} color="#FF3B30" />
              <Text style={styles.statusText}>
                Voice: {voiceUploadState.uploadProgress}%
              </Text>
            </View>
          )}

          {hasError && (
            <View style={styles.errorItem}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>
                Upload failed
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recording Indicator */}
      {voiceRecordingState.isRecording && (
        <View style={styles.recordingBar}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.recordingText}>
            Recording: {formatDuration(voiceRecordingState.duration)}
          </Text>
        </View>
      )}

      {/* Validation Error Bar */}
      {!isMessageValid && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.errorText}>
            {validationResult.reasons[0]}
          </Text>
        </View>
      )}

      {/* Main Input Area */}
      <View style={styles.inputContainer}>
        {/* Media Upload Handler */}
        <MediaUploadHandler
          appointmentId={appointmentId}
          onImageUploaded={handleImageUploaded}
          onVoiceUploaded={handleVoiceUploaded}
          onError={handleError}
        />

        {/* Text Input */}
        <View style={styles.textInputContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              (disabled || voiceRecordingState.isRecording) && styles.disabledInput,
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={voiceRecordingState.isRecording ? "Recording..." : placeholder}
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!disabled && !voiceRecordingState.isRecording}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || disabled || !isMessageValid) && styles.disabledSendButton,
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || disabled || !isMessageValid}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() && !disabled && isMessageValid ? '#007AFF' : '#999'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 4,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5E5',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
    maxHeight: 80,
  },
  sendButton: {
    paddingLeft: 12,
    paddingBottom: 4,
  },
  disabledSendButton: {
    opacity: 0.5,
  },
  disabledInput: {
    color: '#999',
  },
});
