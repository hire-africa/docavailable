import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AudioCall from '../components/AudioCall';
import VideoCallModal from '../components/VideoCallModal';
import { useAuth } from '../contexts/AuthContext';
import { AudioCallService } from '../services/audioCallService';
import { VideoCallService } from '../services/videoCallService';

export default function CallScreen() {
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
    isDirectSession
  } = params;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);

  // Call services
  const audioCallService = useRef<AudioCallService | null>(null);
  const videoCallService = useRef<VideoCallService | null>(null);

  useEffect(() => {
    initializeCall();
  }, []);

  const initializeCall = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!sessionId || !doctorId || !callType) {
        setError('Missing required call parameters');
        return;
      }

      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Create appointment ID for the call (using session ID)
      const appointmentId = `direct_session_${sessionId}`;
      const userId = user.id.toString();
      const isDoctor = user.user_type === 'doctor';

      console.log('📞 Initializing call:', {
        appointmentId,
        userId,
        isDoctor,
        callType,
        doctorName,
        sessionId
      });

      if (callType === 'audio') {
        // Initialize audio call
        audioCallService.current = AudioCallService.getInstance();
        await audioCallService.current.initialize(
          appointmentId,
          userId,
          {
            onCallAnswered: () => {
              console.log('📞 Audio call answered');
              setShowAudioCall(true);
            },
            onCallEnded: () => {
              console.log('📞 Audio call ended');
              handleCallEnd();
            },
            onCallTimeout: () => {
              console.log('📞 Audio call timeout');
              handleCallTimeout();
            },
            onCallRejected: () => {
              console.log('📞 Audio call rejected');
              handleCallRejected();
            },
            onRemoteStream: () => {
              console.log('📞 Remote audio stream received');
            },
            onStateChange: (state) => {
              console.log('📞 Audio call state changed:', state);
            }
          }
        );

        // The call starts automatically after initialization
        setShowAudioCall(true);
      } else if (callType === 'video') {
        // Initialize video call
        videoCallService.current = new VideoCallService();
        await videoCallService.current.initialize(
          appointmentId,
          userId,
          {
            onCallAnswered: () => {
              console.log('📹 Video call answered');
              setShowVideoCall(true);
            },
            onCallEnded: () => {
              console.log('📹 Video call ended');
              handleCallEnd();
            },
            onCallTimeout: () => {
              console.log('📹 Video call timeout');
              handleCallTimeout();
            },
            onCallRejected: () => {
              console.log('📹 Video call rejected');
              handleCallRejected();
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

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error initializing call:', error);
      setError('Failed to initialize call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallEnd = () => {
    // Clean up call services
    if (audioCallService.current) {
      audioCallService.current.endCall();
    }
    if (videoCallService.current) {
      videoCallService.current.endCall();
    }

    // Navigate back to patient dashboard
    router.replace('/patient-dashboard');
  };

  const handleCallTimeout = () => {
    Alert.alert(
      'Call Timeout',
      'The doctor did not answer the call. Please try again later.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/patient-dashboard')
        }
      ]
    );
  };

  const handleCallRejected = () => {
    Alert.alert(
      'Call Rejected',
      'The doctor is not available right now. Please try again later.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/patient-dashboard')
        }
      ]
    );
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
          <Text style={styles.retryText} onPress={() => router.back()}>
            Go Back
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {callType === 'audio' && showAudioCall && (
        <AudioCall
          appointmentId={`direct_session_${sessionId}`}
          userId={user?.id.toString() || ''}
          isDoctor={user?.user_type === 'doctor'}
          doctorName={doctorName as string || 'Doctor'}
          patientName={user?.user_type === 'doctor' ? 'Patient' : (user?.display_name || `${user?.first_name} ${user?.last_name}`)}
          otherParticipantProfilePictureUrl={doctorProfilePicture as string}
          onEndCall={handleCallEnd}
          onCallTimeout={handleCallTimeout}
          onCallRejected={handleCallRejected}
        />
      )}

      {callType === 'video' && showVideoCall && (
        <VideoCallModal
          appointmentId={`direct_session_${sessionId}`}
          userId={user?.id.toString() || ''}
          isDoctor={user?.user_type === 'doctor'}
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
          onAcceptCall={() => {
            console.log('📹 Video call accepted');
          }}
          onRejectCall={() => {
            console.log('📹 Video call rejected');
            handleCallRejected();
          }}
        />
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
});
