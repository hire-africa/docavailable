import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { Message, messageStorageService } from '../../services/messageStorageService';

// Message interface is now imported from messageStorageService

interface ChatInfo {
  appointment_id: number;
  other_participant_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function ChatPage() {
  const { appointmentId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Get current user ID for message alignment
  const currentUserId = user?.id || 0;

  // Load chat info and messages
  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Load chat info
      const infoResponse = await fetch(`http://172.20.10.11:8000/api/chat/${appointmentId}/info`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authService.getStoredToken()}`
        }
      });
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setChatInfo(infoData.data);
      }

      // Load messages from local storage first, then sync with server
      const localMessages = await messageStorageService.getMessages(Number(appointmentId));
      setMessages(localMessages);
      
      // Load from server and sync
      const serverMessages = await messageStorageService.loadFromServer(Number(appointmentId));
      setMessages(serverMessages);
      
      // Start auto-sync
      messageStorageService.startAutoSync(Number(appointmentId));
      
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  // Safe manual refresh with cooldown
  const safeRefreshMessages = async () => {
    // Prevent rapid clicking
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    // Cooldown period (2 seconds)
    const now = new Date();
    const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();
    if (timeSinceLastRefresh < 2000) {
      console.log('Refresh cooldown active, skipping...');
      return;
    }

    try {
      setIsRefreshing(true);
      const serverMessages = await messageStorageService.loadFromServer(Number(appointmentId));
      setMessages(serverMessages);
      setLastRefresh(now);
      console.log('Messages refreshed safely');
    } catch (error) {
      console.error('Error refreshing messages:', error);
      // Don't show alert to user - just log the error
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Send message using the storage service
      const sentMessage = await messageStorageService.sendMessage(
        Number(appointmentId),
        messageText,
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User'
      );

      if (sentMessage) {
        // Message will be automatically added to local storage and synced
        setMessages(prev => [...prev, sentMessage]);
      } else {
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(messageText); // Restore the message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  // Load chat on mount and cleanup on unmount
  useEffect(() => {
    loadChat();
    
    // Register for real-time updates
    messageStorageService.registerUpdateCallback(Number(appointmentId), (newMessages) => {
      setMessages(newMessages);
    });
    
    // Cleanup function to stop auto-sync when component unmounts
    return () => {
      messageStorageService.stopAutoSync(Number(appointmentId));
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#fff'
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            {chatInfo?.other_participant_name || 'Chat'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {chatInfo?.appointment_date} at {chatInfo?.appointment_time}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={safeRefreshMessages}
          disabled={isRefreshing}
          style={{ opacity: isRefreshing ? 0.5 : 1 }}
        >
          <Ionicons 
            name={isRefreshing ? "hourglass" : "refresh"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: '#F8F9FA' }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              flexDirection: 'row',
              marginVertical: 4,
              marginHorizontal: 16,
              justifyContent: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
            }}
          >
            <View
              style={{
                maxWidth: '70%',
                backgroundColor: message.sender_id === currentUserId ? '#007AFF' : '#fff',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: message.sender_id === currentUserId ? 0 : 1,
                borderColor: '#E5E5E5',
              }}
            >
              {message.sender_id !== currentUserId && (
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                  {message.sender_name}
                </Text>
              )}
              <Text
                style={{
                  color: message.sender_id === currentUserId ? '#fff' : '#000',
                  fontSize: 16,
                }}
              >
                {message.message}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: message.sender_id === currentUserId ? 'rgba(255,255,255,0.7)' : '#999',
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={{ 
        flexDirection: 'row', 
        padding: 16, 
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5'
      }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginRight: 8,
            fontSize: 16,
          }}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
          style={{
            backgroundColor: newMessage.trim() && !sending ? '#007AFF' : '#E5E5E5',
            borderRadius: 20,
            padding: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() && !sending ? '#fff' : '#999'} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
} 