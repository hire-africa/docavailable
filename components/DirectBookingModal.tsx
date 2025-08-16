import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface DirectBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  doctorName: string;
  loading?: boolean;
}

export default function DirectBookingModal({
  visible,
  onClose,
  onConfirm,
  doctorName,
  loading = false,
}: DirectBookingModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for your session.');
      return;
    }
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome name="clock-o" size={32} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Start Direct Session</Text>
          
          <Text style={styles.subtitle}>
            You're about to start a direct session with Dr. {doctorName}
          </Text>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>How it works:</Text>
              
              <View style={styles.infoItem}>
                <FontAwesome name="comment" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>You'll be directed to the chat immediately</Text>
              </View>
              
              <View style={styles.infoItem}>
                <FontAwesome name="clock-o" size={16} color="#FF9500" />
                <Text style={styles.infoText}>Doctor has 90 seconds to respond</Text>
              </View>
              
              <View style={styles.infoItem}>
                <FontAwesome name="shield" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>You won't be charged if doctor doesn't respond in time</Text>
              </View>
              
              <View style={styles.infoItem}>
                <FontAwesome name="credit-card" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>Uses 1 text session per 10 minutes subscription</Text>
              </View>
            </View>

            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason for Session *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe your symptoms or reason for consultation..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {reason.length}/18 characters
              </Text>
            </View>

            <View style={styles.warningSection}>
              <FontAwesome name="exclamation-triangle" size={16} color="#FF9500" />
              <Text style={styles.warningText}>
                This is for urgent medical questions. For complex issues, please book a scheduled appointment.
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]} 
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Starting Session...' : 'Start Session'}
              </Text>
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
    maxHeight: '80%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  content: {
    maxHeight: 400,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: {
    fontSize: 12,
    color: '#8D6E63',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
