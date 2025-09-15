import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ReadReceipt from './ReadReceipt';

const ReadReceiptDemo: React.FC = () => {
  const demoMessages = [
    {
      id: '1',
      isOwnMessage: true,
      deliveryStatus: 'sending' as const,
      message: 'Message being sent...',
      time: new Date().toISOString(),
    },
    {
      id: '2',
      isOwnMessage: true,
      deliveryStatus: 'sent' as const,
      message: 'Message sent (1 tick)',
      time: new Date().toISOString(),
    },
    {
      id: '3',
      isOwnMessage: true,
      deliveryStatus: 'delivered' as const,
      message: 'Message delivered (2 ticks)',
      time: new Date().toISOString(),
    },
    {
      id: '4',
      isOwnMessage: true,
      deliveryStatus: 'read' as const,
      readBy: [
        { user_id: 2, user_name: 'Doctor', read_at: new Date().toISOString() }
      ],
      message: 'Message read (blue ticks)',
      time: new Date().toISOString(),
      otherParticipantId: 2,
    },
    {
      id: '5',
      isOwnMessage: false,
      deliveryStatus: 'sent' as const,
      message: 'Message from other person',
      time: new Date().toISOString(),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Read Receipt Demo</Text>
      
      {demoMessages.map((message) => (
        <View key={message.id} style={styles.messageContainer}>
          <View
            style={[
              styles.messageBubble,
              {
                backgroundColor: message.isOwnMessage ? '#4CAF50' : '#F0F0F0',
                alignSelf: message.isOwnMessage ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                {
                  color: message.isOwnMessage ? '#fff' : '#333',
                },
              ]}
            >
              {message.message}
            </Text>
            <ReadReceipt
              isOwnMessage={message.isOwnMessage}
              deliveryStatus={message.deliveryStatus}
              readBy={message.readBy}
              otherParticipantId={message.otherParticipantId}
              messageTime={message.time}
            />
          </View>
        </View>
      ))}
      
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <Text style={styles.legendItem}>• Clock icon: Message sending</Text>
        <Text style={styles.legendItem}>• Single tick: Message sent</Text>
        <Text style={styles.legendItem}>• Double ticks: Message delivered</Text>
        <Text style={styles.legendItem}>• Blue ticks: Message read</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
  },
  legend: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  legendItem: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
});

export default ReadReceiptDemo; 