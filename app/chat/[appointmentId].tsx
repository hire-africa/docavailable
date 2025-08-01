import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import ImageMessageViewer from '../../components/ImageMessageViewer';
import MessageDeliveryStatus from '../../components/MessageDeliveryStatus';
import TypingIndicator from '../../components/TypingIndicator';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { useAuth } from '../../contexts/AuthContext';
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
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const router = useRouter();
  const { user } = useAuth();
  
  // Parse appointment ID
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Advanced chat features
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingPermission, setRecordingPermission] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Get current user ID for message alignment
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
      // Extract the numeric part from text_session_43 -> 43
      const numericPart = appointmentId.replace('text_session_', '');
      return parseInt(numericPart, 10);
    }
    return parsedAppointmentId as number;
  };

  // Available reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // Start typing indicator
  const startTyping = async () => {
    if (!isTyping) {
      setIsTyping(true);
      // Send typing indicator to server
      try {
        await messageStorageService.startTyping(
          getAppointmentIdForStorage(),
          currentUserId,
          user?.first_name + ' ' + user?.last_name || 'Unknown User'
        );
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  };

  // Stop typing indicator
  const stopTyping = async () => {
    if (isTyping) {
      setIsTyping(false);
      try {
        await messageStorageService.stopTyping(
          getAppointmentIdForStorage(),
          currentUserId
        );
      } catch (error) {
        console.error('Error stopping typing indicator:', error);
      }
    }
  };

  // Request recording permission
  const requestRecordingPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setRecordingPermission(status);
    return status;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermission();
      if (permission !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        await handleVoiceRecordingComplete(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  // Handle voice recording completion
  const handleVoiceRecordingComplete = async (audioUri: string) => {
    setSending(true);
    try {
      // Upload audio file to server first
      const formData = new FormData();
      const fileData = {
        uri: audioUri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`
      } as any;
      
      formData.append('file', fileData);
      formData.append('appointment_id', parsedAppointmentId.toString());
      
      const uploadResponse = await apiService.uploadFile('/upload/voice-message', formData);
      
      if (!uploadResponse.success) {
        throw new Error('Failed to upload audio file');
      }

      const uploadData = uploadResponse.data as any;
      const publicAudioUrl = uploadData.url;
      
      // Send voice message
      const sentMessage = await messageStorageService.sendVoiceMessage(
        getAppointmentIdForStorage(),
        '🎤 Voice message',
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User',
        publicAudioUrl
      );

      if (sentMessage) {
        console.log('Voice message sent successfully');
      } else {
        Alert.alert('Error', 'Failed to send voice message');
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    } finally {
      setSending(false);
      setRecordingTime(0);
    }
  };

  // Handle text input changes
  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    // Start typing indicator when user starts typing
    if (text.length > 0 && !isTyping) {
      startTyping();
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set timeout to stop typing indicator after 2 seconds of no typing
    const timeout = setTimeout(() => {
      stopTyping();
    }, 2000);
    
    setTypingTimeout(timeout as ReturnType<typeof setTimeout>);
  };

  // Reply to a message
  const replyToMessage = (message: Message) => {
    setReplyingTo(message);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Send reply
  const sendReply = async () => {
    if (!replyingTo || !newMessage.trim()) return;

    setSending(true);
    try {
      await messageStorageService.replyToMessage(
        getAppointmentIdForStorage(),
        replyingTo.id,
        newMessage.trim()
      );
      
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  // Handle message reaction with toggle functionality
  const handleMessageReaction = async (messageId: string, reaction: string) => {
    try {
      await messageStorageService.toggleReaction(
        getAppointmentIdForStorage(),
        messageId,
        reaction,
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User'
      );
      
      setShowReactionMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error handling message reaction:', error);
    }
  };

  // Handle long press on message
  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowReactionMenu(true);
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permission to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Send image message
  const sendImageMessage = async (imageUri: string) => {
    setSending(true);
    try {
      // Upload image to server first
      const formData = new FormData();
      const fileData = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `image_${Date.now()}.jpg`
      } as any;
      
      formData.append('file', fileData);
      formData.append('appointment_id', parsedAppointmentId.toString());
      
      const uploadResponse = await apiService.uploadFile('/upload/chat-attachment', formData);
      
      if (!uploadResponse.success) {
        throw new Error('Failed to upload image file');
      }

      const uploadData = uploadResponse.data as any;
      const publicImageUrl = uploadData.url;
      
      // Send image message
      const sentMessage = await messageStorageService.sendImageMessage(
        getAppointmentIdForStorage(),
        '📷 Image',
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User',
        publicImageUrl
      );

      if (sentMessage) {
        console.log('Image message sent successfully');
      } else {
        Alert.alert('Error', 'Failed to send image message');
      }
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Load chat info and messages with optimizations
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

      // Load initial messages using optimized method
      const localMessages = await messageStorageService.getMessagesOptimized(getAppointmentIdForStorage());
      setMessages(localMessages);
      
      // Mark messages as read when chat is loaded
      await markMessagesAsRead();
      
      // Start auto-sync for real-time updates
      messageStorageService.startAutoSync(getAppointmentIdForStorage());
      
      // Register for updates with debouncing
      messageStorageService.registerUpdateCallback(getAppointmentIdForStorage(), async (updatedMessages) => {
        setMessages(updatedMessages);
        // Mark new messages as read when they arrive
        await markMessagesAsRead();
      });
      
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      await messageStorageService.markMessagesAsRead(getAppointmentIdForStorage(), currentUserId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Mark messages as read when user scrolls to view them
  const handleScroll = () => {
    // Mark messages as read when user scrolls to view them
    markMessagesAsRead();
  };



  // Safe manual refresh with cooldown
  const safeRefreshMessages = async () => {
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    const now = new Date();
    const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();
    if (timeSinceLastRefresh < 2000) {
      console.log('Refresh cooldown active, skipping...');
      return;
    }

    try {
      setIsRefreshing(true);
      const serverMessages = await messageStorageService.loadFromServer(getAppointmentIdForStorage());
      setMessages(serverMessages);
      setLastRefresh(now);
      console.log('Messages refreshed safely');
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    // console.log('🚀 [ChatPage] Starting to send message:', messageText);
    setNewMessage('');
    setSending(true);

    // Add timeout protection to prevent button from getting stuck
    const timeoutId = setTimeout(() => {
      setSending(false);
    }, 10000); // 10 second timeout

    try {
      if (replyingTo) {
        // Send reply
        // console.log('🚀 [ChatPage] Sending reply message');
        await sendReply();
      } else {
        // Send regular message
        // console.log('🚀 [ChatPage] Sending regular message to appointment:', getAppointmentIdForStorage());
        const sentMessage = await messageStorageService.sendMessage(
          getAppointmentIdForStorage(),
          messageText,
          currentUserId,
          user?.first_name + ' ' + user?.last_name || 'Unknown User'
        );
        
        // console.log('🚀 [ChatPage] Message send result:', sentMessage);
        
        if (sentMessage) {
          // Message sent successfully
        } else {
          Alert.alert('Error', 'Failed to send message');
          setNewMessage(messageText);
        }
      }
    } catch (error) {
      console.error('❌ [ChatPage] Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText);
    } finally {
      clearTimeout(timeoutId);
      setSending(false);
    }
  };

  // Load chat on mount and cleanup on unmount
  useEffect(() => {
    loadChat();
    
    // Cleanup on unmount
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      stopTyping();
      messageStorageService.stopAutoSync(getAppointmentIdForStorage());
      messageStorageService.unregisterUpdateCallback(getAppointmentIdForStorage());
      
      // Clear cache for this appointment to free memory
      messageStorageService.clearCache(getAppointmentIdForStorage());
    };
  }, [appointmentId]); // Add appointmentId as dependency

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000' }}>
              {chatInfo?.other_participant_name || 'Chat'}
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {user?.user_type === 'doctor' ? 'Patient' : 'Doctor'}
            </Text>
          </View>
          
          <TouchableOpacity style={{ marginRight: 16 }}>
            <Ionicons name="call" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 16 }}>
            <Ionicons name="videocam" size={24} color="#4CAF50" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Encryption Info */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
        }}>
          <Ionicons name="lock-closed" size={12} color="#666" />
          <Text style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
            End-to-end encrypted
          </Text>
          <Ionicons name="information-circle" size={12} color="#666" style={{ marginLeft: 4 }} />
        </View>

        {/* Messages Container */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Chat Wallpaper Background */}
          <Image
            source={require('../../assets/images/wallpaper.jpg')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              opacity: 0.3,
              zIndex: -1,
            }}
            resizeMode="cover"
          />
          
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              paddingBottom: 20,
              minHeight: '100%',
            }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            onScroll={handleScroll} // Add onScroll event
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => (
              <TouchableOpacity
                key={`${message.id}_${index}`}
                onLongPress={() => handleMessageLongPress(message)}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    marginVertical: 6,
                    marginHorizontal: 16,
                    justifyContent: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
                  }}
                >
                  <View
                    style={{
                      maxWidth: '85%',
                      backgroundColor: message.sender_id === currentUserId ? '#4CAF50' : '#fff',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: message.sender_id === currentUserId ? 0 : 1,
                      borderColor: '#E5E5E5',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    {message.sender_id !== currentUserId && (
                      <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                        {message.sender_name}
                      </Text>
                    )}
                    
                    {/* Message Content */}
                    {message.message_type === 'text' && (
                      <Text
                        style={{
                          color: message.sender_id === currentUserId ? '#fff' : '#000',
                          fontSize: 16,
                          lineHeight: 20,
                        }}
                      >
                        {message.message}
                      </Text>
                    )}
                    
                    {message.message_type === 'image' && message.media_url && (
                      <ImageMessageViewer
                        imageUri={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                      />
                    )}
                    
                    {message.message_type === 'voice' && message.media_url && (
                      <VoiceMessagePlayer
                        audioUri={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                      />
                    )}
                    
                    {/* Message Reactions with enhanced display */}
                    {message.reactions && message.reactions.length > 0 && (
                      <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        marginTop: 4,
                        gap: 4,
                      }}>
                        {message.reactions.map((reaction, index) => (
                          <TouchableOpacity
                            key={`${reaction.user_id}-${reaction.reaction}-${index}`}
                            style={{
                              backgroundColor: reaction.user_id === currentUserId ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.1)',
                              borderRadius: 12,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderWidth: reaction.user_id === currentUserId ? 1 : 0,
                              borderColor: 'rgba(76,175,80,0.5)',
                            }}
                            onPress={() => handleMessageReaction(message.id, reaction.reaction)}
                          >
                            <Text style={{ fontSize: 12 }}>{reaction.reaction}</Text>
                            {reaction.user_id === currentUserId && (
                              <Text style={{ fontSize: 8, color: '#4CAF50', marginLeft: 2 }}>•</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: message.sender_id === currentUserId ? 'rgba(255,255,255,0.8)' : '#999',
                        }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                      
                      {/* Enhanced Delivery Status for own messages */}
                      {message.sender_id === currentUserId && (
                        <MessageDeliveryStatus
                          deliveryStatus={message.delivery_status}
                          isOwnMessage={true}
                          readBy={message.read_by}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reply Preview */}
        {replyingTo && (
          <View style={{
            backgroundColor: '#E8F5E8',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: '#C8E6C9',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 12,
                  color: '#2E7D32',
                  fontWeight: '500',
                  marginBottom: 2,
                }}>
                  Replying to {replyingTo.sender_name}
                </Text>
                <Text style={{
                  fontSize: 11,
                  color: '#666',
                }} numberOfLines={1}>
                  {replyingTo.message}
                </Text>
              </View>
              <TouchableOpacity
                onPress={cancelReply}
                style={{
                  padding: 4,
                }}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reaction Menu */}
        {showReactionMenu && selectedMessage && (
          <>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 1000,
              }}
              onPress={() => {
                setShowReactionMenu(false);
                setSelectedMessage(null);
              }}
              activeOpacity={1}
            />
            <View style={{
              position: 'absolute',
              bottom: 120,
              left: 20,
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 12,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              zIndex: 1001,
              flexDirection: 'row',
              gap: 8,
              borderWidth: 1,
              borderColor: '#4CAF50',
            }}>
              {reactions.map((reaction) => (
                                  <TouchableOpacity
                    key={reaction}
                    onPress={() => handleMessageReaction(selectedMessage.id, reaction)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#E8F5E8',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                  <Text style={{ fontSize: 20 }}>{reaction}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Typing Indicator */}
        <TypingIndicator 
          appointmentId={getAppointmentIdForStorage()} 
          currentUserId={currentUserId} 
        />

        {/* Input */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12, 
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5'
        }}>
          {/* Image Button */}
          <TouchableOpacity
            onPress={pickImage}
            style={{
              marginRight: 8,
              padding: 8,
            }}
          >
            <Ionicons name="image" size={24} color="#4CAF50" />
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: isRecording ? '#ff4444' : '#E5E5E5',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: isRecording ? 0 : 8,
                fontSize: 16,
                backgroundColor: isRecording ? '#fff5f5' : '#f8f9fa',
                maxHeight: 100,
              }}
              placeholder={isRecording ? "Recording..." : "Type your message..."}
              value={newMessage}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              editable={!isRecording}
            />
            {isRecording && (
              <View style={{
                position: 'absolute',
                right: 12,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,68,68,0.1)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#ff4444',
                  marginRight: 4,
                }} />
                <Text style={{
                  fontSize: 12,
                  color: '#ff4444',
                  fontWeight: '600',
                }}>
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            onPress={newMessage.trim() ? sendMessage : isRecording ? stopRecording : startRecording}
            disabled={sending}
            style={{
              backgroundColor: newMessage.trim() && !sending ? '#4CAF50' : isRecording ? '#4CAF50' : '#E5E5E5',
              borderRadius: 20,
              padding: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isRecording ? (
              <Ionicons name="send" size={20} color="#fff" />
            ) : newMessage.trim() ? (
              <Ionicons name="send" size={20} color="#fff" />
            ) : (
              <Ionicons name="mic" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 