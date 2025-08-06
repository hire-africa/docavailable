import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
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
  // Debug profile picture URL
      // console.log('ImageMessage Debug:', {
    //   profilePictureUrl,
    //   isOwnMessage,
    //   hasUrl: !!profilePictureUrl
    // });

  const getImageUrl = (uri: string) => {
    // console.log('ImageMessage getImageUrl - Input URI:', uri);
    
    // If it's already a full URL, return as is
    if (uri.startsWith('http')) {
      // console.log('ImageMessage getImageUrl - Returning full URL as is:', uri);
      return uri;
    }
    
    // If it's a local storage path, construct the full URL
    const baseUrl = Platform.select({
      web: 'http://172.20.10.11:8000',
      default: 'http://172.20.10.11:8000'
    });
    
    // Remove any leading slash from the URI to avoid double slashes
    const cleanUri = uri.startsWith('/') ? uri.substring(1) : uri;
    
    // Check if the URI already contains the base URL to avoid double prefixing
    if (cleanUri.includes('172.20.10.11:8000')) {
      // console.log('ImageMessage getImageUrl - URI already contains base URL, returning as is:', cleanUri);
      return cleanUri;
    }
    
    const fullUrl = `${baseUrl}/storage/${cleanUri}`;
    // console.log('ImageMessage getImageUrl - Constructed full URL:', fullUrl);
    
    return fullUrl;
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

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
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
                source={{ uri: imageUrl }}
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
              source={{ uri: imageUrl }}
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