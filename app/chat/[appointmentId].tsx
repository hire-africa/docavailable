import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { apiService } from '../../app/services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { Message, messageStorageService } from '../../services/messageStorageService';

interface ChatInfo {
  appointment_id: number;
  other_participant_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function ChatPage() {
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUserId = user?.id || 0;
  
  // Parse and validate appointment ID
  const isTextSession = appointmentId && appointmentId.startsWith('text_session_');
  const parsedAppointmentId = isTextSession ? appointmentId : (appointmentId ? parseInt(appointmentId, 10) : null);
  
  // Validate appointment ID
  if (!parsedAppointmentId || (!isTextSession && isNaN(parsedAppointmentId as number))) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Invalid appointment ID</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: '#4CAF50', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Helper function to convert appointment ID to number for message storage service
  const getAppointmentIdForStorage = (): number => {
    if (isTextSession) {
      const numericPart = appointmentId.replace('text_session_', '');
      return parseInt(numericPart, 10);
    }
    return parsedAppointmentId as number;
  };

  // Load chat info and messages
  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Preload messages for better performance
      await messageStorageService.preloadMessages(getAppointmentIdForStorage());
      
      // Load chat info
      try {
        const infoResponse = await apiService.get(`/chat/${parsedAppointmentId}/info`);
        if (infoResponse.success && infoResponse.data) {
          setChatInfo(infoResponse.data as ChatInfo);
        }
      } catch (error) {
        console.error('Error loading chat info:', error);
      }

      // Load initial messages
      const localMessages = await messageStorageService.getMessagesOptimized(getAppointmentIdForStorage());
      setMessages(localMessages);
      
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const sentMessage = await messageStorageService.sendMessage(
        getAppointmentIdForStorage(),
        newMessage.trim(),
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User'
      );
      
      if (sentMessage) {
        setNewMessage('');
        // Messages will be updated via callback
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Safe manual refresh
  const safeRefreshMessages = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await messageStorageService.loadFromServer(getAppointmentIdForStorage());
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load chat on mount
  useEffect(() => {
    loadChat();
  }, []);

  // Register for message updates and start auto-sync
  useEffect(() => {
    messageStorageService.registerUpdateCallback(getAppointmentIdForStorage(), (updatedMessages) => {
      setMessages(updatedMessages);
    });

    // Start auto-sync for real-time updates
    messageStorageService.startAutoSync(getAppointmentIdForStorage());

    return () => {
      messageStorageService.unregisterUpdateCallback(getAppointmentIdForStorage());
      messageStorageService.stopAutoSync(getAppointmentIdForStorage());
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#fff',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
            {chatInfo?.other_participant_name || 'Chat'}
          </Text>
          {chatInfo && (
            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
              {chatInfo.appointment_date} at {chatInfo.appointment_time}
            </Text>
          )}
        </View>
        
        <TouchableOpacity onPress={safeRefreshMessages} style={{ padding: 8 }}>
          <Ionicons name="refresh" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={{
                alignSelf: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
                marginBottom: 12,
                maxWidth: '80%',
              }}
            >
              <View
                style={{
                  backgroundColor: message.sender_id === currentUserId ? '#4CAF50' : '#F0F0F0',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 20,
                  borderBottomLeftRadius: message.sender_id === currentUserId ? 20 : 4,
                  borderBottomRightRadius: message.sender_id === currentUserId ? 4 : 20,
                }}
              >
                <Text
                  style={{
                    color: message.sender_id === currentUserId ? '#fff' : '#333',
                    fontSize: 16,
                  }}
                >
                  {message.message}
                </Text>
                <Text
                  style={{
                    color: message.sender_id === currentUserId ? 'rgba(255,255,255,0.7)' : '#666',
                    fontSize: 12,
                    marginTop: 4,
                    alignSelf: 'flex-end',
                  }}
                >
                  {new Date(message.created_at).toLocaleTimeString([], { 
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
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          backgroundColor: '#fff',
        }}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              marginRight: 8,
            }}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              backgroundColor: newMessage.trim() && !sending ? '#4CAF50' : '#E5E5E5',
              borderRadius: 20,
              padding: 12,
              minWidth: 44,
              alignItems: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 