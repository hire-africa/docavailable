import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface MessageRead {
  user_id: number;
  user_name: string;
  read_at: string;
}

interface MessageDeliveryStatusProps {
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  isOwnMessage: boolean;
  readBy?: MessageRead[];
  style?: any;
}

export default function MessageDeliveryStatus({ 
  deliveryStatus = 'sending', 
  isOwnMessage, 
  readBy = [],
  style 
}: MessageDeliveryStatusProps) {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  
  if (!isOwnMessage) {
    return null; // Only show delivery status for own messages
  }

  // Show loading state when marking as read
  useEffect(() => {
    if (deliveryStatus === 'delivered' && readBy.length === 0) {
      setIsMarkingAsRead(true);
      const timer = setTimeout(() => {
        setIsMarkingAsRead(false);
      }, 2000); // Show loading for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [deliveryStatus, readBy.length]);

  const getStatusIcon = () => {
    if (isMarkingAsRead) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={8} color="rgba(255,255,255,0.7)" />
        </View>
      );
    }

    switch (deliveryStatus) {
      case 'sending':
        return (
          <View style={styles.sendingContainer}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        );
      case 'sent':
        return (
          <View style={styles.sentContainer}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        );
      case 'delivered':
        return (
          <View style={styles.deliveredContainer}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" style={styles.secondCheck} />
          </View>
        );
      case 'read':
        return (
          <View style={styles.readContainer}>
            <Ionicons name="checkmark" size={12} color="#4CAF50" />
            <Ionicons name="checkmark" size={12} color="#4CAF50" style={styles.secondCheck} />
          </View>
        );
      default:
        return null;
    }
  };

  const getReadReceipts = () => {
    if (readBy.length === 0) return null;

    return (
      <View style={styles.readReceiptsContainer}>
        {readBy.map((read, index) => (
          <Text key={read.user_id} style={styles.readReceiptText}>
            {read.user_name}
            {index < readBy.length - 1 ? ', ' : ''}
          </Text>
        ))}
        <Text style={styles.readReceiptText}> read</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {getStatusIcon()}
      {getReadReceipts()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondCheck: {
    marginLeft: -8, // Overlap the checkmarks slightly
  },
  readReceiptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  readReceiptText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
}); 