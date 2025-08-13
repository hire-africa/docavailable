import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import InitialsAvatar from './InitialsAvatar';

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
    
      // Use the image serving route - will show placeholder if not accessible
  return `https://docavailable-1.onrender.com/api/images/${cleanUri}`;
  };

  // Determine which image to use (priority: profilePictureUrl > profilePicture > imageUrl)
  // If profilePictureUrl is provided, use it directly (it's already a full URL from backend)
  // Otherwise, try to generate URL from profilePicture or imageUrl
  const finalImageUrl = profilePictureUrl || profilePicture || imageUrl;
  const displayUrl = profilePictureUrl ? profilePictureUrl : (finalImageUrl ? getImageUrl(finalImageUrl) : null);

  // Debug logging for storage issue
  if (profilePictureUrl && !displayUrl) {
    console.log('DoctorProfilePicture - Storage not accessible:', {
      profilePictureUrl,
      displayUrl
    });
  }

  // Handle image loading errors
  const handleImageError = () => {
    console.log('DoctorProfilePicture - Image failed to load, showing placeholder');
  };

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

  // Show placeholder if no image URL, if image failed to load, or if we have a name (prefer initials avatar)
  const shouldShowPlaceholder = !displayUrl || imageError || !displayUrl.startsWith('http') || (name && !displayUrl);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {name ? (
        <InitialsAvatar name={name} size={size} style={style} />
      ) : displayUrl && !imageError ? (
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