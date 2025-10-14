import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    View
} from 'react-native';
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

  useEffect(() => {
    if (visible) {
      // Vibrate on incoming call
      Vibration.vibrate([0, 1000, 500, 1000]);
      
      // Simple slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Simple slide out animation
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
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Simple Background */}
      <View style={styles.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incoming Call</Text>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {/* Profile Picture - Small and Simple */}
        <View style={styles.profileContainer}>
          {callerProfilePicture ? (
            <Image
              source={{ uri: callerProfilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.defaultProfilePicture}>
              <Ionicons name="person" size={24} color="white" />
            </View>
          )}
        </View>

        {/* Caller Information */}
        <View style={styles.callerInfo}>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callType}>Audio Call</Text>
        </View>
      </View>

      {/* Bottom Actions - Single Row */}
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
          <Ionicons name="call" size={20} color="white" />
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
          <Ionicons name="call" size={20} color="white" />
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
    marginBottom: 30,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultProfilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  callType: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
});
