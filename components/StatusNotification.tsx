import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StatusNotificationProps {
  appointmentId: string;
  status: string;
  doctorName: string;
  date: string;
  time: string;
  onDismiss: () => void;
  visible: boolean;
}

export default function StatusNotification({
  appointmentId,
  status,
  doctorName,
  date,
  time,
  onDismiss,
  visible
}: StatusNotificationProps) {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animation, onDismiss]);

  const getStatusInfo = () => {
    switch (status) {
      case 'confirmed':
        return {
          icon: 'check-circle',
          color: '#4CAF50',
          title: 'Appointment Confirmed!',
          message: `Your appointment with ${doctorName} has been confirmed.`
        };
      case 'cancelled':
        return {
          icon: 'times-circle',
          color: '#F44336',
          title: 'Appointment Cancelled',
          message: `Your appointment with ${doctorName} has been cancelled.`
        };
      default:
        return {
          icon: 'info-circle',
          color: '#2196F3',
          title: 'Status Update',
          message: `Your appointment status has been updated to ${status}.`
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: statusInfo.color }]}>
        <FontAwesome name={statusInfo.icon as any} size={20} color="#fff" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{statusInfo.title}</Text>
        <Text style={styles.message}>{statusInfo.message}</Text>
        <Text style={styles.details}>{date} at {time}</Text>
      </View>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <FontAwesome name="times" size={16} color="#666" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: '#999',
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 