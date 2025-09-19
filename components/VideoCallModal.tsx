import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { VideoCallEvents, VideoCallService, VideoCallState } from '../services/videoCallService';

interface VideoCallModalProps {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorName: string;
  patientName: string;
  otherParticipantProfilePictureUrl?: string;
  onEndCall: () => void;
  onCallTimeout?: () => void;
  onCallRejected?: () => void;
  onCallAnswered?: () => void;
  isIncomingCall?: boolean;
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function VideoCallModal({
  appointmentId,
  userId,
  isDoctor,
  doctorName,
  patientName,
  otherParticipantProfilePictureUrl,
  onEndCall,
  onCallTimeout,
  onCallRejected,
  onCallAnswered,
  isIncomingCall = false,
  onAcceptCall,
  onRejectCall,
}: VideoCallModalProps) {
  const [callState, setCallState] = useState<VideoCallState>({
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isFrontCamera: true,
    callDuration: 0,
    connectionState: isIncomingCall ? 'connecting' : 'disconnected',
  });
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!isIncomingCall);
  const [isRinging, setIsRinging] = useState(isIncomingCall);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  
  const videoCallService = useRef<VideoCallService | null>(null);
  
  // For incoming calls, show incoming UI until accepted, then show connected UI
  const shouldShowIncomingUI = isIncomingCall && isRinging && !callAccepted;

  useEffect(() => {
    const setupCall = async () => {
      console.log('🎯 VideoCallModal useEffect triggered:', {
        isIncomingCall,
        appointmentId,
        userId,
        isDoctor
      });
      
      if (!isIncomingCall) {
        console.log('🚀 VideoCallModal: Initializing call (outgoing)');
        await initializeVideoCall();
      } else {
        console.log('📞 VideoCallModal: Initializing for incoming call');
        await initializeIncomingCall();
      }
    };
    
    setupCall();
    return () => {
      console.log('🧹 VideoCallModal cleanup - ending call');
      if (videoCallService.current) {
        videoCallService.current.reset();
      }
    };
  }, [isIncomingCall]);

  useEffect(() => {
    if (callState.connectionState === 'connected') {
      setIsInitializing(false);
      setIsRinging(false);
    } else if (callState.connectionState === 'connecting') {
      setIsRinging(true);
    }
  }, [callState.connectionState]);

  const initializeIncomingCall = async () => {
    try {
      console.log('📞 VideoCallModal: Initializing for incoming call');
      
      const events: VideoCallEvents = {
        onStateChange: (state) => {
          console.log('📊 Video call state changed:', state);
          setCallState(state);
          
          // Update ringing state based on connection state
          if (state.connectionState === 'connected') {
            setIsRinging(false);
            setIsProcessingAnswer(false);
            setCallAccepted(true); // Mark call as accepted when connected
          }
        },
        onRemoteStream: (stream) => {
          console.log('📹 Remote video stream received');
          setRemoteStream(stream);
        },
        onCallEnded: () => {
          console.log('📞 Video call ended');
          onEndCall();
        },
        onCallRejected: () => {
          console.log('❌ Video call rejected');
          onCallRejected?.();
        },
        onCallTimeout: () => {
          console.log('⏰ Video call timeout');
          onCallTimeout?.();
        },
      };

      // Initialize the VideoCallService for incoming call
      await VideoCallService.getInstance().initializeForIncomingCall(appointmentId, userId, events);
      videoCallService.current = VideoCallService.getInstance();
      console.log('✅ VideoCallModal: Incoming call initialized successfully');
      
    } catch (error) {
      console.error('❌ VideoCallModal: Failed to initialize incoming call:', error);
      onEndCall();
    }
  };

  const initializeVideoCall = async () => {
    try {
      // Reset the service state before initializing
      await VideoCallService.getInstance().reset();

      const events: VideoCallEvents = {
        onStateChange: (state) => {
          setCallState(state);
        },
        onRemoteStream: (stream) => {
          console.log('📹 Remote video stream received');
          setRemoteStream(stream);
        },
        onCallEnded: () => {
          onEndCall();
        },
        onCallRejected: () => {
          console.log('❌ Video call rejected');
          onCallRejected?.();
        },
        onCallTimeout: () => {
          console.log('⏰ Video call timeout');
          onCallTimeout?.();
        },
      };

      await VideoCallService.getInstance().initialize(appointmentId, userId, events);
      videoCallService.current = VideoCallService.getInstance();
      
      // Get local stream for display
      const localStream = videoCallService.current.getLocalStream();
      setLocalStream(localStream);
      setIsInitialized(true);
      
      console.log('📞 Video call initialization completed - offer will be created automatically if needed');
      
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      Alert.alert('Call Failed', 'Unable to start video call. Please try again.', [
        { text: 'OK', onPress: onEndCall }
      ]);
    }
  };

