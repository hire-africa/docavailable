import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InitialsAvatarProps {
  name: string;
  size: number;
  style?: any;
}

const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, size, style }) => {
  // Generate initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName || typeof fullName !== 'string') {
      return '?';
    }
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on name
  const getColorFromName = (fullName: string): string => {
    if (!fullName || typeof fullName !== 'string') {
      return '#34A853'; // Default green
    }
    
    const colors = [
      '#34A853', // Green
      '#4285F4', // Blue
      '#EA4335', // Red
      '#FBBC04', // Yellow
      '#FF6D01', // Orange
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#FF5722', // Deep Orange
      '#4CAF50', // Light Green
      '#2196F3', // Light Blue
      '#F44336', // Light Red
      '#FF9800', // Light Orange
      '#673AB7', // Deep Purple
      '#009688', // Teal
      '#795548', // Brown
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);
  const fontSize = Math.max(size * 0.4, 12); // Responsive font size

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize,
            lineHeight: size,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default InitialsAvatar;
