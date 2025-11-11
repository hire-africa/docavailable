import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: AlertButton[];
  cancelable?: boolean;
}

export default function CustomAlertDialog({ 
  visible, 
  onClose, 
  title, 
  message, 
  type = 'info',
  buttons = [{ text: 'OK' }],
  cancelable = true
}: CustomAlertDialogProps) {
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);
  
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
          icon: 'question-circle' as const,
          iconColor: '#007AFF',
          backgroundColor: '#E3F2FD',
          borderColor: '#007AFF'
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

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose();
  };

  const handleOverlayPress = () => {
    if (cancelable) {
      onClose();
    }
  };

  const getButtonStyle = (button: AlertButton, index: number) => {
    const isLast = index === buttons.length - 1;
    const baseStyle = [styles.button];

    if (buttons.length === 1) {
      // Single button - full width, colored
      return [
        ...baseStyle,
        styles.singleButton,
        { backgroundColor: iconColor }
      ];
    }

    if (buttons.length === 2) {
      // Two buttons - side by side
      if (button.style === 'cancel') {
        return [...baseStyle, styles.cancelButton];
      }
      if (button.style === 'destructive') {
        return [...baseStyle, styles.destructiveButton];
      }
      return [...baseStyle, styles.confirmButton, { backgroundColor: iconColor }];
    }

    // Multiple buttons - stacked
    return [
      ...baseStyle,
      styles.stackedButton,
      button.style === 'cancel' && styles.cancelButton,
      button.style === 'destructive' && styles.destructiveButton,
      button.style === 'default' && { backgroundColor: iconColor },
      !isLast && styles.buttonBorder
    ];
  };

  const getButtonTextStyle = (button: AlertButton) => {
    if (button.style === 'cancel') {
      return [styles.buttonText, styles.cancelButtonText];
    }
    if (button.style === 'destructive') {
      return [styles.buttonText, styles.destructiveButtonText];
    }
    return [styles.buttonText, styles.confirmButtonText];
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleOverlayPress}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleOverlayPress}
      >
        <Animated.View 
          style={[
            styles.dialog, 
            { 
              borderColor,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.iconContainer, { backgroundColor }]}>
            <FontAwesome name={icon} size={32} color={iconColor} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={buttons.length === 2 ? styles.buttonRowContainer : styles.buttonStackContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={getButtonStyle(button, index)}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.8}
              >
                <Text style={getButtonTextStyle(button)}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
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
  buttonRowContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonStackContainer: {
    width: '100%',
  },
  button: {
    paddingVertical: 14, 
    paddingHorizontal: 20,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  singleButton: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destructiveButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
  },
  stackedButton: {
    width: '100%',
    marginBottom: 8,
  },
  buttonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderRadius: 0,
    marginBottom: 0,
  },
  buttonText: { 
    fontWeight: '600',
    fontSize: 16
  },
  confirmButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: '#333',
  },
  destructiveButtonText: {
    color: '#fff',
  },
}); 
