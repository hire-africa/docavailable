import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AudioCall from './AudioCall';

export default function AudioCallTest() {
  const [showAudioCall, setShowAudioCall] = useState(false);

  const startTestCall = () => {
    Alert.alert(
      'Start Test Call',
      'This will start a test audio call. Make sure the signaling server is running.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Call', 
          onPress: () => setShowAudioCall(true)
        }
      ]
    );
  };

  if (showAudioCall) {
    return (
      <AudioCall
        appointmentId="test_appointment_123"
        userId="test_user_456"
        isDoctor={true}
        doctorName="Test Doctor"
        patientName="Test Patient"
        onEndCall={() => setShowAudioCall(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="phone" size={64} color="#4CAF50" />
        </View>
        
        <Text style={styles.title}>Audio Call Test</Text>
        <Text style={styles.description}>
          Test the audio call functionality. Make sure the WebRTC signaling server is running on port 8080.
        </Text>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Setup Instructions:</Text>
          <Text style={styles.instructionText}>1. Start the signaling server: npm run signaling:start</Text>
          <Text style={styles.instructionText}>2. Make sure you have microphone permissions</Text>
          <Text style={styles.instructionText}>3. Click "Start Test Call" below</Text>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={startTestCall}
        >
          <FontAwesome name="phone" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.startButtonText}>Start Test Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  instructions: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
