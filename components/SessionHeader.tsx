import React, { useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SessionHeaderProps {
  isActive: boolean;
  elapsedSeconds: number;
  onEndSession: () => void;
  isDoctor?: boolean; // Hide end session button for doctors
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  isActive,
  elapsedSeconds,
  onEndSession,
  isDoctor = false,
}) => {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (isActive) {
      // Slide in from top
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to top
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, slideAnim]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: '#294936',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
      }}
    >
      {/* Timer Section */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#25D366',
          }}
        />
        <Text
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '500',
          }}
        >
          Session is active
        </Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: '400',
          }}
        >
          {formatTime(elapsedSeconds)}
        </Text>
      </View>

      {/* End Session Button - Only show for patients */}
      {!isDoctor && (
        <TouchableOpacity
          onPress={onEndSession}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            backgroundColor: '#F75555',
            borderRadius: 18,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default SessionHeader;
