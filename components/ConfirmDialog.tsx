import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  title?: string;
  type?: 'logout' | 'delete' | 'confirm' | 'warning' | 'info' | 'purchase' | 'appointment';
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({ 
  visible, 
  onConfirm, 
  onCancel, 
  message, 
  title,
  type = 'confirm',
  confirmText,
  cancelText = 'Cancel'
}: ConfirmDialogProps) {
  
  const getIconAndColors = () => {
    switch (type) {
      case 'logout':
        return {
          icon: 'sign-out' as const,
          iconColor: '#4CAF50',
          confirmBg: '#4CAF50',
          confirmText: confirmText || 'Logout'
        };
      case 'delete':
        return {
          icon: 'trash' as const,
          iconColor: '#FF3B30',
          confirmBg: '#FF3B30',
          confirmText: confirmText || 'Delete'
        };
      case 'warning':
        return {
          icon: 'exclamation-triangle' as const,
          iconColor: '#FF9500',
          confirmBg: '#FF9500',
          confirmText: confirmText || 'Continue'
        };
      case 'info':
        return {
          icon: 'info-circle' as const,
          iconColor: '#007AFF',
          confirmBg: '#007AFF',
          confirmText: confirmText || 'OK'
        };
      case 'purchase':
        return {
          icon: 'credit-card' as const,
          iconColor: '#4CAF50',
          confirmBg: '#4CAF50',
          confirmText: confirmText || 'Purchase'
        };
      case 'appointment':
        return {
          icon: 'calendar' as const,
          iconColor: '#4CAF50',
          confirmBg: '#4CAF50',
          confirmText: confirmText || 'Book'
        };
      default:
        return {
          icon: 'question-circle' as const,
          iconColor: '#4CAF50',
          confirmBg: '#4CAF50',
          confirmText: confirmText || 'Confirm'
        };
    }
  };

  const { icon, iconColor, confirmBg, confirmText: finalConfirmText } = getIconAndColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome name={icon} size={32} color={iconColor} />
          </View>
          
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: confirmBg }]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{finalConfirmText}</Text>
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
    backgroundColor: '#F8F9FA',
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    minWidth: 100,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
}); 