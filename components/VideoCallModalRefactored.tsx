import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useCallSetup } from '../hooks/useCallSetup';

const { width, height } = Dimensions.get('window');

interface VideoCallModalProps {
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
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
}

export default function VideoCallModal({
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
  isIncomingCall = false,
  onAcceptCall,
  onRejectCall,
}: VideoCallModalProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // Use the unified call setup hook
  const {
    callState,
    isInitializing: hookIsInitializing,
    isRinging: hookIsRinging,
    localStream,
    endCall
  } = useCallSetup({
    appointmentId,
    userId,
    isDoctor,
    callType: 'video',
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

  const handleVideoToggle = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // TODO: Implement actual video toggle functionality
  };

  const handleCameraFlip = () => {
    setIsFrontCamera(!isFrontCamera);
    // TODO: Implement actual camera flip functionality
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // TODO: Implement actual speaker functionality
  };

  const handleAcceptCall = () => {
    setCallAccepted(true);
    onAcceptCall?.();
    onCallAnswered?.();
  };

  const handleRejectCall = () => {
    onRejectCall?.();
    onCallRejected?.();
    onEndCall();
  };

  // Render loading state
  if (isInitializing) {
    return (
      <Modal visible={true} animationType="fade">
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingIcon, { opacity: pulseAnim }]}>
              <Ionicons name="videocam" size={60} color="#4CAF50" />
            </Animated.View>
            <Text style={styles.loadingText}>Connecting...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Render incoming call UI
  if (isIncomingCall && !callAccepted) {
    return (
      <Modal visible={true} animationType="fade">
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
              <Text style={styles.callStatus}>Incoming Video Call</Text>
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
                <Ionicons name="videocam" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Render active call UI
  return (
    <Modal visible={true} animationType="fade">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Remote video stream */}
        <View style={styles.remoteVideoContainer}>
          <Text style={styles.remoteVideoPlaceholder}>
            Remote Video Stream
          </Text>
        </View>
        
        {/* Local video stream */}
        {localStream && (
          <View style={styles.localVideoContainer}>
            <Text style={styles.localVideoPlaceholder}>
              Local Video Stream
            </Text>
          </View>
        )}
        
        {/* Call info overlay */}
        <View style={styles.callInfoOverlay}>
          <Text style={styles.callerName}>{doctorName}</Text>
          <Text style={styles.callStatus}>
            {callState.connectionState === 'connected' ? 'Connected' : 'Connecting...'}
          </Text>
          <Text style={styles.callDuration}>
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        
        {/* Control buttons */}
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.activeButton]}
            onPress={handleMuteToggle}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isVideoEnabled && styles.activeButton]}
            onPress={handleVideoToggle}
          >
            <Ionicons name={isVideoEnabled ? "videocam" : "videocam-off"} size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isFrontCamera && styles.activeButton]}
            onPress={handleCameraFlip}
          >
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.activeButton]}
            onPress={handleSpeakerToggle}
          >
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-low"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
    color: '#fff',
    fontSize: 18,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#666',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoPlaceholder: {
    color: '#fff',
    fontSize: 12,
  },
  callInfoOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 160,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 40,
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
