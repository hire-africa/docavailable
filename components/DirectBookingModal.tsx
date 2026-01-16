import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
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
import { SessionType } from './SessionTypeSelectionModal';

interface UserSubscription {
  id: string;
  plan_id: string;
  planName: string;
  plan_price: number;
  plan_currency: string;
  textSessionsRemaining: number;
  voiceCallsRemaining: number;
  videoCallsRemaining: number;
  totalTextSessions: number;
  totalVoiceCalls: number;
  totalVideoCalls: number;
  activatedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface DirectBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, sessionType: SessionType) => void;
  doctorName: string;
  sessionType: SessionType;
  loading?: boolean;
  subscription?: UserSubscription | null;
}

export default function DirectBookingModal({
  visible,
  onClose,
  onConfirm,
  doctorName,
  sessionType,
  loading = false,
  subscription,
}: DirectBookingModalProps) {

  const canStartSession = (): boolean => {
    if (!subscription || !subscription.isActive) {
      return false;
    }

    switch (sessionType) {
      case 'text':
        return (subscription.textSessionsRemaining || 0) > 0;
      case 'audio':
        return (subscription.voiceCallsRemaining || 0) > 0;
      case 'video':
        return (subscription.videoCallsRemaining || 0) > 0;
      default:
        return false;
    }
  };

  const handleConfirm = () => {
    if (!canStartSession()) {
      Alert.alert(
        'No Sessions Remaining', 
        `You have no ${sessionType === 'text' ? 'text sessions' : sessionType === 'audio' ? 'audio calls' : 'video calls'} remaining in your subscription. Please upgrade your plan or wait for renewal.`
      );
      return;
    }

    onConfirm('General consultation', sessionType);
  };

  const handleClose = () => {
    onClose();
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'text': return 'comment';
      case 'audio': return 'phone';
      case 'video': return 'video-camera';
      default: return 'comment';
    }
  };

  const getSessionColor = () => {
    switch (sessionType) {
      case 'text': return '#4CAF50';
      case 'audio': return '#2196F3';
      case 'video': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const getSessionInfo = () => {
    switch (sessionType) {
      case 'text':
        return {
          title: 'Text Session',
          items: [
            { icon: 'comment', text: 'You\'ll be directed to the chat immediately', color: '#4CAF50' },
            { icon: 'clock-o', text: 'Doctor has a response window to respond', color: '#FF9500' },
            { icon: 'shield', text: 'You won\'t be charged if doctor doesn\'t respond in time', color: '#4CAF50' },
            { icon: 'credit-card', text: 'Uses 1 text session per 10 minutes', color: '#4CAF50' }
          ]
        };
      case 'audio':
        return {
          title: 'Audio Call',
          items: [
            { icon: 'phone', text: 'You\'ll be connected via voice call immediately', color: '#2196F3' },
            { icon: 'clock-o', text: 'Doctor has 90 seconds to answer the call', color: '#FF9500' },
            { icon: 'shield', text: 'You won\'t be charged if doctor doesn\'t answer in time', color: '#4CAF50' },
            { icon: 'microphone', text: 'Direct voice consultation with the doctor', color: '#2196F3' }
          ]
        };
      case 'video':
        return {
          title: 'Video Call',
          items: [
            { icon: 'video-camera', text: 'You\'ll be connected via video call immediately', color: '#FF9800' },
            { icon: 'clock-o', text: 'Doctor has 90 seconds to answer the call', color: '#FF9500' },
            { icon: 'shield', text: 'You won\'t be charged if doctor doesn\'t answer in time', color: '#4CAF50' },
            { icon: 'eye', text: 'Face-to-face video consultation with the doctor', color: '#FF9800' }
          ]
        };
      default:
        return { title: 'Session', items: [] };
    }
  };

  const sessionInfo = getSessionInfo();
  const sessionColor = getSessionColor();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: sessionColor + '15' }]}>
              <FontAwesome name={getSessionIcon()} size={28} color={sessionColor} />
            </View>
            <Text style={styles.title}>Start {sessionInfo.title}</Text>
            <Text style={styles.subtitle}>
              You're about to start a {sessionType} session with Dr. {doctorName}
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>How it works:</Text>
              {sessionInfo.items.map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <FontAwesome name={item.icon as any} size={16} color={item.color} />
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </View>


            <View style={styles.warningSection}>
              <FontAwesome name="exclamation-triangle" size={16} color="#FF9500" />
              <Text style={styles.warningText}>
                This is for urgent medical questions. For complex issues, please book a scheduled appointment.
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                { backgroundColor: canStartSession() ? sessionColor : '#E0E0E0' }, 
                (loading || !canStartSession()) && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={loading || !canStartSession()}
            >
              <Text style={[
                styles.confirmButtonText,
                !canStartSession() && styles.confirmButtonTextDisabled
              ]}>
                {loading ? 'Starting Session...' : 
                 !canStartSession() ? 'No Sessions Remaining' : 
                 `Start ${sessionInfo.title}`}
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
    paddingHorizontal: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 24,
  },
  infoSection: {
    marginTop: 20,
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
    lineHeight: 18,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#8D6E63',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
});