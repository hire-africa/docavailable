import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type SessionType = 'text' | 'audio' | 'video';

interface SessionTypeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSessionType: (sessionType: SessionType) => void;
  doctorName: string;
}

export default function SessionTypeSelectionModal({
  visible,
  onClose,
  onSelectSessionType,
  doctorName,
}: SessionTypeSelectionModalProps) {
  const handleSelectType = (sessionType: SessionType) => {
    // Automatically proceed when an option is selected
    onSelectSessionType(sessionType);
  };

  const handleClose = () => {
    onClose();
  };

  const sessionTypes = [
    {
      type: 'text' as SessionType,
      title: 'Text Session',
      description: 'Chat with the doctor via text messages',
      icon: 'comment',
      color: '#4CAF50',
      details: 'Uses 1 text session per 10 minutes'
    },
    {
      type: 'audio' as SessionType,
      title: 'Audio Call',
      description: 'Voice call with the doctor',
      icon: 'phone',
      color: '#2196F3',
      details: 'Direct voice consultation'
    },
    {
      type: 'video' as SessionType,
      title: 'Video Call',
      description: 'Video call with the doctor',
      icon: 'video-camera',
      color: '#FF9800',
      details: 'Face-to-face consultation'
    }
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <FontAwesome name="times" size={20} color="#666" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <FontAwesome name="stethoscope" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.title}>Choose Session Type</Text>
            <Text style={styles.subtitle}>
              How would you like to consult with Dr. {doctorName}?
            </Text>
          </View>

          <View style={styles.content}>
            {sessionTypes.map((session) => (
              <TouchableOpacity
                key={session.type}
                style={styles.sessionCard}
                onPress={() => handleSelectType(session.type)}
                activeOpacity={0.7}
              >
                <View style={styles.sessionContent}>
                  <View style={[styles.iconWrapper, { backgroundColor: session.color + '15' }]}>
                    <FontAwesome name={session.icon} size={18} color={session.color} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>
                      {session.title}
                    </Text>
                    <Text style={styles.sessionDescription}>
                      {session.description}
                    </Text>
                    <Text style={styles.sessionDetails}>
                      {session.details}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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
    maxWidth: 380,
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
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8F0',
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sessionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  sessionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
    lineHeight: 16,
  },
  sessionDetails: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});