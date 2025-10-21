import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAnonymizedDisplay } from '../hooks/useAnonymousMode';

interface AnonymizedUserDisplayProps {
  user: any;
  isAnonymousModeEnabled: boolean;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showProfilePicture?: boolean;
  style?: any;
  nameStyle?: any;
}

const AnonymizedUserDisplay: React.FC<AnonymizedUserDisplayProps> = ({
  user,
  isAnonymousModeEnabled,
  size = 'medium',
  showName = true,
  showProfilePicture = true,
  style,
  nameStyle,
}) => {
  const anonymizedData = useAnonymizedDisplay(user, isAnonymousModeEnabled);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          containerSize: 32,
          iconSize: 16,
          fontSize: 12,
        };
      case 'large':
        return {
          containerSize: 80,
          iconSize: 32,
          fontSize: 18,
        };
      default: // medium
        return {
          containerSize: 48,
          iconSize: 24,
          fontSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, style]}>
      {showProfilePicture && (
        <View style={[
          styles.profilePictureContainer,
          {
            width: sizeStyles.containerSize,
            height: sizeStyles.containerSize,
            borderRadius: sizeStyles.containerSize / 2,
          }
        ]}>
          {anonymizedData.profilePictureUrl ? (
            <Image
              source={{ uri: anonymizedData.profilePictureUrl }}
              style={[
                styles.profilePicture,
                {
                  width: sizeStyles.containerSize,
                  height: sizeStyles.containerSize,
                  borderRadius: sizeStyles.containerSize / 2,
                }
              ]}
            />
          ) : (
            <View style={[
              styles.defaultProfilePicture,
              {
                width: sizeStyles.containerSize,
                height: sizeStyles.containerSize,
                borderRadius: sizeStyles.containerSize / 2,
              }
            ]}>
              <Ionicons
                name={anonymizedData.isAnonymous ? "person" : "person"}
                size={sizeStyles.iconSize}
                color={anonymizedData.isAnonymous ? "#4CAF50" : "#666"}
              />
            </View>
          )}
        </View>
      )}
      
      {showName && (
        <Text style={[
          styles.displayName,
          {
            fontSize: sizeStyles.fontSize,
          },
          nameStyle
        ]} numberOfLines={1}>
          {anonymizedData.displayName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  profilePictureContainer: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  profilePicture: {
    backgroundColor: '#F0F0F0',
  },
  defaultProfilePicture: {
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
});

export default AnonymizedUserDisplay;
