import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ReadReceiptProps {
  isOwnMessage: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: Array<{
    user_id: number;
    user_name: string;
    read_at: string;
  }>;
  otherParticipantId?: number;
  showTime?: boolean;
  messageTime?: string;
}

const ReadReceipt: React.FC<ReadReceiptProps> = ({
  isOwnMessage,
  deliveryStatus,
  readBy = [],
  otherParticipantId,
  showTime = true,
  messageTime
}) => {
  if (!isOwnMessage) {
    // For messages from others, just show time if requested
    if (showTime && messageTime) {
      return (
        <View style={styles.container}>
          <Text style={[styles.timeText, { color: '#666' }]}>
            {new Date(messageTime).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      );
    }
    return null;
  }

    // For own messages, show delivery status
  const renderDeliveryStatus = () => {
    // Debug logging
    if (isOwnMessage) {
      // console.log(`🔍 ReadReceipt Debug - deliveryStatus: ${deliveryStatus}, otherParticipantId: ${otherParticipantId}, readBy:`, readBy);
    }
    
    switch (deliveryStatus) {
      case 'sending':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        );
      case 'sent':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        );
      case 'delivered':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" style={styles.secondTick} />
          </View>
        );
      case 'read':
        // When delivery status is 'read', show blue ticks
        // This means the message has been read by the recipient
        // console.log(`🔵 BLUE TICKS: Showing blue ticks for read status`);
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={12} color="#2196F3" />
            <Ionicons name="checkmark" size={12} color="#2196F3" style={styles.secondTick} />
          </View>
        );
      default:
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderDeliveryStatus()}
      {showTime && messageTime && (
        <Text style={styles.timeText}>
          {new Date(messageTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  tickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  secondTick: {
    marginLeft: -8, // Overlap the ticks slightly
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)', // Default for own messages
  },
});

export default ReadReceipt; 