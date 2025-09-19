import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { VideoCallService, VideoCallState } from '../services/videoCallService';

export default function VideoCallTest() {
  const [callState, setCallState] = useState<VideoCallState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [videoCallService, setVideoCallService] = useState<VideoCallService | null>(null);

  const initializeVideoCall = async () => {
    try {
      const service = VideoCallService.getInstance();
      
      const events = {
        onStateChange: (state: VideoCallState) => {
          setCallState(state);
          console.log('📹 Video call state changed:', state);
        },
        onRemoteStream: (stream: any) => {
          console.log('📹 Remote video stream received:', stream);
        },
        onCallEnded: () => {
          console.log('📹 Video call ended');
          Alert.alert('Call Ended', 'The video call has ended.');
        },
        onCallRejected: () => {
          console.log('📹 Video call rejected');
          Alert.alert('Call Rejected', 'The video call was rejected.');
        },
        onCallTimeout: () => {
          console.log('📹 Video call timeout');
          Alert.alert('Call Timeout', 'The video call timed out.');
        },
      };

      await service.initialize('test-appointment-123', 'test-user-456', events);
      setVideoCallService(service);
      setIsInitialized(true);
      
      Alert.alert('Success', 'Video call service initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing video call:', error);
      Alert.alert('Error', `Failed to initialize video call: ${error}`);
    }
  };

  const createOffer = async () => {
    if (!videoCallService) {
      Alert.alert('Error', 'Video call service not initialized');
      return;
    }

    try {
      await videoCallService.createOffer();
      Alert.alert('Success', 'Video call offer created and sent!');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      Alert.alert('Error', `Failed to create offer: ${error}`);
    }
  };

  const toggleAudio = () => {
    if (videoCallService) {
      videoCallService.toggleAudio();
    }
  };

  const toggleVideo = () => {
    if (videoCallService) {
      videoCallService.toggleVideo();
    }
  };

  const switchCamera = async () => {
    if (videoCallService) {
      await videoCallService.switchCamera();
    }
  };

  const endCall = () => {
    if (videoCallService) {
      videoCallService.endCall();
      setVideoCallService(null);
      setIsInitialized(false);
      setCallState(null);
    }
  };

  const reset = async () => {
    if (videoCallService) {
      await videoCallService.reset();
      setVideoCallService(null);
      setIsInitialized(false);
      setCallState(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Video Call Test</Text>
      
      {callState && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Call State:</Text>
          <Text>Connected: {callState.isConnected ? 'Yes' : 'No'}</Text>
          <Text>Audio Enabled: {callState.isAudioEnabled ? 'Yes' : 'No'}</Text>
          <Text>Video Enabled: {callState.isVideoEnabled ? 'Yes' : 'No'}</Text>
          <Text>Front Camera: {callState.isFrontCamera ? 'Yes' : 'No'}</Text>
          <Text>Duration: {videoCallService?.getFormattedDuration() || '00:00'}</Text>
          <Text>Connection: {callState.connectionState}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={initializeVideoCall}
          disabled={isInitialized}
        >
          <Text style={styles.buttonText}>
            {isInitialized ? 'Initialized' : 'Initialize Video Call'}
          </Text>
        </TouchableOpacity>

        {isInitialized && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={createOffer}
            >
              <Text style={styles.buttonText}>Create Offer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.controlButton]}
              onPress={toggleAudio}
            >
              <Text style={styles.buttonText}>
                {callState?.isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.controlButton]}
              onPress={toggleVideo}
            >
              <Text style={styles.buttonText}>
                {callState?.isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.controlButton]}
              onPress={switchCamera}
            >
              <Text style={styles.buttonText}>Switch Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={endCall}
            >
              <Text style={styles.buttonText}>End Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.warningButton]}
              onPress={reset}
            >
              <Text style={styles.buttonText}>Reset Service</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  stateContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  controlButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  warningButton: {
    backgroundColor: '#9C27B0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
