import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AudioCallService, { AudioCallEvents, AudioCallState } from '../services/audioCallService';

const { width, height } = Dimensions.get('window');

interface AudioCallProps {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorName?: string;
  patientName?: string;
  onEndCall: () => void;
}

export default function AudioCall({ 
  appointmentId, 
  userId, 
  isDoctor, 
  doctorName = 'Doctor',
  patientName = 'Patient',
  onEndCall 
}: AudioCallProps) {
  const [callState, setCallState] = useState<AudioCallState>({
    isConnected: false,
    isAudioEnabled: true,
    callDuration: 0,
    connectionState: 'disconnected',
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeCall();
    startPulseAnimation();
    return () => {
      AudioCallService.endCall();
    };
  }, []);

  useEffect(() => {
    if (callState.connectionState === 'connected') {
      setIsInitializing(false);
    }
  }, [callState.connectionState]);

  const initializeCall = async () => {
    try {
      const events: AudioCallEvents = {
        onStateChange: (state) => {
          setCallState(state);
        },
        onRemoteStream: (stream) => {
          console.log('🎵 Remote audio stream received');
        },
        onCallEnded: () => {
          onEndCall();
        },
        onError: (error) => {
          Alert.alert('Call Error', error, [
            { text: 'OK', onPress: onEndCall }
          ]);
        },
      };

      await AudioCallService.initialize(appointmentId, userId, events);
      
      // If doctor, create offer immediately
      if (isDoctor) {
        await AudioCallService.createOffer();
      }
      
    } catch (error) {
      console.error('Failed to initialize audio call:', error);
      Alert.alert('Call Failed', 'Unable to start audio call. Please try again.', [
        { text: 'OK', onPress: onEndCall }
      ]);
    }
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(pulse);
    };
    pulse();
  };

  const toggleAudio = () => {
    const isEnabled = AudioCallService.toggleAudio();
    // Visual feedback
    if (isEnabled) {
      // Haptic feedback could be added here
    }
  };

  const endCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: async () => {
            await AudioCallService.endCall();
            onEndCall();
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState.connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Call Ended';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Initializing...';
    }
  };

  const getStatusColor = () => {
    switch (callState.connectionState) {
      case 'connecting':
        return '#FF9800';
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#9E9E9E';
      case 'failed':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" />
      
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Main Call Interface */}
      <View style={styles.callInterface}>
        {/* Avatar Container */}
        <View style={styles.avatarContainer}>
          <Animated.View 
            style={[
              styles.avatar,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.avatarInner}>
              <FontAwesome 
                name={isDoctor ? "user-md" : "user"} 
                size={60} 
                color="#4CAF50" 
              />
            </View>
          </Animated.View>
          
          {/* Connection Status Indicator */}
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {isDoctor ? patientName : doctorName}
          </Text>
          <Text style={styles.userRole}>
            {isDoctor ? 'Patient' : 'Doctor'}
          </Text>
        </View>

        {/* Call Status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {callState.isConnected && (
            <Text style={styles.durationText}>
              {formatDuration(callState.callDuration)}
            </Text>
          )}
        </View>

        {/* Loading Animation for Initialization */}
        {isInitializing && (
          <Animated.View 
            style={[styles.loadingContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </Animated.View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {/* Mute/Unmute Button */}
          <TouchableOpacity 
            style={[
              styles.controlButton, 
              !callState.isAudioEnabled && styles.disabledButton
            ]}
            onPress={toggleAudio}
            disabled={!callState.isConnected}
          >
            <FontAwesome 
              name={callState.isAudioEnabled ? "microphone" : "microphone-slash"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity 
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <FontAwesome name="phone" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Call Quality Indicator */}
        {callState.isConnected && (
          <View style={styles.qualityIndicator}>
            <View style={styles.qualityBar} />
            <View style={styles.qualityBar} />
            <View style={styles.qualityBar} />
            <View style={styles.qualityBar} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2d2d2d',
  },
  callInterface: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  durationText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  loadingContainer: {
    marginBottom: 30,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBar: {
    width: 4,
    height: 20,
    backgroundColor: '#4CAF50',
    marginHorizontal: 2,
    borderRadius: 2,
  },
});
