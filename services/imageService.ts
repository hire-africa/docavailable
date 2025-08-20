import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { apiService } from '../app/services/apiService';

export interface ImageUploadResult {
  success: boolean;
  mediaUrl?: string;
  error?: string;
}

class ImageService {
  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
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
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access to select images.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Take a photo using the camera
   */
  async takePhoto(): Promise<string | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9, // Increase from 0.8 to 0.9 (90% quality)
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('ImageService: Photo taken:', {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          fileSize: result.assets[0].fileSize
        });
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  /**
   * Pick an image from the photo library
   */
  async pickImage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestMediaLibraryPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9, // Increase from 0.8 to 0.9 (90% quality)
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('ImageService: Image picked:', {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          fileSize: result.assets[0].fileSize
        });
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  }

  /**
   * Upload image to the server
   */
  async uploadImage(appointmentId: number, imageUri: string): Promise<ImageUploadResult> {
    try {
      console.log('ImageService: Uploading image:', {
        appointmentId,
        uri: imageUri.substring(0, 50) + '...',
      });

      const formData = new FormData();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const fileName = `image_${uniqueId}.jpg`;

      const fileObject = {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      };

      formData.append('file', fileObject as any);
      formData.append('appointment_id', appointmentId.toString());

      console.log('ImageService: FormData prepared:', {
        fileName,
        formDataEntries: Array.from((formData as any).entries()).map(([key, value]: [any, any]) => ({
          key,
          type: typeof value,
          hasUri: typeof value === 'object' && 'uri' in value,
        })),
      });

      const response = await apiService.uploadFile('/upload/chat-image', formData);

      if (response.success && response.data?.media_url) {
        console.log('ImageService: Upload successful:', response.data.media_url);
        return {
          success: true,
          mediaUrl: response.data.media_url,
        };
      } else {
        console.error('ImageService: Upload failed:', response);
        return {
          success: false,
          error: response.message || 'Upload failed',
        };
      }
    } catch (error: any) {
      console.error('ImageService: Upload error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Send image message to chat
   */
  async sendImageMessage(
    appointmentId: number,
    imageUri: string,
    senderId: number,
    senderName: string
  ): Promise<boolean> {
    try {
      const uploadResult = await this.uploadImage(appointmentId, imageUri);
      
      if (!uploadResult.success || !uploadResult.mediaUrl) {
        console.error('ImageService: Failed to upload image:', uploadResult.error);
        Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        return false;
      }

      const imageMessageId = `image_${appointmentId}_${senderId}_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      console.log('ImageService: Sending image message with unique ID:', imageMessageId);

      console.log('📷 ImageService: About to send image message with ID:', imageMessageId);
      
      const message = await import('../services/messageStorageService').then(
        ({ messageStorageService }) => messageStorageService.sendImageMessage(
          appointmentId,
          uploadResult.mediaUrl,
          senderId,
          senderName,
          imageMessageId
        )
      );

      if (message) {
        console.log('📷 ImageService: Image message sent successfully:', message.id);
      } else {
        console.error('📷 ImageService: Failed to send image message');
      }

      return !!message;
    } catch (error) {
      console.error('ImageService: Error sending image message:', error);
      Alert.alert('Error', 'Failed to send image message');
      return false;
    }
  }
}

export const imageService = new ImageService(); 