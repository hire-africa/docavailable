import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface MessageContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  isMyMessage: boolean;
}

const { height } = Dimensions.get('window');

export default function MessageContextMenu({ 
  visible, 
  onClose, 
  onAction, 
  isMyMessage 
}: MessageContextMenuProps) {
  const actions = [
    {
      id: 'copy',
      icon: 'copy',
      label: 'Copy',
      color: '#4CAF50'
    },
    {
      id: 'reply',
      icon: 'reply',
      label: 'Reply',
      color: '#2196F3'
    },
    {
      id: 'forward',
      icon: 'share',
      label: 'Forward',
      color: '#FF9800'
    }
  ];

  if (isMyMessage) {
    actions.push({
      id: 'delete',
      icon: 'trash',
      label: 'Delete',
      color: '#F44336'
    });
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <BlurView intensity={20} style={styles.blurContainer}>
            <View style={styles.handle} />
            
            <View style={styles.actionsContainer}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionButton}
                  onPress={() => {
                    onAction(action.id);
                    onClose();
                  }}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                    <FontAwesome name={action.icon as any} size={18} color="white" />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: height * 0.4,
  },
  blurContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 80,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
}); 