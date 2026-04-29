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
    const tickColor = 'rgba(255,255,255,0.55)'; // Muted white for sent/delivered
    const readColor = '#40C4FF'; // Professional muted sky blue for read status

    switch (deliveryStatus) {
      case 'sending':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="time-outline" size={10} color={tickColor} />
          </View>
        );
      case 'sent':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={13} color={tickColor} />
          </View>
        );
      case 'delivered':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={13} color={tickColor} />
            <Ionicons name="checkmark" size={13} color={tickColor} style={styles.secondTick} />
          </View>
        );
      case 'read':
        return (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark" size={13} color={readColor} />
            <Ionicons name="checkmark" size={13} color={readColor} style={styles.secondTick} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {showTime && messageTime && (
        <Text style={styles.timeText}>
          {new Date(messageTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      )}
      {isOwnMessage && renderDeliveryStatus()}
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