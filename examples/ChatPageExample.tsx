import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ChatInputWithMedia } from '../components/ChatInputWithMedia';
import { ChatMessage } from '../types/chat';

interface ChatPageExampleProps {
  appointmentId: number;
  // Add your existing props here
}

export const ChatPageExample: React.FC<ChatPageExampleProps> = ({
  appointmentId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle sending text messages
  const handleSendMessage = async (messageText: string) => {
    try {
      // Create a temporary message for immediate UI feedback
      const tempMessage: ChatMessage = {
        id: `temp_${Date.now()}`,
        sender_id: 1, // Replace with actual user ID
        sender_name: 'You', // Replace with actual user name
        message: messageText,
        message_type: 'text',
        media_url: '',
        created_at: new Date().toISOString(),
        delivery_status: 'sending',
      };

      // Add to local messages immediately
      setMessages(prev => [...prev, tempMessage]);

      // Here you would typically send through your WebRTC service
      // await webrtcChatService.sendMessage(messageText, appointmentId);
      
      console.log('Sending message:', messageText);
      
      // Simulate successful send
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, delivery_status: 'sent' }
              : msg
          )
        );
      }, 1000);

    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Handle image upload completion
  const handleImageUploaded = (tempId: string) => {
    console.log('Image uploaded with temp ID:', tempId);
    
    // The temporary message should already be in the messages list
    // The upload progress will be handled by the MediaUploadHandler
    // When upload completes, the real message will replace the temporary one
  };

  // Handle voice upload completion
  const handleVoiceUploaded = (tempId: string) => {
    console.log('Voice uploaded with temp ID:', tempId);
    
    // The temporary message should already be in the messages list
    // The upload progress will be handled by the MediaUploadHandler
    // When upload completes, the real message will replace the temporary one
  };

  // Render individual message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === 1; // Replace with actual user ID check
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <Text style={styles.senderName}>{item.sender_name}</Text>
        
        {item.message_type === 'text' && (
          <Text style={styles.messageText}>{item.message}</Text>
        )}
        
        {item.message_type === 'image' && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaText}>📷 Image</Text>
            {item.media_url && (
              <Text style={styles.mediaUrl}>{item.media_url}</Text>
            )}
          </View>
        )}
        
        {item.message_type === 'voice' && (
          <View style={styles.mediaContainer}>
            <Text style={styles.mediaText}>🎤 Voice Message</Text>
            {item.media_url && (
              <Text style={styles.mediaUrl}>{item.media_url}</Text>
            )}
          </View>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          {isOwnMessage && (
            <Text style={[
              styles.deliveryStatus,
              item.delivery_status === 'sent' && styles.sentStatus,
              item.delivery_status === 'failed' && styles.failedStatus,
            ]}>
              {item.delivery_status === 'sending' && 'Sending...'}
              {item.delivery_status === 'uploading' && 'Uploading...'}
              {item.delivery_status === 'sent' && '✓'}
              {item.delivery_status === 'failed' && '✗'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        inverted
      />

      {/* Chat Input with Media Upload */}
      <ChatInputWithMedia
        appointmentId={appointmentId}
        onSendMessage={handleSendMessage}
        onImageUploaded={handleImageUploaded}
        onVoiceUploaded={handleVoiceUploaded}
        placeholder="Type a message..."
        disabled={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  mediaContainer: {
    marginTop: 4,
  },
  mediaText: {
    fontSize: 16,
    color: '#000',
  },
  mediaUrl: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  deliveryStatus: {
    fontSize: 12,
    marginLeft: 8,
  },
  sentStatus: {
    color: '#4CAF50',
  },
  failedStatus: {
    color: '#F44336',
  },
});
