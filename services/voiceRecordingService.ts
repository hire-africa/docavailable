import { Audio } from 'expo-av';
import { apiService } from '../app/services/apiService';
import { messageStorageService } from './messageStorageService';

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
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          type: typeof value,
          hasUri: typeof value === 'object' && 'uri' in value,
        })),
      });

      const response = await apiService.uploadFile('/upload/voice-message', formData);

      console.log('📤 Voice message upload response:', response);

      if (response.success && response.data?.url) {
        return response.data.url;
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
      // Upload the voice message first
      const mediaUrl = await this.uploadVoiceMessage(appointmentId, audioUri);
      
      if (!mediaUrl) {
        console.error('Failed to upload voice message');
        return false;
      }

      // Generate a more unique identifier for voice messages
      const voiceMessageId = `voice_${appointmentId}_${senderId}_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      
      console.log('🎤 Sending voice message with unique ID:', voiceMessageId);

      // Use the messageStorageService to send the voice message
      const message = await messageStorageService.sendVoiceMessage(
        appointmentId,
        mediaUrl,
        senderId,
        senderName,
        voiceMessageId // Pass the unique voice message ID
      );

      return !!message;
    } catch (error) {
      console.error('Error sending voice message:', error);
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