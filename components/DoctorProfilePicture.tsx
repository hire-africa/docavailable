import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface DoctorProfilePictureProps {
  imageUrl?: string;
  profilePictureUrl?: string;
  profilePicture?: string;
  size?: number;
  name?: string;
  style?: any;
}

const DoctorProfilePicture: React.FC<DoctorProfilePictureProps> = ({ 
  imageUrl,
  profilePictureUrl,
  profilePicture,
  size = 60, 
  name,
  style
}) => {
  // Use the same URL normalization logic as other components
  const getImageUrl = (uri: string) => {
    if (uri.startsWith('http')) {
      return uri;
    }
    // Use the new image serving route instead of direct storage access
    return `https://docavailable-1.onrender.com/api/images/${uri}`;
  };

  // Determine which image to use (priority: profilePictureUrl > profilePicture > imageUrl)
  const finalImageUrl = profilePictureUrl || profilePicture || imageUrl;
  const displayUrl = finalImageUrl ? getImageUrl(finalImageUrl) : null;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {displayUrl ? (
        <Image 
          source={{ uri: displayUrl }} 
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
          onError={(error) => {
            console.error('DoctorProfilePicture - Image load error:', error);
          }}
          onLoad={() => {
            console.log('DoctorProfilePicture - Image loaded successfully:', displayUrl);
          }}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>👨‍⚕️</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
  },
});

export default DoctorProfilePicture; 