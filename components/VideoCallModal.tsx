import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
  View,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { VideoCallEvents, VideoCallService, VideoCallState } from '../services/videoCallService';
interface VideoCallModalProps {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorId?: string | number;
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
  doctorId,
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callAccepted, setCallAccepted] = useState(false);
  // Auto-hide chrome (header/content/controls) like WhatsApp during dialing/connected (not incoming UI)
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Caller PiP transition: shrink from full-screen to PiP corner
  const shrinkProgress = useRef(new Animated.Value(0)).current; // 0 = full-screen, 1 = PiP
  // PiP scale when UI hides (more space like WhatsApp): 1 when visible, 0.7 when hidden
  const pipScale = useRef(new Animated.Value(1)).current;
  const PIP_WIDTH = 120;
  const PIP_HEIGHT = 160;
  const PIP_MARGIN_LEFT = 20;
  const PIP_MARGIN_BOTTOM = 100;
  const [pipTransitioning, setPipTransitioning] = useState(false);
  const [pipSettled, setPipSettled] = useState(false);
  // Hero mode: show full-screen self for 2.5s after connect before PiP transition
  const [heroMode, setHeroMode] = useState(false);
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reverse animation on hang up
  const [isReverseAnimating, setIsReverseAnimating] = useState(false);
  // Sounds
  const connectSoundRef = useRef<Audio.Sound | null>(null);
  const hangupSoundRef = useRef<Audio.Sound | null>(null);
  const hasPlayedConnectRef = useRef(false);
  const hasPlayedHangupRef = useRef(false);
  const soundsLoadedRef = useRef(false);
  const pendingConnectSoundRef = useRef(false);
  const connectSoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTargetTimeRef = useRef<number | null>(null);
  // To avoid freezes when WebRTC tears down, animate a placeholder instead of RTCView on reverse
  const [usePlaceholderOnReverse, setUsePlaceholderOnReverse] = useState(false);
  // Remote left banner
  const [peerLeftVisible, setPeerLeftVisible] = useState(false);
  const peerLeftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if this device initiated the hang-up
  const localEndedRef = useRef(false);
  // Remote peer media state
  const [peerAudioEnabled, setPeerAudioEnabled] = useState(true);
  const [peerVideoEnabled, setPeerVideoEnabled] = useState(true);
  const [containerSize, setContainerSize] = useState({ w: screenWidth, h: screenHeight });
  const callStateRef = useRef(callState);

  const playSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    const sound = soundRef.current;
    if (!sound) {
      console.warn('[VideoCallModal] playSound: sound ref is null');
      return;
    }
    try {
      console.log('[VideoCallModal] Playing sound...');
      await sound.stopAsync().catch(() => {});
      await sound.setIsMutedAsync(false);
      await sound.setVolumeAsync(1.0);
      await sound.setPositionAsync(0);
      await sound.playAsync();
      console.log('[VideoCallModal] Sound played successfully');
    } catch (e) {
      console.error('[VideoCallModal] playSound failed:', e);
    }
  };
  
  const videoCallService = useRef<VideoCallService | null>(null);
  const initOnceRef = useRef<string | null>(null);
  
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

      // Global suppression: do not start video if audio call is active or current call is audio
      const g: any = global as any;
      if (g.activeAudioCall || g.currentCallType === 'audio') {
        console.log('🚫 [VideoCallModal] Suppressing video init because audio call is active/current');
        return;
      }
      
      // Prevent duplicate initialization for the same appointment
      if (initOnceRef.current === appointmentId) {
        return;
      }
      initOnceRef.current = appointmentId;
      
      // Reset sound flags for new session
      hasPlayedConnectRef.current = false;
      hasPlayedHangupRef.current = false;
      soundsLoadedRef.current = false;
      pendingConnectSoundRef.current = false;

      if (!isIncomingCall) {
        console.log('🚀 VideoCallModal: Initializing call (outgoing)');
        await initializeVideoCall();
      } else {
        console.log('📞 VideoCallModal: Initializing for incoming call');
        await initializeIncomingCall();
      }
    };
    
    // Preload sounds
    (async () => {
      try {
        console.log('[VideoCallModal] Setting audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
        console.log('[VideoCallModal] Loading sound files...');
        const connectModule = require('../assets/sounds/facetime-connect.mp3');
        const hangupModule = require('../assets/sounds/facetime-hang-up.mp3');
        const connect = new Audio.Sound();
        const hangup = new Audio.Sound();
        console.log('[VideoCallModal] Loading connect sound...');
        await connect.loadAsync(connectModule, { volume: 1.0 }, false);
        console.log('[VideoCallModal] Loading hangup sound...');
        await hangup.loadAsync(hangupModule, { volume: 1.0 }, false);
        connectSoundRef.current = connect;
        hangupSoundRef.current = hangup;
        soundsLoadedRef.current = true;
        console.log('[VideoCallModal] Sounds loaded successfully');
        // If connection already happened before sounds loaded, play now
        if (pendingConnectSoundRef.current && !hasPlayedConnectRef.current && callStateRef.current.connectionState === 'connected') {
          const now = Date.now();
          const target = connectTargetTimeRef.current ?? now;
          const remaining = Math.max(0, target - now);
          if (connectSoundTimeoutRef.current) clearTimeout(connectSoundTimeoutRef.current);
          connectSoundTimeoutRef.current = setTimeout(async () => {
            await playSound(connectSoundRef);
            hasPlayedConnectRef.current = true;
          }, remaining);
          pendingConnectSoundRef.current = false;
        }
      } catch (e) {
        console.warn('[VideoCallModal] Sound preload failed:', e);
      }
    })();

    setupCall();
    return () => {
      console.log('🧹 VideoCallModal cleanup - ending call');
      initOnceRef.current = null;
      if (heroTimerRef.current) {
        clearTimeout(heroTimerRef.current);
        heroTimerRef.current = null;
      }
      if (connectSoundTimeoutRef.current) {
        clearTimeout(connectSoundTimeoutRef.current);
        connectSoundTimeoutRef.current = null;
      }
      if (peerLeftTimerRef.current) {
        clearTimeout(peerLeftTimerRef.current);
        peerLeftTimerRef.current = null;
      }
      // Unload sounds
      (async () => {
        try {
          await connectSoundRef.current?.unloadAsync();
          await hangupSoundRef.current?.unloadAsync();
        } catch {}
        connectSoundRef.current = null;
        hangupSoundRef.current = null;
      })();
      if (videoCallService.current) {
        videoCallService.current.reset();
      }
    };
  }, [isIncomingCall, appointmentId]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (callState.connectionState === 'connected') {
      console.log('[VideoCallModal] Call connected! Setting up connect sound...');
      setIsInitializing(false);
      setIsRinging(false);
      setUsePlaceholderOnReverse(false);
      // Play connect sound once per call (delayed 2000ms to align with transition)
      if (!hasPlayedConnectRef.current) {
        console.log('[VideoCallModal] Scheduling connect sound (2s delay)...');
        if (connectSoundTimeoutRef.current) {
          clearTimeout(connectSoundTimeoutRef.current);
        }
        connectTargetTimeRef.current = Date.now() + 2000;
        connectSoundTimeoutRef.current = setTimeout(() => {
          console.log('[VideoCallModal] Connect sound timeout fired. soundsLoaded:', soundsLoadedRef.current);
          if (soundsLoadedRef.current) {
            (async () => {
              console.log('[VideoCallModal] Attempting to play connect sound...');
              await playSound(connectSoundRef);
              hasPlayedConnectRef.current = true;
            })();
          } else {
            // Defer play until sounds finish loading
            console.log('[VideoCallModal] Sounds not loaded yet, deferring connect sound');
            pendingConnectSoundRef.current = true;
          }
        }, 2000);
      } else {
        console.log('[VideoCallModal] Connect sound already played, skipping');
      }
      // Start hero mode: show full-screen self for 2.5s, then shrink to PiP
      setHeroMode(true);
      setPipSettled(false);
      setPipTransitioning(false);
      shrinkProgress.setValue(0); // Start at full-screen
      
      // Clear any existing hero timer
      if (heroTimerRef.current) {
        clearTimeout(heroTimerRef.current);
      }
      
      // After 2.5s, animate shrink from full-screen to PiP
      heroTimerRef.current = setTimeout(() => {
        setHeroMode(false);
        setPipTransitioning(true);
        Animated.timing(shrinkProgress, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setPipSettled(true);
          setPipTransitioning(false);
        });
      }, 2500);
    } else if (callState.connectionState === 'connecting') {
      setIsRinging(true);
      // Reset all transition states
      setHeroMode(false);
      setPipSettled(false);
      setPipTransitioning(false);
      setIsReverseAnimating(false);
      shrinkProgress.setValue(0);
      if (heroTimerRef.current) {
        clearTimeout(heroTimerRef.current);
        heroTimerRef.current = null;
      }
    }
  }, [callState.connectionState]);

  // Start/Reset auto-hide only AFTER connected AND after hero mode ends. Keep UI visible while ringing/connecting or incoming UI.
  useEffect(() => {
    // If incoming UI is visible, never auto-hide
    if (shouldShowIncomingUI) {
      clearAutoHide();
      showUI(true);
      return () => clearAutoHide();
    }

    // Only auto-hide when connected AND hero mode is done (pipSettled)
    if (callState.connectionState === 'connected' && pipSettled && !heroMode) {
      startAutoHide();
      return () => clearAutoHide();
    }

    // Not connected or still in hero/transition: keep UI visible
    clearAutoHide();
    showUI(true);
    return () => clearAutoHide();
  }, [shouldShowIncomingUI, callState.connectionState, pipSettled, heroMode]);

  const clearAutoHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const showUI = (immediate = false) => {
    setUiVisible(true);
    Animated.timing(uiOpacity, {
      toValue: 1,
      duration: immediate ? 0 : 180,
      useNativeDriver: true,
    }).start();
    Animated.timing(pipScale, {
      toValue: 1,
      duration: immediate ? 0 : 180,
      useNativeDriver: true,
    }).start();
  };

  const hideUI = () => {
    setUiVisible(false);
    Animated.timing(uiOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    Animated.timing(pipScale, {
      toValue: 0.7,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const startAutoHide = () => {
    clearAutoHide();
    // Keep UI visible for 3 seconds after any change
    showUI(true);
    hideTimerRef.current = setTimeout(() => {
      hideUI();
    }, 3000);
  };

  // Monitor local stream availability (aggressive polling for outgoing to show camera ASAP)
  useEffect(() => {
    if (videoCallService.current && !localStream) {
      const checkLocalStream = () => {
        const stream = videoCallService.current?.getLocalStream();
        if (stream) {
          console.log('📹 [VideoCallModal] Local stream became available:', {
            streamId: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });
          setLocalStream(stream);
          return true;
        }
        return false;
      };

      // Immediate check
      if (checkLocalStream()) return;

      // Poll every 200ms up to 4s
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 200;
        if (checkLocalStream() || elapsed >= 4000) {
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [videoCallService.current, localStream]);

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
        onPeerMediaStateChange: ({ audioEnabled, videoEnabled }) => {
          setPeerAudioEnabled(audioEnabled);
          setPeerVideoEnabled(videoEnabled);
        },
        onCallEnded: async () => {
          console.log('📞 Video call ended');
          // Fire-and-forget sound, don't block UI
          if (!hasPlayedHangupRef.current) {
            console.log('[VideoCallModal] Playing hangup sound (incoming call ended)...');
            hasPlayedHangupRef.current = true;
            playSound(hangupSoundRef).catch(() => {});
          } else {
            console.log('[VideoCallModal] Hangup sound already played, skipping');
          }
          if (localEndedRef.current) {
            // Local user initiated hang-up: keep UI as-is, just close shortly
            if (heroTimerRef.current) { clearTimeout(heroTimerRef.current); heroTimerRef.current = null; }
            clearAutoHide();
            showUI(true);
            setIsReverseAnimating(false);
            setUsePlaceholderOnReverse(false);
            if (peerLeftTimerRef.current) clearTimeout(peerLeftTimerRef.current);
            peerLeftTimerRef.current = setTimeout(() => {
              onEndCall();
              localEndedRef.current = false;
            }, 300);
          } else {
            // Remote user hung up: show banner and remove remote stream
            if (heroTimerRef.current) { clearTimeout(heroTimerRef.current); heroTimerRef.current = null; }
            clearAutoHide();
            showUI(true);
            setIsReverseAnimating(false);
            setUsePlaceholderOnReverse(false);
            setPeerLeftVisible(true);
            setRemoteStream(null as any);
            if (peerLeftTimerRef.current) clearTimeout(peerLeftTimerRef.current);
            peerLeftTimerRef.current = setTimeout(() => {
              onEndCall();
            }, 1200);
          }
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

      // Initialize the VideoCallService for incoming call (ringing only; no auto-answer)
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
      // Debug logging for doctorId
      console.log('🔍 [VideoCallModal] initializeVideoCall called with:', {
        appointmentId,
        userId,
        doctorId,
        doctorName,
        isDoctor
      });
      
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
        onPeerMediaStateChange: ({ audioEnabled, videoEnabled }) => {
          setPeerAudioEnabled(audioEnabled);
          setPeerVideoEnabled(videoEnabled);
        },
        onCallEnded: async () => {
          if (!hasPlayedHangupRef.current) {
            console.log('[VideoCallModal] Playing hangup sound (outgoing call ended)...');
            hasPlayedHangupRef.current = true;
            playSound(hangupSoundRef).catch(() => {});
          } else {
            console.log('[VideoCallModal] Hangup sound already played, skipping');
          }
          if (localEndedRef.current) {
            if (heroTimerRef.current) { clearTimeout(heroTimerRef.current); heroTimerRef.current = null; }
            clearAutoHide();
            showUI(true);
            setIsReverseAnimating(false);
            setUsePlaceholderOnReverse(false);
            if (peerLeftTimerRef.current) clearTimeout(peerLeftTimerRef.current);
            peerLeftTimerRef.current = setTimeout(() => {
              onEndCall();
              localEndedRef.current = false;
            }, 300);
          } else {
            if (heroTimerRef.current) { clearTimeout(heroTimerRef.current); heroTimerRef.current = null; }
            clearAutoHide();
            showUI(true);
            setIsReverseAnimating(false);
            setUsePlaceholderOnReverse(false);
            setPeerLeftVisible(true);
            setRemoteStream(null as any);
            if (peerLeftTimerRef.current) clearTimeout(peerLeftTimerRef.current);
            peerLeftTimerRef.current = setTimeout(() => {
              onEndCall();
            }, 1200);
          }
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

      await VideoCallService.getInstance().initialize(appointmentId, userId, (doctorId as any), events, doctorName, otherParticipantProfilePictureUrl);
      videoCallService.current = VideoCallService.getInstance();
      
      // Get local stream for display
      const localStream = videoCallService.current.getLocalStream();
      console.log('📹 [VideoCallModal] Local stream retrieved:', {
        hasLocalStream: !!localStream,
        streamId: localStream?.id,
        videoTracks: localStream?.getVideoTracks().length || 0,
        audioTracks: localStream?.getAudioTracks().length || 0,
        streamURL: localStream?.toURL()
      });
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
        await videoCallService.current.acceptIncomingCall();
      }
      
      // Get local stream for display after accepting
      const localStream = videoCallService.current?.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
      }
      
      console.log('✅ Video call processed - resetting processing state');
      // Reset processing state after successful processing
      setIsProcessingAnswer(false);
      
      // Just trigger the callback - let the parent handle the logic
      onCallAnswered?.();
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call. Please try again.');
      // Reset processing state even on error
      setIsProcessingAnswer(false);
    }
  };

  const handleRejectCall = () => {
    Vibration.vibrate(50);
    if (videoCallService.current) {
      // For incoming, send a rejection signal so the caller stops
      videoCallService.current.rejectIncomingCall?.('declined');
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
      // Refresh the local stream reference so PiP updates to the new track
      const updated = videoCallService.current.getLocalStream?.();
      if (updated) {
        setLocalStream(updated);
      }
      Vibration.vibrate(50);
    }
  };

  const toggleSpeaker = () => {
    Vibration.vibrate(50);
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    
    // Toggle speaker mode in VideoCallService
    if (videoCallService.current && typeof (videoCallService.current as any).toggleSpeaker === 'function') {
      Promise.resolve((videoCallService.current as any).toggleSpeaker())
        .then(() => {
          console.log('🔊 [VideoCallModal] Speaker toggled to', newState ? 'ON' : 'OFF');
        })
        .catch((err: any) => {
          console.error('❌ [VideoCallModal] Failed toggling speaker:', err);
          // Revert UI if service call fails
          setIsSpeakerOn(!newState);
        });
    }
  };

  const endCall = async () => {
    // Haptic feedback for end call
    Vibration.vibrate([0, 100, 50, 100]);
    await performEndCallWithAnimation();
  };

  const performEndCallWithAnimation = async () => {
    // Local end: no animations, keep UI as-is until service signals end
    localEndedRef.current = true;
    // Cancel timers and keep UI visible
    if (heroTimerRef.current) {
      clearTimeout(heroTimerRef.current);
      heroTimerRef.current = null;
    }
    clearAutoHide();
    showUI(true);
    setIsReverseAnimating(false);
    setUsePlaceholderOnReverse(false);
    // Play hang-up sound immediately once
    if (!hasPlayedHangupRef.current) {
      console.log('[VideoCallModal] Playing hangup sound (local end call)...');
      hasPlayedHangupRef.current = true;
      await playSound(hangupSoundRef);
    } else {
      console.log('[VideoCallModal] Hangup sound already played, skipping');
    }
    // Trigger service end; onCallEnded will close
    if (videoCallService.current) {
      await videoCallService.current.endCall();
    }
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

  const getConnectionIndicatorColor = () => {
    switch (callState.connectionState) {
      case 'connecting':
        return '#FF9800'; // Orange for connecting
      case 'connected':
        return '#4CAF50'; // Green for connected
      case 'disconnected':
        return '#9E9E9E'; // Gray for disconnected
      case 'failed':
        return '#F44336'; // Red for failed
      default:
        return '#2196F3'; // Blue for default
    }
  };


  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (shouldShowIncomingUI) return; // keep UI visible during incoming screen
        showUI();
        startAutoHide();
      }}
    >
    <SafeAreaView style={styles.container} onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout;
      if (width && height) setContainerSize({ w: width, h: height });
    }}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      {shouldShowIncomingUI && (
        <Image
          source={require('../app/chat/black1.jpg')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
      {/** Determine outgoing pre-connected state to show self preview */}
      {/** Outgoing (caller) and not yet connected */}
      {/** We'll use this to render local stream full-screen as background */}
      
      {/* Caller self-preview as background when dialing (outgoing only) */}
      {!isIncomingCall && callState.connectionState !== 'connected' && localStream && (
        <RTCView
          style={styles.remoteVideo}
          streamURL={localStream.toURL()}
          objectFit="cover"
          mirror={callState.isFrontCamera}
          pointerEvents="none"
        />
      )}
      
      {/* Remote Video (Full Screen Background) */}
      {callState.connectionState === 'connected' && !(isReverseAnimating && usePlaceholderOnReverse) && (
        peerVideoEnabled && remoteStream ? (
          <RTCView
            style={styles.remoteVideo}
            streamURL={remoteStream.toURL()}
            objectFit="cover"
            pointerEvents="none"
          />
        ) : (
          <View style={[styles.remoteVideo, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }]} pointerEvents="none">
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="videocam-off" size={28} color="#fff" />
              <Text style={{ color: 'white', marginTop: 6 }}>Camera off</Text>
            </View>
          </View>
        )
      )}
      
      {/* Local Video (PiP). Caller uses cross-fade transition; receiver shows static PiP. */}
      {localStream && callState.connectionState !== 'connected' && !isIncomingCall && (
        // Pre-connect full-screen caller self view (visible until connected)
        <RTCView
          style={styles.remoteVideo}
          streamURL={localStream.toURL()}
          objectFit="cover"
          mirror={callState.isFrontCamera}
          pointerEvents="none"
        />
      )}

      {localStream && callState.connectionState === 'connected' && (
        <>
          {/* Shrinking self-view: transitions from full-screen to PiP */}
          {(heroMode || pipTransitioning || isReverseAnimating) && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: containerSize.w,
                height: containerSize.h,
                borderRadius: shrinkProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10],
                }),
                borderWidth: shrinkProgress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 2],
                }),
                borderColor: '#4CAF50',
                overflow: 'hidden',
                zIndex: 2,
                transform: [
                  {
                    translateX: shrinkProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, PIP_MARGIN_LEFT + PIP_WIDTH/2 - containerSize.w/2],
                    }),
                  },
                  {
                    translateY: shrinkProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, containerSize.h - PIP_MARGIN_BOTTOM - PIP_HEIGHT/2 - containerSize.h/2],
                    }),
                  },
                  {
                    scaleX: shrinkProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, PIP_WIDTH / containerSize.w],
                    }),
                  },
                  {
                    scaleY: shrinkProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, PIP_HEIGHT / containerSize.h],
                    }),
                  },
                ],
              }}
              pointerEvents="none"
            >
              {isReverseAnimating && usePlaceholderOnReverse ? (
                <View style={{ flex: 1, backgroundColor: 'black' }} />
              ) : (
                <RTCView
                  key={(localStream as any)?.id || 'local-hero'}
                  style={{ flex: 1 }}
                  streamURL={localStream.toURL()}
                  objectFit="cover"
                  mirror={callState.isFrontCamera}
                  pointerEvents="none"
                />
              )}
            </Animated.View>
          )}

          {/* Static PiP after transition settles */}
          {pipSettled && !isReverseAnimating && (
            <Animated.View
              style={{
                position: 'absolute',
                bottom: PIP_MARGIN_BOTTOM,
                left: PIP_MARGIN_LEFT,
                width: PIP_WIDTH,
                height: PIP_HEIGHT,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: '#4CAF50',
                zIndex: 1,
                overflow: 'hidden',
                transform: [{ scale: pipScale }],
              }}
              pointerEvents="none"
            >
              {peerLeftVisible ? (
                <View style={{ flex: 1, backgroundColor: 'black' }} />
              ) : (
                <RTCView
                  key={(localStream as any)?.id || 'local-pip'}
                  style={{ flex: 1 }}
                  streamURL={localStream.toURL()}
                  objectFit="cover"
                  mirror={callState.isFrontCamera}
                  zOrder={1}
                  pointerEvents="none"
                />
              )}
            </Animated.View>
          )}
        </>
      )}
      
      {/* Peer left banner */}
      {peerLeftVisible && (
        <View
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 3,
          }}
          pointerEvents="none"
        >
          <View style={styles.peerLeftBanner}>
            <Text style={styles.peerLeftBannerText}>
              {(isDoctor ? patientName : doctorName)} left the call
            </Text>
          </View>
        </View>
      )}

      {/* Peer mic off badge */}
      {callState.connectionState === 'connected' && !peerAudioEnabled && (
        <View
          style={{
            position: 'absolute',
            top: 56,
            right: 20,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            zIndex: 3,
          }}
          pointerEvents="none"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mic-off" size={14} color="#fff" />
            <Text style={{ color: 'white', marginLeft: 4, fontSize: 12 }}>Mic off</Text>
          </View>
        </View>
      )}

      {/* Dynamic Header based on call state */}
      {shouldShowIncomingUI || callState.connectionState !== 'connected' ? (
        // Incoming/connecting header
        <Animated.View style={[styles.header, !shouldShowIncomingUI && { opacity: uiOpacity }, { zIndex: 2 }]}
          pointerEvents={shouldShowIncomingUI ? 'auto' : (uiVisible ? 'auto' : 'none')}
        >
          <TouchableOpacity style={styles.backButton} onPress={onEndCall}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{shouldShowIncomingUI ? 'Incoming Video Call' : 'Video Call'}</Text>
          <View style={styles.placeholder} />
        </Animated.View>
      ) : (
        // Connected call header - vertical: name then duration
        <Animated.View style={[styles.connectedHeader, { opacity: uiOpacity }, { zIndex: 2 }]} pointerEvents={uiVisible ? 'auto' : 'none'}>
          <TouchableOpacity style={styles.backButton} onPress={onEndCall}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.connectedHeaderCenter}>
            <Text style={styles.connectedUserName}>
              {isDoctor ? patientName : doctorName}
            </Text>
            <Text style={styles.callDuration}>
              {formatDuration(callState.callDuration)}
            </Text>
          </View>

          <View style={styles.placeholder} />
        </Animated.View>
      )}
      
      {/* Main Content - Streamlined for connected calls */}
      {shouldShowIncomingUI || callState.connectionState !== 'connected' ? (
        <Animated.View style={[styles.content, !shouldShowIncomingUI && { opacity: uiOpacity }, { zIndex: 2 }]}
          pointerEvents={shouldShowIncomingUI ? 'auto' : (uiVisible ? 'auto' : 'none')}
        >
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
          </View>
        </Animated.View>
      ) : null}

      {/* Dynamic Controls based on call state */}
      {shouldShowIncomingUI || (isIncomingCall && isProcessingAnswer) ? (
        /* Incoming Call Controls - Accept/Decline */
        <Animated.View style={[styles.controls, { zIndex: 2 }]}>
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
        </Animated.View>
      ) : callState.connectionState !== 'connected' ? (
        /* Outgoing (connecting) minimal controls - End Call only at bottom center */
        <Animated.View style={[styles.bottomCenterControls, { opacity: uiOpacity }, { zIndex: 2 }]} pointerEvents={uiVisible ? 'auto' : 'none'}>
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        /* Connected Call Controls */
        <>
          {/* Vertical tools on right side */}
          <Animated.View style={[styles.rightControls, { opacity: uiOpacity }, { zIndex: 2 }]} pointerEvents={uiVisible ? 'auto' : 'none'}>
            {/* Speaker */}
            <TouchableOpacity 
              style={[
                styles.controlButton,
                styles.sideControlButton,
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

            {/* Mute */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.sideControlButton,
                !callState.isAudioEnabled && styles.disabledButton
              ]}
              onPress={toggleAudio}
              disabled={!localStream}
            >
              <Ionicons
                name={callState.isAudioEnabled ? "mic" : "mic-off"}
                size={20}
                color="white"
              />
            </TouchableOpacity>

            {/* Video */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.sideControlButton,
                !callState.isVideoEnabled && styles.disabledButton
              ]}
              onPress={toggleVideo}
              disabled={!localStream}
            >
              <Ionicons
                name={callState.isVideoEnabled ? "videocam" : "videocam-off"}
                size={20}
                color="white"
              />
            </TouchableOpacity>

            {/* Switch camera */}
            <TouchableOpacity
              style={[styles.controlButton, styles.sideControlButton]}
              onPress={switchCamera}
              disabled={!localStream}
            >
              <Ionicons name="camera-reverse" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* End call at bottom center */}
          <Animated.View style={[styles.bottomCenterControls, { opacity: uiOpacity }, { zIndex: 2 }]} pointerEvents={uiVisible ? 'auto' : 'none'}>
            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={endCall}
            >
              <Ionicons name="call" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
    </TouchableWithoutFeedback>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    marginHorizontal: 20,
    marginTop: 10,
  },
  connectedHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  connectedUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  connectedUserRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 1,
  },
  connectedHeaderRight: {
    alignItems: 'flex-end',
  },
  callDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 3,
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  connectedContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  rightControls: {
    position: 'absolute',
    right: 20,
    top: 140,
    bottom: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideControlButton: {
    marginVertical: 10,
  },
  bottomCenterControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
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
    right: 0,
    bottom: 0,
  },
  localVideo: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  localVideoPlaceholder: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoPlaceholderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  peerLeftBanner: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  peerLeftBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
