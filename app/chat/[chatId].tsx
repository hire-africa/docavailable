import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { apiService } from '../../app/services/apiService';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { localStorageService } from '../../services/localStorageService';

interface Message {
  id: string;
  text: string;
  sender: number;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  isLocal?: boolean;
}

interface Participants {
  type: 'text_session';
  sessionId: string;
  doctorName: string;
  patientName: string;
}

export default function ChatPage() {
  const { chatId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<Participants | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (chatId) {
      initializeChat();
    }
  }, [chatId]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Parse chat ID to get session ID
      if (typeof chatId === 'string' && chatId.startsWith('text_session_')) {
        const sessionId = chatId.replace('text_session_', '');
        setSessionId(sessionId);
        
        // Get session metadata
        const metadataResponse = await apiService.get(`/text-sessions/${sessionId}/metadata`);
        if (metadataResponse.success) {
          const metadata = metadataResponse.data;
          setParticipants({
            type: 'text_session',
            sessionId,
            doctorName: metadata.doctor?.name || 'Doctor',
            patientName: metadata.patient?.name || 'Patient'
          });
        }
        
        // Load messages from local storage first
        await loadMessagesFromLocalStorage(parseInt(sessionId));
        
        // Then sync with server
        await syncWithServer(parseInt(sessionId));
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesFromLocalStorage = async (sessionId: number) => {
    try {
      const decryptedMessages = await localStorageService.getDecryptedMessages(sessionId);
      
      const formattedMessages: Message[] = decryptedMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender_id,
        timestamp: msg.timestamp,
        status: 'sent'
      }));
      
      setMessages(formattedMessages);
      console.log(`Loaded ${formattedMessages.length} messages from local storage`);
    } catch (error) {
      console.error('Error loading messages from local storage:', error);
    }
  };

  const syncWithServer = async (sessionId: number) => {
    try {
      // Sync from server to local storage
      const synced = await localStorageService.syncFromServer(sessionId);
      
      if (synced) {
        // Reload messages from local storage
        await loadMessagesFromLocalStorage(sessionId);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || sending) return;

    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      text: newMessage.trim(),
      sender: user?.id || 0,
      timestamp: new Date().toISOString(),
      status: 'sending',
      isLocal: true
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSending(true);

    try {
      // Send message to server
      const response = await apiService.post(`/text-sessions/${sessionId}/messages`, {
        text: newMessage.trim(),
        sender: user?.id?.toString()
      });

      if (response.success) {
        // Update message status
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: response.data.id, status: 'sent', isLocal: false }
            : msg
        ));

        // Store message in local storage
        const localMessage = {
          id: response.data.id,
          session_id: parseInt(sessionId),
          sender_id: user?.id || 0,
          encrypted_content: response.data.encrypted_content || '',
          iv: response.data.iv || '',
          tag: response.data.tag || '',
          algorithm: response.data.algorithm || 'aes-256-gcm',
          is_encrypted: true,
          timestamp: response.data.timestamp,
          metadata: { sender_name: user?.first_name + ' ' + user?.last_name },
          synced_at: new Date().toISOString()
        };

        await localStorageService.addMessage(parseInt(sessionId), localMessage);
        
        // Sync to server
        await localStorageService.syncToServer(parseInt(sessionId));
      } else {
        // Mark message as failed
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, status: 'error' }
            : msg
        ));
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, status: 'error' }
          : msg
      ));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'sending' }
        : msg
    ));

    try {
      const response = await apiService.post(`/text-sessions/${sessionId}/messages`, {
        text: message.text,
        sender: user?.id?.toString()
      });

      if (response.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, id: response.data.id, status: 'sent' }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'error' }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error retrying message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'error' }
          : msg
      ));
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender === user?.id;
    const isError = item.status === 'error';

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myBubble : styles.otherBubble,
          isError && styles.errorBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            
            {isMyMessage && (
              <View style={styles.statusContainer}>
                {item.status === 'sending' && (
                  <ActivityIndicator size="small" color={Colors.gray} />
                )}
                {item.status === 'sent' && (
                  <Ionicons name="checkmark" size={16} color={Colors.gray} />
                )}
                {item.status === 'delivered' && (
                  <Ionicons name="checkmark-done" size={16} color={Colors.gray} />
                )}
                {item.status === 'read' && (
                  <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
                )}
                {item.status === 'error' && (
                  <TouchableOpacity onPress={() => retryMessage(item.id)}>
                    <Ionicons name="refresh" size={16} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>
          {user?.role === 'doctor' ? participants?.patientName : participants?.doctorName}
        </Text>
        <Text style={styles.headerSubtitle}>
          {user?.role === 'doctor' ? 'Patient' : 'Doctor'}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
  },
  menuButton: {
    marginLeft: 15,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  messageContainer: {
    marginVertical: 5,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.lightGray,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: Colors.error,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.gray,
  },
  statusContainer: {
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray,
  },
}); 