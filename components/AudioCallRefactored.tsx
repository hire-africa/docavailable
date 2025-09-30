import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useCallSetup } from '../hooks/useCallSetup';

const { width, height } = Dimensions.get('window');

interface AudioCallProps {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorName?: string;
  patientName?: string;
  otherParticipantProfilePictureUrl?: string;
  onEndCall: () => void;
  onCallTimeout?: () => void;
  onCallRejected?: () => void;
  onCallAnswered?: () => void;
  isIncomingCall?: boolean;
}

export default function AudioCall({ 
  appointmentId, 
  userId, 
  isDoctor, 
  doctorName = 'Doctor',
  patientName = 'Patient',
  otherParticipantProfilePictureUrl,
  onEndCall,
  onCallTimeout,
  onCallRejected,
  onCallAnswered,
  isIncomingCall = false
}: AudioCallProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const connectingAnim = useRef(new Animated.Value(0)).current;

  // Use the unified call setup hook
  const {
    callState,
    isInitializing: hookIsInitializing,
    isRinging: hookIsRinging,
    endCall
  } = useCallSetup({
    appointmentId,
    userId,
    isDoctor,
    callType: 'audio',
    isIncomingCall,
    events: {
      onCallAnswered: () => {
        setCallAccepted(true);
        onCallAnswered?.();
      },
      onCallEnded: onEndCall,
      onCallTimeout: onCallTimeout,
      onCallRejected: onCallRejected,
      onStateChange: (state) => {
        setIsInitializing(state.connectionState === 'connecting');
        setIsRinging(state.connectionState === 'connecting');
      }
    }
  });

  // Handle call actions
  const handleEndCall = () => {
    endCall();
    onEndCall();
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // TODO: Implement actual speaker functionality
  };

  const handleAcceptCall = () => {
    setCallAccepted(true);
    onCallAnswered?.();
  };

  const handleRejectCall = () => {
    onCallRejected?.();
    onEndCall();
  };

  // Render loading state
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingIcon, { opacity: pulseAnim }]}>
            <Ionicons name="call" size={60} color="#4CAF50" />
          </Animated.View>
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </View>
    );
  }

  // Render incoming call UI
  if (isIncomingCall && !callAccepted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.incomingCallContainer}>
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: otherParticipantProfilePictureUrl }}
              style={styles.profileImage}
              defaultSource={require('../assets/images/profile.jpg')}
            />
            <Text style={styles.callerName}>{doctorName}</Text>
            <Text style={styles.callStatus}>Incoming Audio Call</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectCall}
            >
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptCall}
            >
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render active call UI
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.callContainer}>
        <View style={styles.profileContainer}>
          <Image
            source={{ uri: otherParticipantProfilePictureUrl }}
            style={styles.profileImage}
            defaultSource={require('../assets/images/profile.jpg')}
          />
          <Text style={styles.callerName}>{doctorName}</Text>
          <Text style={styles.callStatus}>
            {callState.connectionState === 'connected' ? 'Connected' : 'Connecting...'}
          </Text>
          <Text style={styles.callDuration}>
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.activeButton]}
            onPress={handleMuteToggle}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.activeButton]}
            onPress={handleSpeakerToggle}
          >
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-low"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  profileContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callStatus: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 4,
  },
  callDuration: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
  },
  actionButtons: {
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
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  endCallButton: {
    backgroundColor: '#f44336',
  },
});
