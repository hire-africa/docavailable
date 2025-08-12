import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
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
  const [imageError, setImageError] = useState(false);

  // Use the same URL normalization logic as other components
  const getImageUrl = (uri: string) => {
    if (!uri || typeof uri !== 'string') {
      return null;
    }
    
    if (uri.startsWith('http')) {
      return uri;
    }
    
    // Clean the URI to remove any leading slashes or storage prefixes
    let cleanUri = uri.trim();
    if (cleanUri.startsWith('/storage/')) {
      cleanUri = cleanUri.substring('/storage/'.length);
    }
    if (cleanUri.startsWith('storage/')) {
      cleanUri = cleanUri.substring('storage/'.length);
    }
    cleanUri = cleanUri.replace(/^\/+/, ''); // Remove leading slashes
    
    // Use the new image serving route instead of direct storage access
    return `https://docavailable-1.onrender.com/api/images/${cleanUri}`;
  };

  // Determine which image to use (priority: profilePictureUrl > profilePicture > imageUrl)
  const finalImageUrl = profilePictureUrl || profilePicture || imageUrl;
  const displayUrl = finalImageUrl ? getImageUrl(finalImageUrl) : null;

  // Debug logging (commented out to reduce console clutter)
  // if (finalImageUrl) {
  //   console.log('DoctorProfilePicture - Props:', {
  //     profilePictureUrl,
  //     profilePicture,
  //     imageUrl,
  //     finalImageUrl,
  //     displayUrl
  //   });
  // }

  // Get initials from name for placeholder
  const getInitials = (name: string) => {
    if (!name) return 'DR';
    const parts = name.split(' ').filter(part => part.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'DR';
  };

  // Show placeholder if no image URL or if image failed to load
  const shouldShowPlaceholder = !displayUrl || imageError || !displayUrl.startsWith('http');

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {!shouldShowPlaceholder ? (
        <Image 
          source={{ uri: displayUrl }} 
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
          onError={(error) => {
            // Silently handle image load errors and show placeholder
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <FontAwesome name="user-md" size={size * 0.4} color="#4CAF50" />
          {name && (
            <Text style={[styles.initials, { fontSize: size * 0.25 }]}>
              {getInitials(name)}
            </Text>
          )}
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
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  initials: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default DoctorProfilePicture; 