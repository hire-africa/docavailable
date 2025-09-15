import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onBuySessions: () => void;
}

export default function SubscriptionModal({ 
  visible, 
  onClose, 
  onBuySessions 
}: SubscriptionModalProps) {
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <FontAwesome name="exclamation-triangle" size={32} color="#FF9500" />
          </View>
          
          <Text style={styles.title}>No Text Sessions Available</Text>
          
          <Text style={styles.message}>
            You don't have enough text sessions to continue. Please purchase a subscription plan to access our healthcare services.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.buyButton} 
              onPress={onBuySessions}
            >
              <Text style={styles.buyButtonText}>Buy Sessions</Text>
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
    borderWidth: 2,
    borderColor: '#FF9500',
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
    backgroundColor: '#FFF8E1',
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
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderRadius: 12, 
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: { 
    color: '#666', 
    fontWeight: '600',
    fontSize: 16
  },
  buyButton: {
    flex: 1,
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderRadius: 12, 
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyButtonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16
  }
}); 