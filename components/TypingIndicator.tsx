import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { apiService } from '../app/services/apiService';

interface TypingUser {
  user_id: number;
  user_name: string;
  started_at: string;
}

interface TypingIndicatorProps {
  appointmentId: number;
  currentUserId: number;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ appointmentId, currentUserId }) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [dotAnimation] = useState(new Animated.Value(0));

  // Animate the dots
  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => animateDots());
    };

    if (typingUsers.length > 0) {
      animateDots();
    }

    return () => {
      dotAnimation.stopAnimation();
    };
  }, [typingUsers.length]);

  // Poll for typing indicators
  useEffect(() => {
    const pollTypingIndicators = async () => {
      try {
        const response = await apiService.get(`/chat/${appointmentId}/typing`);
        
        if (response.success) {
          // Filter out current user from typing indicators
          const otherTypingUsers = response.data.filter((user: TypingUser) => user.user_id !== currentUserId);
          setTypingUsers(otherTypingUsers);
        }
      } catch (error) {
        console.error('Error polling typing indicators:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollTypingIndicators, 2000);
    pollTypingIndicators(); // Initial poll

    return () => clearInterval(interval);
  }, [appointmentId, currentUserId]);

  if (typingUsers.length === 0) {
    return null;
  }

  const typingUserNames = typingUsers.map(user => user.user_name).join(', ');

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderTopWidth: 1,
      borderTopColor: '#E5E5E5',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        maxWidth: '80%',
      }}>
        <Ionicons name="ellipse" size={8} color="#666" />
        <Text style={{
          fontSize: 14,
          color: '#666',
          marginLeft: 8,
          fontStyle: 'italic',
        }}>
          {typingUserNames} {typingUsers.length === 1 ? 'is' : 'are'} typing
        </Text>
        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
          <Animated.View style={{
            opacity: dotAnimation,
            marginLeft: 2,
          }}>
            <Text style={{ fontSize: 16, color: '#666' }}>.</Text>
          </Animated.View>
          <Animated.View style={{
            opacity: dotAnimation,
            marginLeft: 2,
          }}>
            <Text style={{ fontSize: 16, color: '#666' }}>.</Text>
          </Animated.View>
          <Animated.View style={{
            opacity: dotAnimation,
            marginLeft: 2,
          }}>
            <Text style={{ fontSize: 16, color: '#666' }}>.</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default TypingIndicator; 