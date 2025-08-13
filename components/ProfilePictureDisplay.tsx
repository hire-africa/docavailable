import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import InitialsAvatar from './InitialsAvatar';

interface ProfilePictureDisplayProps {
    imageUri?: string | null;
    size?: number;
    borderColor?: string;
    profilePictureUrl?: string | null;
    name?: string;
}

const ProfilePictureDisplay: React.FC<ProfilePictureDisplayProps> = ({
    imageUri,
    size = 120,
    borderColor = '#4CAF50',
    profilePictureUrl,
    name,
}) => {
    const [imageError, setImageError] = useState(false);

    const styles = StyleSheet.create({
        container: {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#E8F5E9',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: borderColor,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
        },
        image: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
    });

    const getImageUrl = (uri: string) => {
        if (uri.startsWith('http')) {
            return uri;
        }
        // Use the image serving route - will show placeholder if not accessible
        return `https://docavailable-1.onrender.com/api/images/${uri}`;
    };

    // Use profilePictureUrl if available (it's already a full URL from backend)
    // Otherwise fall back to imageUri and generate URL
    const finalImageUri = profilePictureUrl || imageUri;
    
    // If profilePictureUrl is provided, use it directly, otherwise generate URL
    const displayUrl = profilePictureUrl ? profilePictureUrl : (finalImageUri ? getImageUrl(finalImageUri) : null);

    // Show placeholder if no image URI or if image failed to load
    const shouldShowPlaceholder = !displayUrl || imageError;

    // Debug logging for storage issue
    if (profilePictureUrl && !displayUrl) {
      console.log('ProfilePictureDisplay - Storage not accessible:', {
        profilePictureUrl,
        displayUrl
      });
    }

    return (
        <View style={styles.container}>
            {!shouldShowPlaceholder ? (
                <Image
                    source={{ uri: displayUrl }}
                    style={styles.image}
                    onError={(error) => {
                        console.error('ProfilePictureDisplay - Image load error:', error);
                        setImageError(true);
                    }}
                    onLoad={() => {
                        setImageError(false);
                    }}
                />
            ) : name ? (
                <InitialsAvatar name={name} size={size} />
            ) : (
                <FontAwesome name="user" size={size / 2.5} color={borderColor} />
            )}
        </View>
    );
};

export default ProfilePictureDisplay; 