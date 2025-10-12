import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface ProfilePicturePickerProps {
    imageUri: string | null;
    onImageSelected: (uri: string) => void;
    size?: number;
    showEditButton?: boolean;
}

const ProfilePicturePicker: React.FC<ProfilePicturePickerProps> = ({
    imageUri,
    onImageSelected,
    size = 120,
    showEditButton = true,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    
    // Debug logging
    console.log('ProfilePicturePicker: Received imageUri:', imageUri);

    const pickImage = async () => {
        try {
            setIsUploading(true);

            // Request permissions
            if (!isWeb) {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    alert('Sorry, we need camera roll permissions to make this work!');
                    setIsUploading(false);
                    return;
                }
            }

            

            // Launch image picker with compression to keep file size under 2MB
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.9, // Increase from 0.7 to 0.9 (90% quality)
                base64: false,
            });

            if (!result.canceled && result.assets[0]) {
                // console.log('ProfilePicturePicker: Image selected:', {
                //   uri: result.assets[0].uri,
                //   width: result.assets[0].width,
                //   height: result.assets[0].height,
                //   fileSize: result.assets[0].fileSize
                // });
                
                // Remove the aggressive re-compression for large files
                if (result.assets[0].fileSize && result.assets[0].fileSize > 1500000) { // 1.5MB
                    // Don't re-compress, just use the image as is
                    onImageSelected(result.assets[0].uri);
                } else {
                    onImageSelected(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Error picking image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={pickImage}
                style={[
                    styles.imageContainer,
                    { width: size, height: size, borderRadius: size / 2 }
                ]}
            >
                {isUploading ? (
                    <ActivityIndicator size="large" color="#4CAF50" />
                ) : imageUri ? (
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: imageUri }}
                            style={[
                                styles.image,
                                { width: size, height: size, borderRadius: size / 2 }
                            ]}
                        />
                        {showEditButton && (
                            <View style={styles.editButton}>
                                <FontAwesome name="pencil" size={16} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.placeholderContainer, { backgroundColor: '#E8F5E9' }]}>
                        <FontAwesome name="user" size={size / 3} color="#4CAF50" />
                        {showEditButton && (
                            <View style={styles.addButton}>
                                <FontAwesome name="plus" size={16} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
            <Text style={styles.helperText}>
                {imageUri ? 'Tap to change photo' : 'Tap to add photo'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 20,
    },
    imageContainer: {
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    editButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: '#4CAF50',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    addButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: '#4CAF50',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    helperText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
    },
});

export default ProfilePicturePicker; 