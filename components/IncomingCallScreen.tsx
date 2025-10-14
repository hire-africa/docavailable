import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
    BlurView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Vibrate on incoming call
      Vibration.vibrate([0, 1000, 500, 1000]);
      
      // Enhanced animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulsing animation
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
    } else {
      // Enhanced slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" />
      
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Header with Status */}
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Incoming Call</Text>
        </View>
      </View>
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Profile Picture with Pulse Animation */}
        <Animated.View 
          style={[
            styles.profileContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.profileRing}>
            {callerProfilePicture ? (
              <Image
                source={{ uri: callerProfilePicture }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Ionicons name="person" size={32} color="#4CAF50" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Caller Information */}
        <Animated.View 
          style={[
            styles.callerInfo,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callType}>Audio Call</Text>
          <View style={styles.callStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Ringing...</Text>
          </View>
        </Animated.View>
      </View>

      {/* Modern Action Buttons */}
      <View style={styles.controls}>
        {/* Decline Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => {
            Vibration.vibrate([0, 100, 50, 100]);
            onDecline();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => {
            Vibration.vibrate(50);
            onAccept();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>
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
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  profileContainer: {
    marginBottom: 40,
  },
  profileRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultProfilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 50,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  callType: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 12,
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backdropFilter: 'blur(10px)',
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingBottom: 60,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: '#F44336',
    transform: [{ rotate: '135deg' }],
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
});
