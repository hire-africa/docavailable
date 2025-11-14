import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SessionEndModalProps {
  visible: boolean;
  onClose: () => void;
  onEndSession: () => void;
  onContinue: () => void;
  sessionType: 'instant' | 'appointment';
  remainingTime?: number;
}

export default function SessionEndModal({
  visible,
  onClose,
  onEndSession,
  onContinue,
  sessionType,
  remainingTime,
}: SessionEndModalProps) {
  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: onEndSession,
        },
      ]
    );
  };

  const handleContinue = () => {
    onContinue();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome 
              name={sessionType === 'instant' ? 'clock-o' : 'calendar'} 
              size={32} 
              color="#FF9500" 
            />
          </View>
          
          <Text style={styles.title}>End Session?</Text>
          
          <Text style={styles.message}>
            {sessionType === 'instant' 
              ? 'You are about to leave this instant chat session. You can continue chatting or end the session now.'
              : 'You are about to leave this appointment session. You can continue or end the session now.'
            }
          </Text>

          {remainingTime && remainingTime > 0 && (
            <View style={styles.timeInfo}>
              <FontAwesome name="clock-o" size={16} color="#666" />
              <Text style={styles.timeText}>
                {Math.floor(remainingTime / 60)}m {remainingTime % 60}s remaining
              </Text>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.endSessionButton} 
            onPress={handleEndSession}
          >
            <FontAwesome name="stop" size={16} color="#FF3B30" />
            <Text style={styles.endSessionButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  endSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  endSessionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
}); 