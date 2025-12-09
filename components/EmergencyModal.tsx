import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EmergencyModal({ visible, onClose }: EmergencyModalProps) {
  
  const handleEmergencyServices = () => {
    onClose();
    Linking.openURL('tel:998');
  };

  const handleAmbulance = () => {
    onClose();
    Linking.openURL('tel:997');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Emergency Icon */}
          <View style={styles.iconContainer}>
            <FontAwesome name="exclamation-triangle" size={32} color="#FF3B30" />
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Emergency Contact</Text>
          
          {/* Message */}
          <Text style={styles.message}>
            For medical emergencies, please contact emergency services immediately:
          </Text>
          
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Emergency Services Button */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.emergencyButton]} 
              onPress={handleEmergencyServices}
            >
              <View style={styles.buttonContent}>
                <FontAwesome name="phone" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.emergencyButtonText}>Emergency Services</Text>
              </View>
              <Text style={styles.buttonSubtext}>Call 998</Text>
            </TouchableOpacity>

            {/* Ambulance Button */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.ambulanceButton]} 
              onPress={handleAmbulance}
            >
              <View style={styles.buttonContent}>
                <FontAwesome name="ambulance" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.emergencyButtonText}>Ambulance</Text>
              </View>
              <Text style={styles.buttonSubtext}>Call 997</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20
  },
  dialog: {
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    width: Platform.OS === 'web' ? 400 : '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center'
  },
  message: {
    fontSize: 16, 
    color: '#666', 
    marginBottom: 24, 
    textAlign: 'center',
    lineHeight: 22
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
  },
  ambulanceButton: {
    backgroundColor: '#FF6B35',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    minWidth: 120,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  }
});
