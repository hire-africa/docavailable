import React from 'react';

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
  const [isOnline, setIsOnline] = useState(true);
  const [lastPollTime, setLastPollTime] = useState(0);

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

  // Check connectivity before polling
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const isConnected = await apiService.checkConnectivity();
      setIsOnline(isConnected);
      return isConnected;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  };

  // Poll for typing indicators with reduced frequency and offline handling
  useEffect(() => {
    const pollTypingIndicators = async () => {
      const now = Date.now();
      
      // Skip polling if we're offline or if it's too soon since last poll
      if (!isOnline || (now - lastPollTime) < 5000) {
        return;
      }
      
      setLastPollTime(now);
      
      try {
        const response = await apiService.get(`/chat/${appointmentId}/typing`);
        
        if (response.success) {
          // Filter out current user from typing indicators
          const otherTypingUsers = response.data.filter((user: TypingUser) => user.user_id !== currentUserId);
          setTypingUsers(otherTypingUsers);
        }
      } catch (error) {
        console.error('Error polling typing indicators:', error);
        // Mark as offline on error
        setIsOnline(false);
      }
    };

    // Check connectivity first
    checkConnectivity().then(() => {
      // Poll every 10 seconds instead of 2 seconds to reduce API calls
      const interval = setInterval(async () => {
        const isConnected = await checkConnectivity();
        if (isConnected) {
          pollTypingIndicators();
        }
      }, 10000);
      
      // Initial poll
      pollTypingIndicators();

      return () => clearInterval(interval);
    });
  }, [appointmentId, currentUserId, isOnline]);

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