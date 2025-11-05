import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { environment } from '../config/environment';
import { signedUrlService } from '../services/signedUrlService';
import ReadReceipt from './ReadReceipt';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageMessageProps {
  imageUrl: string;
  isOwnMessage?: boolean;
  timestamp?: string;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  profilePictureUrl?: string;
  readBy?: any[];
  otherParticipantId?: number;
  messageTime?: string;
  appointmentId?: string;
}

export default function ImageMessage({ 
  imageUrl, 
  isOwnMessage = false, 
  timestamp,
  deliveryStatus = 'sent',
  profilePictureUrl,
  readBy,
  otherParticipantId,
  messageTime,
  appointmentId
}: ImageMessageProps) {
  // Debug: Log the image URL we receive
  console.log('🖼️ ImageMessage received imageUrl:', imageUrl);
  
  // Debug profile picture URL
      // console.log('ImageMessage Debug:', {
    //   profilePictureUrl,
    //   isOwnMessage,
    //   hasUrl: !!profilePictureUrl
    // });

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [fetchingSignedUrl, setFetchingSignedUrl] = useState(false);

  // Set image URL
  useEffect(() => {
    // Local file - use as-is
    if (imageUrl.startsWith('file://')) {
      console.log('📁 [ImageMessage] Using local file');
      setCurrentImageUrl(imageUrl);
    }
    // Absolute path - convert to file URL
    else if (imageUrl.startsWith('/')) {
      const fileUrl = `file://${imageUrl}`;
      console.log('📁 [ImageMessage] Converting to file URL');
      setCurrentImageUrl(fileUrl);
    }
    // Server URL - use it (backend fixed!)
    else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('🌐 [ImageMessage] Using server URL');
      setCurrentImageUrl(imageUrl);
    }
    // Unknown format
    else {
      console.log('⚠️ [ImageMessage] Unknown format:', imageUrl);
      setCurrentImageUrl(imageUrl);
    }
  }, [imageUrl]);

  const handleImagePress = () => {
    if (!imageError) {
      setImageModalVisible(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (error: any) => {
    console.error('🖼️ ImageMessage: Image load error:', error);
    console.error('🖼️ ImageMessage: Failed URL:', currentImageUrl);
    
    // Try fallback URLs if we haven't exceeded retry limit
    if (retryCount < 3) {
      console.log(`🔄 ImageMessage: Trying fallback URL (attempt ${retryCount + 1}/3)`);
      
      let fallbackUrl: string;
      
      if (retryCount === 0) {
        // First retry: try HTTPS if HTTP failed
        if (currentImageUrl.startsWith('http://')) {
          fallbackUrl = currentImageUrl.replace('http://', 'https://');
        } else {
          // Try different path structure - remove /api/ prefix
          fallbackUrl = currentImageUrl.replace('/api/images/', '/images/');
        }
      } else if (retryCount === 1) {
        // Second retry: try storage URL pattern (common for Laravel apps)
        if (imageUrl.includes('/api/images/chat_images/')) {
          // Extract the path after chat_images/
          const pathAfterChatImages = imageUrl.substring(imageUrl.indexOf('/chat_images/') + 13);
          fallbackUrl = `${environment.LARAVEL_API_URL}/storage/chat_images/${pathAfterChatImages}`;
        } else {
          // Try direct file access without API prefix
          const filename = imageUrl.split('/').pop() || imageUrl;
          fallbackUrl = `${environment.LARAVEL_API_URL}/storage/images/${filename}`;
        }
      } else {
        // Third retry: try public folder pattern (another common Laravel pattern)
        if (imageUrl.includes('/api/images/chat_images/')) {
          // Extract filename and try public folder
          const filename = imageUrl.split('/').pop() || imageUrl;
          fallbackUrl = `${environment.LARAVEL_API_URL}/chat_images/${filename}`;
        } else {
          // Try uploads folder pattern
          const filename = imageUrl.split('/').pop() || imageUrl;
          fallbackUrl = `${environment.LARAVEL_API_URL}/uploads/chat_images/${filename}`;
        }
      }
      
      console.log('🔄 ImageMessage: Fallback URL:', fallbackUrl);
      setCurrentImageUrl(fallbackUrl);
      setRetryCount(retryCount + 1);
      setImageLoading(true);
      setImageError(false);
    } else {
      // All retries failed - show placeholder instead of error
      console.error('❌ ImageMessage: All fallback URLs failed, showing placeholder');
      setImageError(true);
      setImageLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
                   {profilePictureUrl ? (
           <Image
             source={{ uri: profilePictureUrl }}
             style={styles.profilePicture}
             onError={() => {
               // console.log('ImageMessage: Profile picture failed to load, showing fallback');
             }}
             onLoad={() => {
               // console.log('ImageMessage: Profile picture loaded successfully:', profilePictureUrl);
             }}
           />
         ) : (
            <View style={styles.profilePictureFallback}>
              <Ionicons name="person" size={16} color={isOwnMessage ? "#fff" : "#666"} />
            </View>
          )}
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#4CAF50"} />
            </View>
          )}
          
          {imageError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="image-outline" size={24} color={isOwnMessage ? "#fff" : "#666"} />
              <Text style={[styles.errorText, { color: isOwnMessage ? "#fff" : "#666" }]}>
                Failed to load image
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
              <Image
                source={{ uri: currentImageUrl }}
                style={styles.image}
                onLoad={handleImageLoad}
                onError={handleImageError}
                resizeMode="cover"
              />
              
              {/* Upload status overlay */}
              {(deliveryStatus === 'sending' || fetchingSignedUrl) && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadingText}>
                    {fetchingSignedUrl ? 'Loading...' : 'Uploading...'}
                  </Text>
                </View>
              )}
              
              {deliveryStatus === 'failed' && (
                <View style={styles.failedOverlay}>
                  <Ionicons name="warning" size={16} color="#fff" />
                  <Text style={styles.failedText}>Failed</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Timestamp and Delivery Status */}
          <View style={styles.timestampContainer}>
            {timestamp && (
              <Text style={[styles.timestampText, { color: isOwnMessage ? "#fff" : "#666" }]}>
                {timestamp}
              </Text>
            )}
            <ReadReceipt
              isOwnMessage={isOwnMessage}
              deliveryStatus={deliveryStatus === 'failed' ? 'sent' : deliveryStatus}
              readBy={readBy}
              otherParticipantId={otherParticipantId}
              messageTime={messageTime}
            />
          </View>
        </View>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setImageModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.modalImageContainer}
            onPress={() => setImageModalVisible(false)}
            activeOpacity={1}
          >
            <Image
              source={{ uri: currentImageUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxWidth: '85%',
    minHeight: 70,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  profilePictureContainer: {
    marginRight: 8,
  },
  profilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profilePictureFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestampText: {
    fontSize: 10,
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  failedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,0,0,0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  failedText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
}); 