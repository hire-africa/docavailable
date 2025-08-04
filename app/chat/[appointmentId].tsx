import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import sessionService from '../../app/services/sessionService';
import { Icon } from '../../components/Icon';
import ProfilePictureDisplay from '../../components/ProfilePictureDisplay';
import RatingModal from '../../components/RatingModal';
import ReadReceipt from '../../components/ReadReceipt';
import { useAuth } from '../../contexts/AuthContext';
import { Message, messageStorageService } from '../../services/messageStorageService';

interface ChatInfo {
  appointment_id: number;
  other_participant_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor_id?: number;
  patient_id?: number;
  other_participant_profile_picture?: string;
  other_participant_profile_picture_url?: string;
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
  
  // Session ending modal state
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  
  // Add state to track if messages have been marked as read
  // This prevents unnecessary API calls and improves performance
  const [messagesMarkedAsRead, setMessagesMarkedAsRead] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [markReadAttempts, setMarkReadAttempts] = useState(0);
  const MAX_MARK_READ_ATTEMPTS = 3;
  
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUserId = user?.id || 0;
  
  // Check if current user is a patient
  const isPatient = user?.user_type === 'patient';
  
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
      
      // Safety check
      if (!messageStorageService) {
        console.error('❌ messageStorageService not available in loadChat');
        return;
      }
      
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

