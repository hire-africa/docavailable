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

  async uploadVoiceMessage(appointmentId: number, uri: string, retryCount: number = 0): Promise<string | null> {
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
    
    try {
      console.log(`📤 [VoiceService] Upload attempt ${retryCount + 1}/${maxRetries + 1} for appointment ${appointmentId}`);
      
      // Validate inputs
      if (!uri || uri.trim() === '') {
        throw new Error('Invalid audio URI provided');
      }
      
      if (!appointmentId || appointmentId <= 0) {
        throw new Error('Invalid appointment ID provided');
      }

      // Get auth token with proper error handling
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Create form data
      const formData = new FormData();
      
      // Get file info from URI with unique identifier
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const fileName = `voice_${uniqueId}.m4a`;
      
      // Create the file object for FormData - React Native format
      const fileObject = {
        uri: uri,
        type: 'audio/mp4',
        name: fileName,
      };
      
      console.log('📤 [VoiceService] File object for FormData:', {
        fileName,
        type: fileObject.type,
        hasUri: !!fileObject.uri,
        uriLength: fileObject.uri?.length || 0
      });
      
      // For React Native, we need to append the file object directly
      formData.append('file', fileObject as any);
      formData.append('appointment_id', appointmentId.toString());

      // Use proper API service URL construction
      const uploadUrl = `${apiService.baseURL}/upload/voice-message`;
      console.log('📤 [VoiceService] Upload URL:', uploadUrl);
      console.log('📤 [VoiceService] Token present:', !!token);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the system set it with boundary
        },
        body: formData,
      });
      
      // Log response details
      const contentType = response.headers.get('content-type');
      console.log('📤 [VoiceService] Upload response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        contentLength: response.headers.get('content-length')
      });
      
      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('📤 [VoiceService] Upload response data:', responseData);
      } else {
        // Server returned HTML (likely an error page)
        const htmlResponse = await response.text();
        console.error('❌ [VoiceService] Server returned HTML instead of JSON:', htmlResponse.substring(0, 500));
        throw new Error(`Server returned HTML error page: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const errorMessage = responseData?.message || `Upload failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Support multiple possible response shapes
      const uploadedUrl = responseData?.data?.media_url || responseData?.data?.url || responseData?.media_url || responseData?.url;
      if (responseData.success && uploadedUrl) {
        console.log('✅ [VoiceService] Voice message uploaded successfully:', uploadedUrl);
        return uploadedUrl;
      }

      throw new Error('Upload response missing required data');
      
    } catch (error: any) {
      console.error(`❌ [VoiceService] Upload attempt ${retryCount + 1} failed:`, error);
      
      // Handle specific error types
      if (error.message?.includes('Authentication') || error.message?.includes('token')) {
        console.error('❌ [VoiceService] Authentication error');
        throw new Error('Please log in again to upload voice messages');
      } else if (error.message?.includes('too large') || error.message?.includes('413')) {
        console.error('❌ [VoiceService] File too large');
        throw new Error('Voice message is too large. Please record a shorter message');
      } else if (error.message?.includes('Invalid') || error.message?.includes('422')) {
        console.error('❌ [VoiceService] Invalid file format');
        throw new Error('Invalid voice message format. Please try recording again');
      }
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Connection') ||
        error.message?.includes('fetch')
      )) {
        console.log(`🔄 [VoiceService] Retrying upload in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.uploadVoiceMessage(appointmentId, uri, retryCount + 1);
      }
      
      // Final error - no more retries
      console.error('❌ [VoiceService] All upload attempts failed');
      throw error;
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