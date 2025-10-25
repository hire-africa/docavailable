import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { environment } from '../config/environment';
import ReadReceipt from './ReadReceipt';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageMessageProps {
  imageUrl: string;
  isOwnMessage?: boolean;
  timestamp?: string;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  profilePictureUrl?: string;
  readBy?: any[];
  otherParticipantId?: number;
  messageTime?: string;
}

export default function ImageMessage({ 
  imageUrl, 
  isOwnMessage = false, 
  timestamp,
  deliveryStatus = 'sent',
  profilePictureUrl,
  readBy,
  otherParticipantId,
  messageTime
}: ImageMessageProps) {
  // Debug: Log the image URL we receive
  console.log('🖼️ ImageMessage received imageUrl:', imageUrl);
  
  // Debug profile picture URL
      // console.log('ImageMessage Debug:', {
    //   profilePictureUrl,
    //   isOwnMessage,
    //   hasUrl: !!profilePictureUrl
    // });

  const getImageUrl = (uri: string) => {
    // If already a full URL or local file, return as-is
    if (uri.startsWith('http') || uri.startsWith('file://')) {
      console.log('🖼️ ImageMessage: Using full URL:', uri);
      return uri;
    }
    
    // If it's an absolute path on device
    if (uri.startsWith('/')) {
      const fileUrl = `file://${uri}`;
      console.log('🖼️ ImageMessage: Using file URL:', fileUrl);
      return fileUrl;
    }
    
    // If it's a WebRTC server image path
    if (uri.startsWith('/api/images/')) {
      const webrtcUrl = `https://docavailable.org:8089${uri}`;
      console.log('🖼️ ImageMessage: Using WebRTC server URL:', webrtcUrl);
      return webrtcUrl;
    }
    
    // If it's a Laravel API path
    if (uri.startsWith('/api/')) {
      const laravelApiUrl = `${environment.BASE_URL}${uri}`;
      console.log('🖼️ ImageMessage: Using Laravel API URL:', laravelApiUrl);
      return laravelApiUrl;
    }
    
    // Otherwise, try WebRTC server first, then Laravel API
    const webrtcUrl = `https://docavailable.org:8089/api/images/${uri}`;
    console.log('🖼️ ImageMessage: Trying WebRTC server URL:', webrtcUrl);
    return webrtcUrl;
  };

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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
    console.error('🖼️ ImageMessage: Failed URL:', getImageUrl(imageUrl));
    setImageLoading(false);
    setImageError(true);
    
    // For iOS, try alternative URL format if first attempt fails
    if (Platform.OS === 'ios' && !imageError) {
      console.log('🔄 Retrying image with alternative URL format...');
      setImageError(false);
      setImageLoading(true);
      
      // Try with URL encoding
      const alternativeUrl = encodeURI(imageUrl);
      
      // Force re-render with alternative URL
      setTimeout(() => {
        setImageLoading(false);
      }, 1000);
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
                source={{ uri: getImageUrl(imageUrl) }}
                style={styles.image}
                onLoad={handleImageLoad}
                onError={handleImageError}
                resizeMode="cover"
              />
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
              deliveryStatus={deliveryStatus}
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
              source={{ uri: getImageUrl(imageUrl) }}
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
}); 