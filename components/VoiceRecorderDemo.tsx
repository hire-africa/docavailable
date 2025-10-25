import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { WhatsAppVoiceRecorder } from './WhatsAppVoiceRecorder';

export const VoiceRecorderDemo: React.FC = () => {
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const handleRecordingComplete = (uri: string) => {
    setRecordingUri(uri);
    Alert.alert('Recording Complete', `Voice message recorded: ${uri}`);
  };

  const handleRecordingCancel = () => {
    setRecordingUri(null);
    Alert.alert('Recording Cancelled', 'Voice recording was cancelled');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WhatsApp-like Voice Recorder</Text>
      <Text style={styles.subtitle}>Tap and hold to record, tap stop to finish</Text>
      
      <View style={styles.recorderContainer}>
        <WhatsAppVoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingCancel={handleRecordingCancel}
        />
      </View>

      {recordingUri && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            Recording URI: {recordingUri}
          </Text>
        </View>
      )}
    </View>
  );
};

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
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  recorderContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#25D366',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});
