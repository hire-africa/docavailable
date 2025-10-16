import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
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
import { AudioCallEvents, AudioCallService, AudioCallState } from '../services/audioCallService';
const { width, height } = Dimensions.get('window');

interface AudioCallProps {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorId?: string | number;
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
  doctorId,
  doctorName = 'Doctor',
  patientName = 'Patient',
  otherParticipantProfilePictureUrl,
  onEndCall,
  onCallTimeout,
  onCallRejected,
  onCallAnswered,
  isIncomingCall = false
}: AudioCallProps) {
  const [callState, setCallState] = useState<AudioCallState>({
    isConnected: false,
    isAudioEnabled: true,
    callDuration: 0,
    connectionState: isIncomingCall ? 'connecting' : 'disconnected',
  });
  
  const [isInitializing, setIsInitializing] = useState(!isIncomingCall);
  const [isRinging, setIsRinging] = useState(isIncomingCall);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false); // Track if we're processing the answer
  const [isSpeakerOn, setIsSpeakerOn] = useState(false); // Track speaker state
  const [callAccepted, setCallAccepted] = useState(false); // Track if in-call UI should replace incoming UI

  // Freeze UI to connected once we detect a connected state to avoid regressions
  const freezeConnectedRef = useRef(false);
  
  // For outgoing calls, we should never show incoming call UI
  const shouldShowIncomingUI = isIncomingCall && isRinging && !callAccepted;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const connectingAnim = useRef(new Animated.Value(0)).current;

  const initOnceRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Initialize call when component mounts
  useEffect(() => {
    const setupCall = async () => {
      console.log('🎯 AudioCall useEffect triggered:', {
        isIncomingCall,
        appointmentId,
        userId,
        isDoctor,
        hasInitialized: hasInitializedRef.current
      });

      // Prevent multiple initializations
      if (hasInitializedRef.current) {
        console.log('⚠️ [AudioCall] Already initialized - skipping');
        return;
      }

      // Check for active calls globally
      const g: any = global as any;
      if (g.activeAudioCall && !isIncomingCall) {
        console.warn('⚠️ [AudioCall] Another audio call is already active - preventing duplicate');
        return;
      }

      if (initOnceRef.current === appointmentId) return; // dedupe per session
      initOnceRef.current = appointmentId;
      hasInitializedRef.current = true;
      
      if (!isIncomingCall) {
        console.log('🚀 AudioCall: Initializing call (outgoing)');
        await initializeCall();
      } else {
        console.log('📞 AudioCall: Initializing for incoming call');
        // For incoming calls, initialize the service and set up event listeners
        await initializeIncomingCall();
      }
    };
    
    setupCall();
    startPulseAnimation();
  }, [isIncomingCall, appointmentId, userId, isDoctor]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 AudioCall cleanup - component unmounting');
      initOnceRef.current = null;
      hasInitializedRef.current = false;
      // Don't end call immediately - let the call complete naturally
      // The call will be ended by user action or timeout
    };
  }, []);

  useEffect(() => {
    if (callState.connectionState === 'connected') {
      setIsInitializing(false);
      setIsRinging(false);
    } else if (callState.connectionState === 'connecting') {
      setIsRinging(true);
      startConnectingAnimation();
    }
  }, [callState.connectionState]);

  const initializeIncomingCall = async () => {
    try {
      console.log('📞 AudioCall: Initializing for incoming call');
      
      const events: AudioCallEvents = {
        onStateChange: (state) => {
          console.log('📊 Call state changed:', state);
          setCallState(state);

          // Freeze to connected once true to avoid later regressions from late events
          if ((state.isConnected || state.connectionState === 'connected') && !freezeConnectedRef.current) {
            freezeConnectedRef.current = true;
          }
          
          // Update ringing state and switch UI when connected
          if (state.connectionState === 'connected' || state.isConnected) {
            setIsRinging(false);
            setIsProcessingAnswer(false);
            setCallAccepted(true);
          }
        },
        onRemoteStream: (stream) => {
          console.log('🎵 Remote audio stream received');
        },
        onCallEnded: () => {
          console.log('📞 Call ended');
          onEndCall();
        },
        onError: (error) => {
          console.error('❌ Call error:', error);
          // Only show alert for critical errors, not during normal transitions
          if (!error.includes('connection') && 
              !error.includes('transition') && 
              !error.includes('WebRTC') &&
              !error.includes('signaling') &&
              !error.includes('Failed to initialize call')) {
            Alert.alert('Call Error', error);
          }
        },
        onCallAnswered: () => {
          console.log('✅ Call answered');
          // Ensure UI flips to connected immediately on answered
          if (!freezeConnectedRef.current) freezeConnectedRef.current = true;
          setIsRinging(false);
          setIsProcessingAnswer(false);
          setCallAccepted(true);
          onCallAnswered?.();
        },
        onCallRejected: () => {
          console.log('❌ Call rejected');
          onCallRejected?.();
        },
        onCallTimeout: () => {
          console.log('⏰ Call timeout');
          onCallTimeout?.();
        },
      };

      // Initialize the AudioCallService for incoming call
      await AudioCallService.getInstance().initializeForIncomingCall(appointmentId, userId, events);
      console.log('✅ AudioCall: Incoming call initialized successfully');
      
    } catch (error) {
      console.error('❌ AudioCall: Failed to initialize incoming call:', error);
      // Call initialization error logged to console only - no modal shown
      onEndCall();
    }
  };

  const initializeCall = async () => {
    try {
      // Reset the service state before initializing
      await AudioCallService.getInstance().reset();

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
          console.error('❌ Call error:', error);
          // Only show alert for critical errors, not during normal transitions
          if (!error.includes('connection') && 
              !error.includes('transition') && 
              !error.includes('WebRTC') &&
              !error.includes('signaling') &&
              !error.includes('Failed to initialize call')) {
            Alert.alert('Call Error', error, [
              { text: 'OK', onPress: onEndCall }
            ]);
          }
        },
        onCallAnswered: () => {
          console.log('✅ Call answered - session will be activated');
        },
        onCallRejected: () => {
          console.log('❌ Call rejected');
          onCallRejected?.();
        },
        onCallTimeout: () => {
          console.log('⏰ Call timeout');
          onCallTimeout?.();
        },
      };

      await AudioCallService.getInstance().initialize(appointmentId, userId, (doctorId as any), events, doctorName, otherParticipantProfilePictureUrl);
      
      // Offer creation is now handled automatically in AudioCallService.initialize
      console.log('📞 Call initialization completed - offer will be created automatically if needed');
      
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
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(pulse);
    };
    pulse();
  };

  const startConnectingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(connectingAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(connectingAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startRingingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const toggleAudio = () => {
    const isEnabled = AudioCallService.getInstance().toggleAudio();
    // Haptic feedback
    Vibration.vibrate(50);
  };

  const toggleSpeaker = () => {
    Vibration.vibrate(50);
    setIsSpeakerOn(prev => !prev);
    
    // Toggle speaker mode in AudioCallService
    const audioCallService = AudioCallService.getInstance();
    audioCallService.toggleSpeaker(!isSpeakerOn);
  };

  const endCall = async () => {
    // Haptic feedback for end call
    Vibration.vibrate([0, 100, 50, 100]);
    
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: async () => {
            await AudioCallService.getInstance().endCall();
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

  // Effective connectivity (once connected, stay connected visually)
  const isEffectivelyConnected = freezeConnectedRef.current || callState.isConnected || callState.connectionState === 'connected';

  const getStatusText = () => {
    if (shouldShowIncomingUI) return 'Incoming Call';
    if (isEffectivelyConnected) return 'Connected';
    if (isIncomingCall && isProcessingAnswer) return 'Answering...';
    
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

  const getConnectionIndicatorColor = () => {
    if (isEffectivelyConnected) return '#4CAF50';
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

  const waveInterpolate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const connectingInterpolate = connectingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });


  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Dynamic Header based on call state */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onEndCall}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {shouldShowIncomingUI ? 'Incoming Call' : 'Audio Call'}
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
          <View style={styles.connectionStatus}>
            <View style={[styles.connectionDot, { backgroundColor: getConnectionIndicatorColor() }]} />
            <Text style={[styles.connectionText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          {isEffectivelyConnected && (
            <Text style={styles.durationText}>
              {formatDuration(callState.callDuration)}
            </Text>
          )}
        </View>
      </View>

          {/* Dynamic Controls based on call state */}
          {isIncomingCall && !callAccepted ? (
        /* Incoming Call Controls - Accept/Decline */
        <View style={styles.controls}>
          {/* Decline Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.declineButton]}
            onPress={async () => {
              Vibration.vibrate(50);
              try { await AudioCallService.getInstance().rejectIncomingCall?.('declined'); } catch {}
              onCallRejected?.();
            }}
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
            onPress={async () => {
              if (isProcessingAnswer) return; // Prevent multiple taps
              Vibration.vibrate(50);
              console.log('📞 Accept button pressed - answering call');
              
              // Immediately update UI state
              setIsRinging(false);
              setIsProcessingAnswer(true);
              setCallAccepted(true); // Mark call as accepted to show connected UI
              
              try {
                // Process the stored pending offer and send answer
                await AudioCallService.getInstance().processIncomingCall();
                console.log('✅ Incoming call processed - resetting processing state');
                // Reset processing state after successful processing
                setIsProcessingAnswer(false);
              } catch (e) {
                console.error('❌ Failed to process incoming call:', e);
                // Reset processing state even on error
                setIsProcessingAnswer(false);
              }
              
              // Trigger callback for any parent-side effects
              onCallAnswered?.();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        /* Connected Call Controls - Speaker/Mute/End */
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

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    color: 'white',
    fontSize: 14,
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
});
