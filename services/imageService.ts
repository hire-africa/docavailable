import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { apiService } from './apiService';

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
      
      // Provide more specific error messages for different scenarios
      let errorMessage = 'Network error';
      
      if (error.message?.includes('Authentication required')) {
        errorMessage = 'Please log in again to upload images';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again';
      } else if (error.response?.status === 413) {
        errorMessage = 'Image is too large. Please select a smaller image';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid image format. Please select a valid image file';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
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
      if (uploadResult.success) {
        console.log('📤 [ImageService] Image uploaded successfully for WebRTC');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [ImageService] Error uploading image for WebRTC:', error);
      return false;
    }
  }
}

export const imageService = new ImageService(); 