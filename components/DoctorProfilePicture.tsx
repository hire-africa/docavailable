import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface DoctorProfilePictureProps {
  imageUrl?: string;
  size?: number;
  name?: string;
}

const DoctorProfilePicture: React.FC<DoctorProfilePictureProps> = ({ 
  imageUrl, 
  size = 60, 
  name 
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
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