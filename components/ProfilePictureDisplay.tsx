import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface ProfilePictureDisplayProps {
    imageUri?: string | null;
    size?: number;
    borderColor?: string;
    profilePictureUrl?: string | null;
}

const ProfilePictureDisplay: React.FC<ProfilePictureDisplayProps> = ({
    imageUri,
    size = 120,
    borderColor = '#4CAF50',
    profilePictureUrl,
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
        // Use the new image serving route instead of direct storage access
        return `https://docavailable-1.onrender.com/api/images/${uri}`;
    };

    // Use profilePictureUrl if available, otherwise fall back to imageUri
    const finalImageUri = profilePictureUrl || imageUri;
    
    // Show placeholder if no image URI or if image failed to load
    const shouldShowPlaceholder = !finalImageUri || imageError;

    // console.log('ProfilePictureDisplay - Props:', {
    //   profilePictureUrl,
    //   imageUri,
    //   size,
    //   finalImageUri,
    //   shouldShowPlaceholder
    // });

    return (
        <View style={styles.container}>
            {!shouldShowPlaceholder ? (
                <Image
                    source={{ uri: getImageUrl(finalImageUri) }}
                    style={styles.image}
                    onError={(error) => {
                        console.error('ProfilePictureDisplay - Image load error:', error);
                        setImageError(true);
                    }}
                    onLoad={() => {
                        // console.log('ProfilePictureDisplay - Image loaded successfully:', finalImageUri);
                        setImageError(false);
                    }}
                />
            ) : (
                <FontAwesome name="user" size={size / 2.5} color={borderColor} />
            )}
        </View>
    );
};

export default ProfilePictureDisplay; 