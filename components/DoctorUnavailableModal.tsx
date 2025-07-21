import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface DoctorUnavailableModalProps {
  visible: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  onBookAppointment: () => void;
  doctorName: string;
}

export default function DoctorUnavailableModal({
  visible,
  onClose,
  onTryAgain,
  onBookAppointment,
  doctorName,
}: DoctorUnavailableModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome name="exclamation-triangle" size={32} color="#FF9500" />
          </View>
          
          <Text style={styles.title}>Doctor Might Be Unavailable</Text>
          
          <Text style={styles.message}>
            Dr. {doctorName} hasn't responded within 90 seconds. They might be busy or temporarily unavailable.
          </Text>

          <View style={styles.suggestions}>
            <View style={styles.suggestionItem}>
              <FontAwesome name="clock-o" size={16} color="#666" />
              <Text style={styles.suggestionText}>Try again in a few minutes</Text>
            </View>
            <View style={styles.suggestionItem}>
              <FontAwesome name="calendar" size={16} color="#666" />
              <Text style={styles.suggestionText}>Book a scheduled appointment</Text>
            </View>
            <View style={styles.suggestionItem}>
              <FontAwesome name="search" size={16} color="#666" />
              <Text style={styles.suggestionText}>Find another available doctor</Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.tryAgainButton} 
              onPress={onTryAgain}
            >
              <FontAwesome name="refresh" size={16} color="white" />
              <Text style={styles.tryAgainButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity 
              style={styles.bookAppointmentButton} 
              onPress={onBookAppointment}
            >
              <FontAwesome name="calendar" size={16} color="#4CAF50" />
              <Text style={styles.bookAppointmentButtonText}>Book Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 20,
  },
  suggestions: {
    width: '100%',
    marginBottom: 24,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  tryAgainButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButtons: {
    width: '100%',
  },
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 8,
  },
  bookAppointmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
}); 