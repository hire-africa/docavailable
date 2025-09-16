import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';

interface IncomingCallScreenProps {
  callerName: string;
  callerProfilePicture?: string;
  onAccept: () => void;
  onDecline: () => void;
  visible: boolean;
}

const { width, height } = Dimensions.get('window');

export default function IncomingCallScreen({
  callerName,
  callerProfilePicture,
  onAccept,
  onDecline,
  visible,
}: IncomingCallScreenProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Vibrate on incoming call
      Vibration.vibrate([0, 1000, 500, 1000]);
      
      // Slide in animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for profile picture
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Rotate animation for call icon
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
      };
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Background gradient */}
      <View style={styles.background} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Profile Picture */}
        <Animated.View
          style={[
            styles.profileContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {callerProfilePicture ? (
            <Image
              source={{ uri: callerProfilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.defaultProfilePicture}>
              <Ionicons name="person" size={60} color="#fff" />
            </View>
          )}
        </Animated.View>

        {/* Caller Name */}
        <Text style={styles.callerName}>{callerName}</Text>
        
        {/* Call Type */}
        <Text style={styles.callType}>Audio Call</Text>

        {/* Animated call icon */}
        <Animated.View
          style={[
            styles.callIconContainer,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        >
          <Ionicons name="call" size={40} color="#fff" />
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Decline Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={onDecline}
          >
            <Ionicons name="call" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={onAccept}
          >
            <Ionicons name="call" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  profileContainer: {
    marginBottom: 30,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#fff',
  },
  defaultProfilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  callType: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
  },
  callIconContainer: {
    marginBottom: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#ff4444',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
});