  const handleAcceptCall = async () => {
    try {
      if (isProcessingAnswer) return; // Prevent multiple taps
      Vibration.vibrate(50);
      console.log('📞 Accept button pressed - answering video call');
      
      // Immediately update UI state
      setIsRinging(false);
      setIsProcessingAnswer(true);
      setCallAccepted(true); // Mark call as accepted
      
      if (videoCallService.current) {
        await videoCallService.current.processIncomingCall();
      }
      
      // Get local stream for display after accepting
      const localStream = videoCallService.current?.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }
      
      // Just trigger the callback - let the parent handle the logic
      onCallAnswered?.();
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call. Please try again.');
    }
  };

  const handleRejectCall = () => {
    Vibration.vibrate(50);
    if (videoCallService.current) {
      videoCallService.current.endCall();
    }
    onRejectCall?.();
  };

  const toggleAudio = () => {
    if (videoCallService.current) {
      videoCallService.current.toggleAudio();
      Vibration.vibrate(50);
    }
  };

  const toggleVideo = () => {
    if (videoCallService.current) {
      videoCallService.current.toggleVideo();
      Vibration.vibrate(50);
    }
  };

  const switchCamera = async () => {
    if (videoCallService.current) {
      await videoCallService.current.switchCamera();
      Vibration.vibrate(50);
    }
  };

  const toggleSpeaker = () => {
    Vibration.vibrate(50);
    setIsSpeakerOn(prev => !prev);
    
    // Toggle speaker mode in VideoCallService (if implemented)
    if (videoCallService.current) {
      // Note: Speaker toggle would need to be implemented in VideoCallService
      // For now, just update the UI state
    }
  };

  const endCall = async () => {
    // Haptic feedback for end call
    Vibration.vibrate([0, 100, 50, 100]);
    
    Alert.alert(
      'End Call',
      'Are you sure you want to end this video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: async () => {
            if (videoCallService.current) {
              await videoCallService.current.endCall();
            }
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
    if (shouldShowIncomingUI) return 'Incoming Video Call';
    if (isProcessingAnswer) return 'Answering...';
    
    switch (callState.connectionState) {
      case 'connecting':
        return isIncomingCall ? 'Connecting...' : 'Calling...';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Call Ended';
      case 'failed':
        return 'Connection Failed';
      default:
        return isIncomingCall ? 'Initializing...' : 'Starting call...';
    }
  };

  const getStatusColor = () => {
    switch (callState.connectionState) {
      case 'connecting':
        return isRinging ? '#FF6B6B' : '#FF9800';
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Remote Video (Full Screen Background) */}
      {remoteStream && (
        <RTCView
          style={styles.remoteVideo}
          streamURL={remoteStream.toURL()}
          objectFit="cover"
        />
      )}
      
      {/* Local Video (Picture-in-Picture) */}
      {localStream && (
        <RTCView
          style={styles.localVideo}
          streamURL={localStream.toURL()}
          objectFit="cover"
          mirror={callState.isFrontCamera}
        />
      )}
      
      {/* Dynamic Header based on call state */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onEndCall}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {shouldShowIncomingUI ? 'Incoming Video Call' : 'Video Call'}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Main Content - Simple Layout */}
      <View style={styles.content}>
        {/* Profile Picture - Small and Simple */}
        <View style={styles.profileContainer}>
          {otherParticipantProfilePictureUrl ? (
            <Image
              source={{ uri: otherParticipantProfilePictureUrl }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.defaultProfilePicture}>
              <Ionicons 
                name={isDoctor ? "medical" : "person"} 
                size={24} 
                color="white" 
              />
            </View>
          )}
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

        {/* Status */}
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
      </View>

      {/* Dynamic Controls based on call state */}
      {shouldShowIncomingUI || isProcessingAnswer ? (
        /* Incoming Call Controls - Accept/Decline */
        <View style={styles.controls}>
          {/* Decline Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.declineButton]}
            onPress={handleRejectCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={[
              styles.controlButton, 
              styles.acceptButton,
              isProcessingAnswer && styles.disabledButton
            ]}
            onPress={handleAcceptCall}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={20} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        /* Connected Call Controls - Speaker/Mute/Video/Camera/End */
        <View style={styles.controls}>
          {/* Speaker Button */}
          <TouchableOpacity 
            style={[
              styles.controlButton,
              isSpeakerOn && styles.activeButton
            ]}
            onPress={toggleSpeaker}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isSpeakerOn ? "volume-high" : "volume-medium"} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>

          {/* Mute/Unmute Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !callState.isAudioEnabled && styles.disabledButton
            ]}
            onPress={toggleAudio}
            disabled={!callState.isConnected}
          >
            <Ionicons
              name={callState.isAudioEnabled ? "mic" : "mic-off"}
              size={20}
              color="white"
            />
          </TouchableOpacity>

          {/* Video Toggle Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !callState.isVideoEnabled && styles.disabledButton
            ]}
            onPress={toggleVideo}
            disabled={!callState.isConnected}
          >
            <Ionicons
              name={callState.isVideoEnabled ? "videocam" : "videocam-off"}
              size={20}
              color="white"
            />
          </TouchableOpacity>

          {/* Camera Switch Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
            disabled={!callState.isConnected}
          >
            <Ionicons name="camera-reverse" size={20} color="white" />
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
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
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  endCallButton: {
    backgroundColor: '#F44336',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
  localVideo: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
});
