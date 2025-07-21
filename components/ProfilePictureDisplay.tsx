import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

interface ProfilePictureDisplayProps {
    imageUri: string | null;
    size?: number;
    borderColor?: string;
    profilePictureUrl?: string | null; // Add support for the new URL field
}

const ProfilePictureDisplay: React.FC<ProfilePictureDisplayProps> = ({
    imageUri,
    size = 120,
    borderColor = '#4CAF50',
    profilePictureUrl,
}) => {
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
        // Debug logging
        console.log('ProfilePictureDisplay - Original URI:', uri);
        
        // If it's already a full URL, return as is
        if (uri.startsWith('http')) {
            console.log('ProfilePictureDisplay - Using full URL:', uri);
            return uri;
        }
        
        // If it's a local storage path, construct the full URL
        // Use your backend URL here
        const baseUrl = Platform.select({
            web: 'http://172.20.10.11:8000',
            default: 'http://172.20.10.11:8000'
        });
        
        // Remove any leading slash from the URI to avoid double slashes
        const cleanUri = uri.startsWith('/') ? uri.substring(1) : uri;
        const fullUrl = `${baseUrl}/storage/${cleanUri}`;
        
        console.log('ProfilePictureDisplay - Constructed URL:', fullUrl);
        return fullUrl;
    };

    // Use profilePictureUrl if available, otherwise fall back to imageUri
    const finalImageUri = profilePictureUrl || imageUri;

    return (
        <View style={styles.container}>
            {finalImageUri ? (
                <Image
                    source={{ uri: getImageUrl(finalImageUri) }}
                    style={styles.image}
                />
            ) : (
                <FontAwesome name="user" size={size / 2.5} color={borderColor} />
            )}
        </View>
    );
};

export default ProfilePictureDisplay; 