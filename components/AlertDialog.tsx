import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'processing';
  buttonText?: string;
}

export default function AlertDialog({ 
  visible, 
  onClose, 
  title, 
  message, 
  type = 'info',
  buttonText = 'OK'
}: AlertDialogProps) {
  
  const spinValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (type === 'processing' && visible) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
    } else {
      spinValue.setValue(0);
    }
  }, [type, visible, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle' as const,
          iconColor: '#4CAF50',
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50'
        };
      case 'error':
        return {
          icon: 'times-circle' as const,
          iconColor: '#FF3B30',
          backgroundColor: '#FFEBEE',
          borderColor: '#FF3B30'
        };
      case 'warning':
        return {
          icon: 'exclamation-triangle' as const,
          iconColor: '#FF9500',
          backgroundColor: '#FFF8E1',
          borderColor: '#FF9500'
        };
      case 'confirm':
        return {
          icon: 'sign-out' as const,
          iconColor: '#4CAF50',
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50'
        };
      case 'processing':
        return {
          icon: 'spinner' as const,
          iconColor: '#4CAF50',
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50'
        };
      case 'info':
      default:
        return {
          icon: 'info-circle' as const,
          iconColor: '#007AFF',
          backgroundColor: '#E3F2FD',
          borderColor: '#007AFF'
        };
    }
  };

  const { icon, iconColor, backgroundColor, borderColor } = getIconAndColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.dialog, { borderColor }]}>
          <View style={[styles.iconContainer, { backgroundColor }]}>
            {type === 'processing' ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <FontAwesome name={icon} size={32} color={iconColor} />
              </Animated.View>
            ) : (
              <FontAwesome name={icon} size={32} color={iconColor} />
            )}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          <Text style={styles.message}>{message}</Text>
          
          {type !== 'processing' && (
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: iconColor }]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>
          )}
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
  button: {
    paddingVertical: 14, 
    paddingHorizontal: 32,
    borderRadius: 12, 
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16
  }
}); 