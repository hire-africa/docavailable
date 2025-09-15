import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface ImageMessageViewerProps {
  imageUri: string;
  isOwnMessage?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageMessageViewer({ imageUri, isOwnMessage = false }: ImageMessageViewerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const openImageModal = () => {
    if (!imageError) {
      setIsModalVisible(true);
    }
  };

  const closeImageModal = () => {
    setIsModalVisible(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Failed to load image:', imageUri);
  };

  if (imageError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="image-outline" size={24} color="#666" />
        <Text style={styles.errorText}>Image failed to load</Text>
      </View>
    );
  }

  return (
    <>
      {/* Thumbnail Image (tappable) */}
      <TouchableOpacity onPress={openImageModal} activeOpacity={0.8}>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          )}
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.thumbnailImage,
              { opacity: imageLoading ? 0 : 1 }
            ]}
            resizeMode="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </View>
      </TouchableOpacity>

      {/* Full Screen Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeImageModal}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Full Screen Image */}
          <TouchableOpacity
            style={styles.fullScreenContainer}
            onPress={closeImageModal}
            activeOpacity={1}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    marginVertical: 4,
  },
  thumbnailImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  errorContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
}); 