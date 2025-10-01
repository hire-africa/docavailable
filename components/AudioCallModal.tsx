import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AudioCall from './AudioCall';

interface AudioCallModalProps {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  doctorId?: string | number;
  doctorName?: string;
  patientName?: string;
  otherParticipantProfilePictureUrl?: string;
  isIncomingCall?: boolean;
  onCallTimeout?: () => void;
  onCallRejected?: () => void;
}

export default function AudioCallModal({
  visible,
  onClose,
  appointmentId,
  userId,
  isDoctor,
  doctorId,
  doctorName,
  patientName,
  otherParticipantProfilePictureUrl,
  isIncomingCall = false,
  onCallTimeout,
  onCallRejected,
}: AudioCallModalProps) {
  const [showAudioCall, setShowAudioCall] = useState(false);

  const handleStartCall = () => {
    setShowAudioCall(true);
  };

  const handleEndCall = () => {
    setShowAudioCall(false);
    onClose();
  };

  const handleCallTimeout = () => {
    setShowAudioCall(false);
    onCallTimeout?.();
  };

  const handleCallRejected = () => {
    setShowAudioCall(false);
    onCallRejected?.();
  };

  // For incoming calls, skip the modal and go directly to AudioCall
  if (isIncomingCall) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleEndCall}
        statusBarTranslucent={true}
      >
        <AudioCall
          appointmentId={appointmentId}
          userId={userId}
          isDoctor={isDoctor}
          doctorId={doctorId}
          doctorName={doctorName}
          patientName={patientName}
          otherParticipantProfilePictureUrl={otherParticipantProfilePictureUrl}
          onEndCall={handleEndCall}
          isIncomingCall={isIncomingCall}
        />
      </Modal>
    );
  }

  if (showAudioCall) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleEndCall}
        statusBarTranslucent={true}
      >
        <AudioCall
          appointmentId={appointmentId}
          userId={userId}
          isDoctor={isDoctor}
          doctorId={doctorId}
          doctorName={doctorName}
          patientName={patientName}
          otherParticipantProfilePictureUrl={otherParticipantProfilePictureUrl}
          onEndCall={handleEndCall}
          onCallTimeout={handleCallTimeout}
          onCallRejected={handleCallRejected}
        />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Start Audio Call</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome name="phone" size={48} color="#4CAF50" />
            </View>
            
            <Text style={styles.description}>
              Start an audio call with {isDoctor ? patientName : doctorName}
            </Text>
            
            <Text style={styles.note}>
              Make sure you have a stable internet connection for the best call quality.
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartCall}
            >
              <FontAwesome name="phone" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.startButtonText}>Start Call</Text>
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
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
