import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import environment from '../config/environment';
import { Alert } from 'react-native';

export interface ImageUploadResult {
  success: boolean;
  mediaUrl?: string;
  imageUrl?: string; // Add imageUrl for backward compatibility
  imageId?: string; // ID for fetching signed URLs from private storage
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
   * Upload image to the server (overloaded method)
   */
  async uploadImage(imageUri: string): Promise<ImageUploadResult>;
  async uploadImage(appointmentId: number, imageUri: string): Promise<ImageUploadResult>;
  async uploadImage(appointmentIdOrImageUri: number | string, imageUri?: string): Promise<ImageUploadResult> {
    // Handle overloaded parameters
    let actualAppointmentId: number;
    let actualImageUri: string;
    
    if (typeof appointmentIdOrImageUri === 'string') {
      // Called with just imageUri - use default appointment ID
      actualImageUri = appointmentIdOrImageUri;
      actualAppointmentId = 0; // Default value
    } else {
      // Called with appointmentId and imageUri
      actualAppointmentId = appointmentIdOrImageUri;
      actualImageUri = imageUri!;
    }
    try {
      console.log('ImageService: Uploading image:', {
        appointmentId: actualAppointmentId,
        uri: actualImageUri.substring(0, 50) + '...',
      });

      const formData = new FormData();
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const fileName = `image_${uniqueId}.jpg`;

      const fileObject = {
        uri: actualImageUri,
        type: 'image/jpeg',
        name: fileName,
      };

      formData.append('file', fileObject as any);
      formData.append('appointment_id', actualAppointmentId.toString());

      console.log('ImageService: FormData prepared:', {
        fileName,
        formDataEntries: Array.from((formData as any).entries()).map(([key, value]: [any, any]) => ({
          key,
          type: typeof value,
          hasUri: typeof value === 'object' && 'uri' in value,
        })),
      });

      // Upload to backend
      console.log('📤 [ImageService] Uploading image to backend...');
      const { apiService } = await import('./apiService');
      const responseData = await apiService.uploadFile('/upload/chat-image', formData);
      console.log('📤 [ImageService] Upload response:', responseData);
      
      if (responseData?.success && responseData?.data?.media_url) {
        console.log('✅ [ImageService] Image uploaded successfully:', responseData.data.media_url);
        return { 
          success: true, 
          mediaUrl: responseData.data.media_url,
          imageUrl: responseData.data.media_url
        };
      }

      throw new Error('Upload failed');
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