    // Safety check
    if (!messageStorageService) {
      console.error('❌ messageStorageService not available in sendMessage');
      Alert.alert('Error', 'Message service not available');
      return;
    }

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
    if (messageStorageService) {
      loadChat();
    } else {
      console.error('❌ messageStorageService not available for loadChat');
    }
  }, []);

  // Register for message updates and start auto-sync
  useEffect(() => {
    // Safety check to ensure messageStorageService is available
    if (!messageStorageService) {
      console.error('❌ messageStorageService is not available');
      return;
    }

    messageStorageService.registerUpdateCallback(getAppointmentIdForStorage(), (updatedMessages) => {
      // Check if there are new messages from other participants
      const hasNewMessagesFromOthers = updatedMessages.some(message => 
        message.sender_id !== currentUserId && 
        !messages.some(existingMessage => existingMessage.id === message.id)
      );
      
      // Debug: Log delivery status changes for own messages
      updatedMessages.forEach(message => {
        if (message.sender_id === currentUserId) {
          console.log(`🔍 Message ${message.id} delivery status: ${message.delivery_status}, readBy:`, message.read_by);
          
          // Check if delivery status changed
          const existingMessage = messages.find(m => m.id === message.id);
          if (existingMessage && existingMessage.delivery_status !== message.delivery_status) {
            console.log(`🔄 Delivery status changed for message ${message.id}: ${existingMessage.delivery_status} → ${message.delivery_status}`);
          }
          
          // Check if message is read
          if (message.delivery_status === 'read') {
            console.log(`🔵 READ STATUS: Message ${message.id} is marked as read with blue ticks`);
          }
        }
      });
      
      setMessages(updatedMessages);
      
      // Reset the flag when new messages arrive from others so they can be marked as read
      if (hasNewMessagesFromOthers) {
        setMessagesMarkedAsRead(false);
        setMarkReadAttempts(0); // Reset attempts for new messages
        console.log(`🔄 Reset read flags due to new messages from others`);
      }
      
      // Also check if there are any unread messages that need to be marked
      const hasUnreadMessages = updatedMessages.some(message => 
        message.sender_id !== currentUserId && 
        (!message.read_by || !message.read_by.some(read => read.user_id === currentUserId))
      );
      
      if (hasUnreadMessages && messagesMarkedAsRead) {
        console.log(`🔄 Found unread messages, resetting read flag`);
        setMessagesMarkedAsRead(false);
        setMarkReadAttempts(0);
      }
    });

    // Start auto-sync for real-time updates
    messageStorageService.startAutoSync(getAppointmentIdForStorage());

    return () => {
      if (messageStorageService) {
        messageStorageService.unregisterUpdateCallback(getAppointmentIdForStorage());
        messageStorageService.stopAutoSync(getAppointmentIdForStorage());
      }
    };
  }, [messages, currentUserId]);

  // Mark messages as read when chat is viewed
  const markMessagesAsRead = async () => {
    if (!user?.id || isMarkingAsRead || markReadAttempts >= MAX_MARK_READ_ATTEMPTS) return;
    
    // Safety check
    if (!messageStorageService) {
      console.error('❌ messageStorageService not available in markMessagesAsRead');
      return;
    }
    
    // Check if there are any unread messages from other participants
    const hasUnreadMessages = messages.some(message => 
      message.sender_id !== user.id && 
      (!message.read_by || !message.read_by.some(read => read.user_id === user.id))
    );
    
    if (!hasUnreadMessages) {
      setMessagesMarkedAsRead(true);
      return;
    }
    
    try {
      setIsMarkingAsRead(true);
      setMarkReadAttempts(prev => prev + 1);
      await messageStorageService.markMessagesAsRead(getAppointmentIdForStorage(), user.id);
      setMessagesMarkedAsRead(true); // Set flag to prevent re-marking
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Mark messages as read when component mounts and when messages change
  useEffect(() => {
    // Check if there are unread messages that need to be marked
    const hasUnreadMessages = messages.some(message => 
      message.sender_id !== user?.id && 
      (!message.read_by || !message.read_by.some(read => read.user_id === user?.id))
    );
    
    if (messages.length > 0 && !loading && hasUnreadMessages && !isMarkingAsRead && markReadAttempts < MAX_MARK_READ_ATTEMPTS) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        markMessagesAsRead();
      }, 1000); // Increased delay to prevent rapid calls and ensure messages are fully loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, loading, isMarkingAsRead, markReadAttempts, user?.id]);

  // Handle back button press
  const handleBackPress = () => {
    if (isPatient) {
      // Show end session modal for patients in any chat session
      setShowEndSessionModal(true);
    } else {
      // For doctors, just go back
      router.back();
    }
  };

  // Handle session ending
  const handleEndSession = async () => {
    setEndingSession(true);
    try {
      let sessionId;
      
      if (isTextSession) {
        // For text sessions, remove the prefix
        sessionId = appointmentId.replace('text_session_', '');
      } else {
        // For regular appointments, use the appointment ID directly
        sessionId = appointmentId;
      }
      
      const sessionType = isTextSession ? 'text' : 'appointment';
      const result = await sessionService.endSession(sessionId, sessionType);
      
      if (result.status === 'success') {
        // Show rating modal instead of success alert
        setShowEndSessionModal(false);
        setShowRatingModal(true);
      } else {
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
    } catch (error: any) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end session. Please try again.');
    } finally {
      setEndingSession(false);
    }
  };

  // Cancel session ending
  const handleCancelEndSession = () => {
    setShowEndSessionModal(false);
  };

  // Handle rating submission
  const handleSubmitRating = async (rating: number, comment: string) => {
    setSubmittingRating(true);
    try {
      let sessionId;
      if (isTextSession) {
        sessionId = appointmentId.replace('text_session_', '');
      } else {
        sessionId = appointmentId;
      }
      
      // Get doctor and patient IDs from chat info or user context
      const doctorId = chatInfo?.doctor_id || 0;
      const patientId = user?.id || 0;
      
      console.log('🔍 Submitting rating with doctorId:', doctorId, 'patientId:', patientId);
      await sessionService.submitRating(sessionId, rating, comment, doctorId, patientId);
      
      // Show success message and navigate back
      Alert.alert(
        'Thank You!',
        'Your rating has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRatingModal(false);
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Handle rating modal close
  const handleCloseRatingModal = () => {
    setShowRatingModal(false);
    router.back();
  };

  // Debug modal state
  console.log('🔍 showEndSessionModal state:', showEndSessionModal);
  console.log('🔍 showRatingModal state:', showRatingModal);
  console.log('🔍 endingSession state:', endingSession);

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
        <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        {/* Profile Picture */}
        <View style={{ marginRight: 12 }}>
          <ProfilePictureDisplay
            imageUri={chatInfo?.other_participant_profile_picture || null}
            profilePictureUrl={chatInfo?.other_participant_profile_picture_url || null}
            size={40}
            borderColor="#4CAF50"
          />
        </View>
        
        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
            {chatInfo?.other_participant_name || 'Chat'}
          </Text>
        </View>
        
        {/* Call Icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity 
            style={{ 
              padding: 8, 
              marginRight: 1,
            }}
            onPress={() => {
              // TODO: Implement video call functionality
              Alert.alert('Video Call', 'Video call feature coming soon!');
            }}
          >
            <Icon name="video" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ 
              padding: 8,
            }}
            onPress={() => {
              // TODO: Implement audio call functionality
              Alert.alert('Audio Call', 'Audio call feature coming soon!');
            }}
          >
            <Icon name="voice" size={24} color="#4CAF50" />
          </TouchableOpacity>
          

        </View>
        

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
          {/* End-to-End Encryption Message */}
          <View style={{
            backgroundColor: '#E8F5E9',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}>
            <Ionicons 
              name="shield-checkmark" 
              size={18} 
              color="#4CAF50" 
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={{
              fontSize: 12,
              color: '#4CAF50',
              fontWeight: '500',
              flex: 1,
              lineHeight: 16,
            }}>
              Messages are end-to-end encrypted, only people in this chat can read, listen or share them.
            </Text>
          </View>
          {messages.map((message, index) => {
            return (
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
                <ReadReceipt
                  isOwnMessage={message.sender_id === currentUserId}
                  deliveryStatus={message.delivery_status || (message.sender_id === currentUserId ? 'sent' : 'delivered')}
                  readBy={message.read_by}
                  otherParticipantId={
                    chatInfo?.doctor_id === currentUserId 
                      ? chatInfo?.patient_id 
                      : chatInfo?.doctor_id || 
                        (message.sender_id !== currentUserId ? message.sender_id : undefined)
                  }
                  messageTime={message.created_at}
                />
              </View>
            </View>
          );
          })}
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
          {/* Image Button */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement image picker functionality
              Alert.alert('Image', 'Image picker feature coming soon!');
            }}
            style={{
              padding: 8,
              marginRight: 8,
            }}
          >
            <Ionicons name="image" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {/* Camera Button */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement camera functionality
              Alert.alert('Camera', 'Camera feature coming soon!');
            }}
            style={{
              padding: 8,
              marginRight: 8,
            }}
          >
            <Ionicons name="camera" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
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
            onPress={newMessage.trim() ? sendMessage : () => {
              // TODO: Implement voice note functionality
              Alert.alert('Voice Note', 'Voice note feature coming soon!');
            }}
            disabled={sending}
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
            ) : newMessage.trim() ? (
              <Ionicons name="send" size={20} color="#fff" />
            ) : (
              <Ionicons name="mic" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* End Session Modal */}
      <Modal
        visible={showEndSessionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEndSession}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 350,
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#FFE6E6',
              borderRadius: 50,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="warning" size={30} color="#FF4444" />
            </View>
            
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#333',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              End Session?
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            }}>
              Are you sure you want to end this session? This action cannot be undone and will deduct sessions from your plan.
            </Text>
            
            <View style={{
              flexDirection: 'row',
              width: '100%',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={handleCancelEndSession}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  backgroundColor: '#fff',
                }}
                disabled={endingSession}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#666',
                  textAlign: 'center',
                  fontWeight: '500',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleEndSession}
                disabled={endingSession}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: endingSession ? '#E5E5E5' : '#FF4444',
                }}
              >
                {endingSession ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Text style={{
                    fontSize: 16,
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: '500',
                  }}>
                    End Session
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={handleCloseRatingModal}
        onSubmit={handleSubmitRating}
        doctorName={chatInfo?.other_participant_name || 'Doctor'}
        sessionType={isTextSession ? 'instant' : 'appointment'}
      />
    </SafeAreaView>
  );
} 