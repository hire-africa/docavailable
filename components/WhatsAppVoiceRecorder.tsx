import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { voiceRecordingService } from '../services/voiceRecordingService';

const { width: screenWidth } = Dimensions.get('window');

interface WhatsAppVoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingCancel: () => void;
  disabled?: boolean;
}

export const WhatsAppVoiceRecorder: React.FC<WhatsAppVoiceRecorderProps> = ({
  onRecordingComplete,
  onRecordingCancel,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const waveformAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Animated waveform bars
  const waveformBars = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start waveform animation
      startWaveformAnimation();
      
      // Start pulse animation for the record button
      startPulseAnimation();
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      stopWaveformAnimation();
      stopPulseAnimation();
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isRecording]);

  const startWaveformAnimation = () => {
    const animateBars = () => {
      waveformBars.forEach((bar, index) => {
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: 150 + Math.random() * 100,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 150 + Math.random() * 100,
            useNativeDriver: false,
          }),
        ]).start();
      });
      
      if (isRecording) {
        setTimeout(animateBars, 200);
      }
    };
    animateBars();
  };

  const stopWaveformAnimation = () => {
    waveformBars.forEach(bar => {
      bar.setValue(0.3);
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.setValue(1);
  };

  const startRecording = async () => {
    try {
      const success = await voiceRecordingService.startRecording();
      if (success) {
        setIsRecording(true);
        setRecordingDuration(0);
        setRecordingUri(null);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      const uri = await voiceRecordingService.stopRecording();
      if (uri) {
        setRecordingUri(uri);
        setIsRecording(false);
        onRecordingComplete(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordingUri(null);
    onRecordingCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  if (recordingUri && !isRecording) {
    // Recording preview UI
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewContent}>
          <Ionicons name="mic" size={24} color="#25D366" style={styles.previewIcon} />
          <Text style={styles.previewText}>Voice message ready</Text>
        </View>
        <View style={styles.previewActions}>
          <TouchableOpacity
            onPress={cancelRecording}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isRecording) {
    // Recording UI
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingContent}>
          {/* Recording indicator and duration */}
          <View style={styles.recordingInfo}>
            <View style={styles.recordingIndicator} />
            <Text style={styles.recordingDuration}>
              {formatDuration(recordingDuration)}
            </Text>
          </View>

          {/* Waveform */}
          <View style={styles.waveformContainer}>
            {waveformBars.map((bar, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: bar.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 20],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            ))}
          </View>

          {/* Cancel hint */}
          <Text style={styles.cancelHint}>Tap to stop recording</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            onPress={cancelRecording}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={stopRecording}
            style={[styles.recordButton, styles.stopButton]}
          >
            <Ionicons name="stop" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default state - show record button
  return (
    <View style={styles.defaultContainer}>
      <TouchableOpacity
        onPress={startRecording}
        disabled={disabled}
        style={[
          styles.recordButton,
          styles.startButton,
          disabled && styles.disabledButton,
        ]}
      >
        <Animated.View
          style={{
            transform: [{ scale: pulseAnimation }],
          }}
        >
          <Ionicons 
            name="mic" 
            size={24} 
            color={disabled ? "#999" : "#25D366"} 
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  defaultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recordingContent: {
    flex: 1,
    alignItems: 'center',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
    marginRight: 12,
  },
  recordingDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    marginBottom: 8,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#25D366',
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  cancelHint: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recordButtonContainer: {
    marginLeft: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButton: {
    backgroundColor: '#25D366',
  },
  stopButton: {
    backgroundColor: '#ff4444',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    marginRight: 12,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  previewActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
});
