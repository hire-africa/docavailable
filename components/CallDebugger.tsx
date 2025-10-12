import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AudioCallService } from '../services/audioCallService';
import { VideoCallService } from '../services/videoCallService';

export default function CallDebugger() {
  const [audioState, setAudioState] = useState('idle');
  const [videoState, setVideoState] = useState('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const testAudioCall = async () => {
    try {
      addLog('Starting audio call test...');
      setAudioState('testing');
      
      const service = AudioCallService.getInstance();
      await service.initialize('test_audio_123', 'test_user', 1, {
        onStateChange: (state) => {
          addLog(`Audio state: ${state.connectionState}`);
          setAudioState(state.connectionState);
        },
        onCallEnded: () => {
          addLog('Audio call ended');
          setAudioState('ended');
        },
        onError: (error) => {
          addLog(`Audio error: ${error}`);
          setAudioState('error');
        }
      });
      
      addLog('Audio call initialized successfully');
    } catch (error) {
      addLog(`Audio call failed: ${error.message}`);
      setAudioState('error');
    }
  };

  const testVideoCall = async () => {
    try {
      addLog('Starting video call test...');
      setVideoState('testing');
      
      const service = VideoCallService.getInstance();
      await service.initialize('test_video_123', 'test_user', 1, {
        onStateChange: (state) => {
          addLog(`Video state: ${state.connectionState}`);
          setVideoState(state.connectionState);
        },
        onCallEnded: () => {
          addLog('Video call ended');
          setVideoState('ended');
        },
        onError: (error) => {
          addLog(`Video error: ${error}`);
          setVideoState('error');
        }
      });
      
      addLog('Video call initialized successfully');
    } catch (error) {
      addLog(`Video call failed: ${error.message}`);
      setVideoState('error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testAudioCall}>
          <Text style={styles.buttonText}>Test Audio Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testVideoCall}>
          <Text style={styles.buttonText}>Test Video Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Audio: {audioState}</Text>
        <Text style={styles.statusText}>Video: {videoState}</Text>
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Debug Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
    </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  logsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#333',
  },
});
