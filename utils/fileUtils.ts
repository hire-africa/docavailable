import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  compressedUri?: string;
  originalSize?: number;
  compressedSize?: number;
}

export interface UploadProgress {
  progress: number;
  stage: 'validating' | 'compressing' | 'converting' | 'uploading' | 'complete';
  message: string;
}

export class FileUtils {
  // File size limits (in bytes)
  static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  static readonly MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
  
  // Supported file types
  static readonly SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];
  static readonly SUPPORTED_DOCUMENT_TYPES = ['jpg', 'jpeg', 'png', 'pdf'];

  /**
   * Validate an image file (simplified without compression)
   */
  static async validateAndCompressImage(
    uri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileValidationResult> {
    try {
      onProgress?.({
        progress: 0.1,
        stage: 'validating',
        message: 'Validating file...'
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return { isValid: false, error: 'File does not exist' };
      }

      // Handle size property safely
      let originalSize = 0;
      if ('size' in fileInfo && typeof fileInfo.size === 'number') {
        originalSize = fileInfo.size;
      } else {
        // Fallback: try to get size from fetch
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          originalSize = blob.size;
        } catch {
          // If we can't get size, proceed with validation but warn
          console.warn('Could not determine file size for:', uri);
        }
      }

      // Check file size
      if (originalSize > this.MAX_IMAGE_SIZE) {
        return {
          isValid: false,
          error: `File too large. Maximum size is ${this.formatFileSize(this.MAX_IMAGE_SIZE)}`
        };
      }

      onProgress?.({
        progress: 0.8,
        stage: 'converting',
        message: 'Processing image...'
      });

      // For now, return the original URI without compression
      // TODO: Add compression when expo-image-manipulator is available
      return {
        isValid: true,
        compressedUri: uri,
        originalSize,
        compressedSize: originalSize
      };

    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        error: 'Failed to process image. Please try again.'
      };
    }
  }

  /**
   * Convert image to base64 with progress tracking
   */
  static async convertToBase64WithProgress(
    uri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      onProgress?.({
        progress: 0.9,
        stage: 'converting',
        message: 'Converting to base64...'
      });

      // Use timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('File conversion timeout. Please try a smaller image.'));
      }, 15000); // 15 second timeout

      fetch(uri)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          
          reader.onloadend = () => {
            clearTimeout(timeout);
            onProgress?.({
              progress: 1.0,
              stage: 'complete',
              message: 'Upload complete!'
            });
            resolve(reader.result as string);
          };
          
          reader.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to convert image. Please try again.'));
          };
          
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Validate document file
   */
  static async validateDocument(uri: string): Promise<FileValidationResult> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return { isValid: false, error: 'File does not exist' };
      }

      // Handle size property safely
      let fileSize = 0;
      if ('size' in fileInfo && typeof fileInfo.size === 'number') {
        fileSize = fileInfo.size;
      } else {
        // Fallback: try to get size from fetch
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          fileSize = blob.size;
        } catch {
          console.warn('Could not determine file size for document:', uri);
        }
      }
      
      if (fileSize > this.MAX_DOCUMENT_SIZE) {
        return {
          isValid: false,
          error: `Document too large. Maximum size is ${this.formatFileSize(this.MAX_DOCUMENT_SIZE)}`
        };
      }

      return {
        isValid: true,
        compressedUri: uri,
        originalSize: fileSize,
        compressedSize: fileSize
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate document. Please try again.'
      };
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Show file validation error
   */
  static showValidationError(error: string) {
    Alert.alert('File Error', error, [{ text: 'OK' }]);
  }

  /**
   * Get file extension from URI
   */
  static getFileExtension(uri: string): string {
    return uri.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is supported
   */
  static isImageTypeSupported(uri: string): boolean {
    const extension = this.getFileExtension(uri);
    return this.SUPPORTED_IMAGE_TYPES.includes(extension);
  }

  static isDocumentTypeSupported(uri: string): boolean {
    const extension = this.getFileExtension(uri);
    return this.SUPPORTED_DOCUMENT_TYPES.includes(extension);
  }
}

export default FileUtils;
