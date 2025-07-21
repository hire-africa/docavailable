import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiService } from '../app/services/apiService';

interface ChatWindowProps {
  chatId: string; // appointmentId
  userId: string; // current user's id
  otherParticipant: {
    uid: string;
    displayName?: string;
    name?: string;
    userType?: string;
    profile_picture_url?: string;
    profile_picture?: string;
  };
  appointment: any;
  canSendMessages: boolean;
  onBackPress?: () => void;
}

interface Message {
  id?: string;
  sender: string;
  text: string;
  timestamp: any;
  read: boolean;
  type?: 'text';
}

export default function ChatWindow({ chatId, userId, otherParticipant, appointment, canSendMessages, onBackPress }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation();

  // Real-time listener for messages
  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    console.log('ChatWindow: Setting up listener for chat:', chatId);
    
    const fetchMessages = async () => {
      try {
        const response = await apiService.get(`/api/chats/${chatId}/messages`);
        setMessages(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [chatId]);

  // Send a message
  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (!chatId) {
      Alert.alert('Error', 'Chat ID not available.');
      return;
    }

    // Block if message contains any sequence of 7+ digits
    if (/\d{7,}/.test(input.replace(/\D/g, ''))) {
      Alert.alert(
        'Phone Number Detected',
        'For your safety and privacy, sharing phone numbers is not allowed in chat. Please remove any phone numbers from your message.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    try {
      setSending(true);
      const messageData = {
        sender: userId,
        text: input.trim(),
        timestamp: new Date().toISOString(), // Use current timestamp
        read: false,
        type: 'text' as const,
      };

      console.log('ChatWindow: Sending message to chat:', chatId, messageData);

      // Ensure the chat document exists
      await apiService.post(`/api/chats/${chatId}/messages`, messageData);
      setInput('');
      
      // Scroll to bottom after sending
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Group messages by date (for date divider)
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    msgs.forEach(msg => {
      const date = msg.timestamp ? new Date(msg.timestamp).toDateString() : 'Unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  // Helper to format date/time for status messages
  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      let date: Date;
      if (dateString && timeString) {
        // Try to parse as MM/DD/YYYY and HH:mm
        if (/\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
          const [month, day, year] = dateString.split('/').map(Number);
          const [hour, minute] = timeString.split(':').map(Number);
          date = new Date(year, month - 1, day, hour, minute);
        } else {
          date = new Date(dateString + ' ' + timeString);
        }
      } else {
        date = new Date(dateString);
      }
      return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dateString + (timeString ? ' ' + timeString : '');
    }
  };

  // Determine session status text
  let sessionStatusText = '';
  if (appointment) {
    const now = new Date();
    let scheduledDate: Date | null = null;
    if (appointment.date && appointment.time) {
      if (/\d{2}\/\d{2}\/\d{4}/.test(appointment.date)) {
        const [month, day, year] = appointment.date.split('/').map(Number);
        const [hour, minute] = appointment.time.split(':').map(Number);
        scheduledDate = new Date(year, month - 1, day, hour, minute);
      } else {
        scheduledDate = new Date(appointment.date + ' ' + appointment.time);
      }
    }
    const actualStart = appointment.actualStartTime ? new Date(appointment.actualStartTime) : null;
    const actualEnd = appointment.actualEndTime ? new Date(appointment.actualEndTime) : null;
    if (actualEnd) {
      sessionStatusText = `Session ended at ${actualEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (actualStart) {
      sessionStatusText = `Session started at ${actualStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (scheduledDate && now < scheduledDate) {
      sessionStatusText = `Session scheduled for ${formatDateTime(appointment.date, appointment.time)}`;
    } else if (scheduledDate && now >= scheduledDate) {
      sessionStatusText = `Session started at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  // Header actions
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if ((navigation as any).canGoBack()) {
      (navigation as any).goBack();
    }
  };
  const handleCall = () => {
    Alert.alert('Call Not Supported', 'In-app calls are not supported on this device.');
  };
  const handleVideo = () => {
    Alert.alert('Video Call Not Supported', 'In-app video calls are not supported on this device.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (!chatId) return null;

  // Group messages for date divider
  const grouped = groupMessagesByDate(messages);
  const today = new Date().toDateString();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity style={styles.headerBack} onPress={handleBack}>
          <FontAwesome name="arrow-left" size={22} color="#4CAF50" />
        </TouchableOpacity>
        
        {/* Profile Picture */}
        <View style={styles.headerProfilePic}>
          {otherParticipant?.profile_picture_url ? (
            <Image source={{ uri: otherParticipant.profile_picture_url }} style={styles.headerProfileImage} />
          ) : otherParticipant?.profile_picture ? (
            <Image source={{ uri: otherParticipant.profile_picture }} style={styles.headerProfileImage} />
          ) : (
            <View style={styles.headerProfilePlaceholder}>
              <FontAwesome 
                name={otherParticipant?.userType === 'doctor' ? 'user-md' : 'user'} 
                size={20} 
                color="#4CAF50" 
              />
            </View>
          )}
        </View>
        
        {/* Contact Name */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherParticipant?.name || 'User'}</Text>
          <Text style={styles.headerRole}>{otherParticipant?.userType === 'doctor' ? 'Doctor' : 'Patient'}</Text>
        </View>
        
        {/* Call and Video Call Icons */}
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCall} style={styles.headerIcon}>
            <FontAwesome name="phone" size={22} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideo} style={styles.headerIcon}>
            <FontAwesome name="video-camera" size={22} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Encryption Banner */}
      <View style={styles.encryptionBar}>
        <FontAwesome name="lock" size={14} color="#4CAF50" />
        <Text style={styles.encryptionText}>End-to-end encrypted</Text>
        <TouchableOpacity onPress={() => Alert.alert('End-to-End Encryption', 'Your messages are encrypted and can only be read by you and the person you\'re chatting with. Not even our servers can access the content of your messages.', [{ text: 'Got it', style: 'default' }])}>
          <FontAwesome name="info-circle" size={12} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {/* Session status text above messages */}
        {!!sessionStatusText && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 14 }}>{sessionStatusText}</Text>
          </View>
        )}
        {Object.entries(grouped).map(([date, msgs]) => (
          <View key={date}>
            <View style={styles.dateDividerContainer}>
              <Text style={styles.dateDivider}>{date === today ? 'Today' : date}</Text>
            </View>
            {msgs.map((msg, index) => (
              <View
                key={msg.id || `msg_${index}`}
                style={[
                  styles.messageBubble,
                  msg.sender === userId ? styles.myMessage : styles.theirMessage
                ]}
              >
                <Text style={[
                  styles.messageText,
                  msg.sender === userId ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {msg.text}
                </Text>
                <Text style={[
                  styles.messageMeta,
                  msg.sender === userId ? styles.myMessageMeta : styles.theirMessageMeta
                ]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}} disabled={!canSendMessages}>
          <FontAwesome name="image" size={20} color={canSendMessages ? "#4CAF50" : "#CCC"} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, !canSendMessages && styles.inputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder={canSendMessages ? "Type your message..." : "Chat not active"}
            placeholderTextColor="#888"
            multiline
            maxLength={500}
            editable={canSendMessages}
          />
          <View style={styles.inputEncryptionIndicator}>
            <FontAwesome name="lock" size={10} color={canSendMessages ? "#4CAF50" : "#CCC"} />
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, (!input.trim() || sending || !canSendMessages) && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={!input.trim() || sending || !canSendMessages}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
    marginTop: 40,
  },
  headerBack: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginRight: 12,
    zIndex: 2,
  },
  headerProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  headerProfileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerProfilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  headerRole: {
    fontSize: 13,
    color: '#4CAF50',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  headerIcon: {
    padding: 4,
  },
  encryptionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  encryptionText: {
    fontSize: 13,
    color: '#4CAF50',
    marginHorizontal: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dateDividerContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateDivider: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#222',
  },
  messageMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageMeta: {
    color: '#e0ffe0',
    alignSelf: 'flex-end',
  },
  theirMessageMeta: {
    color: '#888',
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 70,
  },
  actionButton: {
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#222',
    backgroundColor: 'transparent',
  },
  inputEncryptionIndicator: {
    marginLeft: 6,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 10,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  inputDisabled: {
    // backgroundColor: '#CCC',
  },
}); 