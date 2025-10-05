import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { apiService } from '../app/services/apiService';
import { environment } from '../config/environment';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordingUri?: string;
}

class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;
  private recordingStartTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupAudioMode();
  }

  private async setupAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up audio mode:', error);
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Recording permission not granted');
        return false;
      }

      // Prepare recording
      await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // This callback is called when recording status changes
          console.log('Recording status:', status);
        },
        100 // Update every 100ms
      ).then(({ recording }) => {
        this.recording = recording;
        this.recordingStartTime = Date.now();
        this.startDurationTimer();
      });

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.stopDurationTimer();

      if (uri) {
        this.recordingUri = uri;
        return uri;
      }

      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  }

  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      this.stopDurationTimer();
      this.recordingUri = null;
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  }

  private startDurationTimer() {
    this.durationInterval = setInterval(() => {
      // Duration is calculated in the component
    }, 100);
  }

  private stopDurationTimer() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  async uploadVoiceMessage(appointmentId: number, uri: string): Promise<string | null> {
    try {
      // Create form data
      const formData = new FormData();
      
      // Get file info from URI with unique identifier
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const fileName = `voice_${uniqueId}.m4a`;
      
      // Create the file object for FormData
      const fileObject = {
        uri: uri,
        type: 'audio/mp4',
        name: fileName,
      };
      
      console.log('📤 File object for FormData:', fileObject);
      
      formData.append('file', fileObject as any);
      
      formData.append('appointment_id', appointmentId.toString());

      console.log('📤 Uploading voice message:', {
        appointmentId,
        fileName,
        uri: uri.substring(0, 50) + '...', // Log partial URI for debugging
        formDataEntries: Array.from((formData as any).entries()).map(([key, value]: [any, any]) => ({
          key,
          type: typeof value,
          hasUri: typeof value === 'object' && 'uri' in value,
        })),
      });

      const response = await apiService.uploadFile('/upload/voice-message', formData);

      console.log('📤 Voice message upload response:', response);

      // Support multiple possible response shapes: { data: { media_url } } or { data: { url } } or flat { media_url | url }
      const uploadedUrl = response?.data?.media_url || response?.data?.url || response?.media_url || response?.url;
      if (response.success && uploadedUrl) {
        return uploadedUrl;
      }

      console.error('❌ Voice message upload failed:', response);
      return null;
    } catch (error: any) {
      console.error('❌ Error uploading voice message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Provide more specific error messages for different scenarios
      if (error.message?.includes('Authentication required')) {
        console.error('❌ [VoiceService] Authentication error - user needs to log in again');
        throw new Error('Please log in again to upload voice messages');
      } else if (error.response?.status === 401) {
        console.error('❌ [VoiceService] Unauthorized - token may be expired');
        throw new Error('Session expired. Please log in again');
      } else if (error.response?.status === 413) {
        console.error('❌ [VoiceService] File too large');
        throw new Error('Voice message is too large. Please record a shorter message');
      } else if (error.response?.status === 422) {
        console.error('❌ [VoiceService] Invalid file format or missing data');
        throw new Error('Invalid voice message format. Please try recording again');
      }
      
      return null;
    }
  }

  async sendVoiceMessage(
    appointmentId: number,
    audioUri: string,
    senderId: number,
    senderName: string
  ): Promise<boolean> {
    try {
      console.log('📤 [VoiceService] Sending voice message via backend API');
      
      // Upload the voice file first
      const mediaUrl = await this.uploadVoiceMessage(appointmentId, audioUri);
      
      if (!mediaUrl) {
        console.error('❌ [VoiceService] Failed to upload voice message');
        return false;
      }

      // Send message via API
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/chat/${appointmentId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          message: 'Voice message',
          message_type: 'voice',
          media_url: mediaUrl,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [VoiceService] Voice message sent successfully');
        return true;
      } else {
        console.error('❌ [VoiceService] API returned error:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ [VoiceService] Error sending voice message:', error);
      return false;
    }
  }

  getRecordingDuration(): number {
    if (!this.recordingStartTime) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export const voiceRecordingService = new VoiceRecordingService(); 