import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AudioCall from '../components/AudioCall';
import VideoCallModal from '../components/VideoCallModal';
import { useAuth } from '../contexts/AuthContext';
import { useSecureScreen } from '../hooks/useSecureScreen';
import { AudioCallService } from '../services/audioCallService';
import ringtoneService from '../services/ringtoneService';
import { VideoCallService } from '../services/videoCallService';

export default function CallScreen() {
  // Enable screenshot prevention for all calls (audio/video)
  useSecureScreen('Call');

  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const {
    sessionId,
    doctorId,
    doctorName,
    doctorSpecialization,
    doctorProfilePicture,
    callType,
    isDirectSession,
    answeredFromCallKeep
  } = params;

  // Normalize callType to 'audio' | 'video' (treat 'voice' as 'audio')
  const normalizedCallType = String(callType || 'audio').toLowerCase() === 'video' ? 'video' : 'audio';

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const incomingParam = String(params.isIncomingCall || '').toLowerCase() === 'true';
  const isFromCallKeep = String(answeredFromCallKeep || '').toLowerCase() === 'true';

  // Call services
  const audioCallService = useRef<AudioCallService | null>(null);
  const videoCallService = useRef<VideoCallService | null>(null);

  // CRITICAL: Track initialized session to prevent duplicate initialization
  const initializedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    // Derive incoming flag from params on mount
    setIsIncomingCall(incomingParam);

    // Log CallKeep auto-answer
    if (isFromCallKeep) {
      console.log('✅ [CallScreen] Call answered from CallKeep system UI - auto-starting');
    }

    // Prevent duplicate initialization for the same session
    const currentSession = String(sessionId);
    if (initializedSessionRef.current === currentSession) {
      console.log('⚠️ [CallScreen] Call already initialized for session:', currentSession);
      return;
    }

    initializedSessionRef.current = currentSession;
    console.log('✅ [CallScreen] Initializing call for new session:', currentSession, {
      isIncoming: incomingParam,
      isFromCallKeep,
      callType: normalizedCallType
    });
    initializeCall();
  }, []);

  // Safety net: ensure resources are released on unmount (e.g., if navigation kills the screen)
  useEffect(() => {
    return () => {
      console.log('🧹 [CallScreen] Unmount safety net - destroying resources');
      try { AudioCallService.getInstance().destroyResources(); } catch (e) { }
      try { VideoCallService.getInstance().destroyResources(); } catch (e) { }
      AudioCallService.clearInstance();
      VideoCallService.clearInstance();
    };
  }, []);

  // SECURITY: Block system back navigation during active call
  // Users can only exit the call screen by explicitly ending the call
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Block the back button - return true to prevent default behavior
      console.log('🚫 [CallScreen] Back button blocked during active call');
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const initializeCall = async () => {
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      setIsLoading(true);
      setError(null);

      // Ensure we don't render stale modals from a previous visit
      setShowAudioCall(false);
      setShowVideoCall(false);

      // Add timeout to prevent infinite loading
      initTimeout = setTimeout(() => {
        console.error('❌ [CallScreen] Initialization timeout');
        setError('Call initialization timed out. Please try again.');
        setIsLoading(false);
      }, 15000); // 15 second timeout

      if (!sessionId) {
        setError('Missing required call parameters');
        if (initTimeout) clearTimeout(initTimeout);
        return;
      }

      // Enhanced doctorId validation for outgoing calls
      if (!incomingParam) {
        if (!doctorId) {
          console.error('❌ [CallScreen] Missing doctorId for outgoing call');
          setError('Missing doctorId for outgoing call');
          if (initTimeout) clearTimeout(initTimeout);
          return;
        }

        // Validate doctorId is a valid number
        const doctorIdNum = Number(doctorId);
        if (Number.isNaN(doctorIdNum) || doctorIdNum <= 0) {
          console.error('❌ [CallScreen] Invalid doctorId format:', doctorId);
          setError('Invalid doctor ID. Please try again.');
          if (initTimeout) clearTimeout(initTimeout);
          return;
        }

        console.log('🔍 [CallScreen] Validated call parameters:', {
          sessionId,
          callType,
          doctorId: doctorIdNum,
          isIncoming: incomingParam
        });
      }

      if (!user) {
        setError('User not authenticated');
        if (initTimeout) clearTimeout(initTimeout);
        return;
      }

      // Use session ID directly as appointment ID
      const appointmentId = String(sessionId);
      const userId = user.id.toString();
      const isDoctor = user.user_type === 'doctor';

      // Set global flags for signaling services (fallback)
      if (typeof global !== 'undefined') {
        (global as any).userType = user.user_type;
        (global as any).isDoctor = isDoctor;
      }

      console.log('📞 Initializing call:', {
        appointmentId,
        userId,
        isDoctor,
        callType,
        doctorName,
        sessionId,
        doctorId,
        doctorIdType: typeof doctorId,
        doctorIdValue: doctorId
      });

      // Set global current call type to help suppress the other flow
      (global as any).currentCallType = normalizedCallType;

      if (normalizedCallType === 'audio') {
        // Explicitly ensure video modal is hidden for audio flows
        setShowVideoCall(false);
        if (incomingParam) {
          // Incoming call: Start ringtone and render UI
          console.log('📞 [CallScreen] Starting ringtone for incoming audio call');
          try {
            await ringtoneService.start();
            console.log('✅ [CallScreen] Ringtone started successfully');
          } catch (ringtoneError) {
            console.error('❌ [CallScreen] Failed to start ringtone:', ringtoneError);
          }
          setShowAudioCall(true);
        } else {
          // Outgoing call - show UI immediately, let AudioCall component handle initialization
          // (do NOT call initialize() here -- AudioCall.tsx does its own initialization
          //  on the same singleton, which would cause a double getUserMedia race)
          setShowAudioCall(true);
        }
      } else if (normalizedCallType === 'video') {
        // Explicitly ensure audio modal is hidden for video flows
        setShowAudioCall(false);
        if (incomingParam) {
          // Incoming call: Start ringtone and render UI
          console.log('📞 [CallScreen] Starting ringtone for incoming video call');
          try {
            await ringtoneService.start();
            console.log('✅ [CallScreen] Ringtone started successfully');
          } catch (ringtoneError) {
            console.error('❌ [CallScreen] Failed to start ringtone:', ringtoneError);
          }
          setShowVideoCall(true);
        } else {
          // Outgoing call - always use the singleton instance so UI + service share state
          videoCallService.current = VideoCallService.getInstance();
          await videoCallService.current.initialize(
            appointmentId,
            userId,
            String(doctorId || ''),
            {
              onCallEnded: () => {
                console.log('📹 Video call ended');
                handleCallEnd();
              },
              onCallTimeout: () => {
                console.log('📹 Video call timeout');
                handleCallTimeout();
              },
              onCallRejected: (rejectedBy?: string) => {
                console.log('📹 Video call rejected');
                handleCallRejected(rejectedBy);
              },
              onRemoteStream: () => {
                console.log('📹 Remote video stream received');
              },
              onStateChange: (state) => {
                console.log('📹 Video call state changed:', state);
              }
            }
          );

          // The call starts automatically after initialization
          setShowVideoCall(true);
        }
      }

      setIsInitialized(true);

      // Clear timeout on successful initialization
      if (initTimeout) clearTimeout(initTimeout);
    } catch (error) {
      console.error('❌ Error initializing call:', error);
      setError('Failed to initialize call. Please try again.');
      if (initTimeout) clearTimeout(initTimeout);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallEnd = async () => {
    // Stop ringtone if playing
    try {
      await ringtoneService.stop();
      console.log('🔕 Ringtone stopped');
    } catch (error) {
      console.error('❌ Failed to stop ringtone:', error);
    }

    // Clean up call services - MUST await to ensure cleanup completes before navigation
    if (audioCallService.current) {
      await audioCallService.current.endCall();
    }
    if (videoCallService.current) {
      await videoCallService.current.endCall();
    }

    // Navigate back to the correct dashboard based on role
    const isDoctorUser = user?.user_type === 'doctor';
    router.replace(isDoctorUser ? '/doctor-dashboard' : '/patient-dashboard');
  };

  const handleCallTimeout = () => {
    Alert.alert(
      'Call Timeout',
      'The doctor did not answer the call. Please try again later.',
      [
        {
          text: 'OK',
          onPress: () => {
            const isDoctorUser = user?.user_type === 'doctor';
            router.replace(isDoctorUser ? '/doctor-dashboard' : '/patient-dashboard');
          }
        }
      ]
    );
  };

  const handleCallRejected = (rejectedBy?: string) => {
    const isCallerView = !isIncomingCall;

    if (isCallerView) {
      Alert.alert('Call Declined', 'The doctor declined the call.');
    } else {
      Alert.alert('Call Declined', 'You declined the call.');
    }

    const isDoctorUser = user?.user_type === 'doctor';
    router.replace(isDoctorUser ? '/doctor-dashboard' : '/patient-dashboard');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            {callType === 'audio' ? 'Connecting to audio call...' : 'Connecting to video call...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Call Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => {
              const isDoctorUser = user?.user_type === 'doctor';
              router.replace(isDoctorUser ? '/doctor-dashboard' : '/patient-dashboard');
            }}
          >
            <Text style={styles.exitButtonText}>Exit Call</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          headerBackVisible: false,
          gestureEnabled: false, // Disable iOS swipe-back gesture
        }}
      />
      {normalizedCallType === 'audio' && showAudioCall && (
        <AudioCall
          appointmentId={String(sessionId)}
          userId={user?.id.toString() || ''}
          isDoctor={user?.user_type === 'doctor'}
          doctorId={String(doctorId || '')}
          doctorName={doctorName as string || 'Doctor'}
          patientName={user?.user_type === 'doctor' ? 'Patient' : (user?.display_name || `${user?.first_name} ${user?.last_name}`)}
          otherParticipantProfilePictureUrl={doctorProfilePicture as string}
          onEndCall={handleCallEnd}
          onCallTimeout={handleCallTimeout}
          onCallRejected={handleCallRejected}
          isIncomingCall={isIncomingCall}
          autoAcceptFromSystemUI={isFromCallKeep && isIncomingCall}
        />
      )}

      {normalizedCallType === 'video' && showVideoCall && (
        <>
          {console.log('🔍 [CallScreen] Rendering VideoCallModal with props:', {
            appointmentId: String(sessionId),
            userId: user?.id.toString() || '',
            doctorId: String(doctorId || ''),
            doctorName: doctorName as string || 'Doctor',
            isDoctor: user?.user_type === 'doctor',
            isIncomingCall
          })}
          <VideoCallModal
            appointmentId={String(sessionId)}
            userId={user?.id.toString() || ''}
            isDoctor={user?.user_type === 'doctor'}
            doctorId={String(doctorId || '')}
            doctorName={doctorName as string || 'Doctor'}
            patientName={user?.user_type === 'doctor' ? 'Patient' : (user?.display_name || `${user?.first_name} ${user?.last_name}`)}
            otherParticipantProfilePictureUrl={doctorProfilePicture as string}
            onEndCall={handleCallEnd}
            onCallTimeout={handleCallTimeout}
            onCallRejected={handleCallRejected}
            onCallAnswered={() => {
              console.log('📹 Video call answered');
            }}
            isIncomingCall={isIncomingCall}
            autoAcceptFromSystemUI={isFromCallKeep && isIncomingCall}
            onAcceptCall={() => {
              console.log('📹 Video call accepted');
            }}
            onRejectCall={() => {
              console.log('📹 Video call rejected');
              handleCallRejected();
            }}
          />
        </>
      )}
    </SafeAreaView>
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
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  errorTitle: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  exitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
