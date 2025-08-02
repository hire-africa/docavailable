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
import RatingModal from '../../components/RatingModal';
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

  // Handle back button press
  const handleBackPress = () => {
    console.log('🔍 Back button pressed');
    console.log('🔍 isPatient:', isPatient);
    console.log('🔍 isTextSession:', isTextSession);
    console.log('🔍 appointmentId:', appointmentId);
    console.log('🔍 user?.user_type:', user?.user_type);
    
    if (isPatient) {
      console.log('🔍 Showing end session modal for patient');
      // Show end session modal for patients in any chat session
      setShowEndSessionModal(true);
    } else {
      console.log('🔍 Going back directly');
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
      
      console.log('🔍 Ending session with ID:', sessionId);
      const sessionType = isTextSession ? 'text' : 'appointment';
      console.log('🔍 Session type:', sessionType);
      const result = await sessionService.endSession(sessionId, sessionType);
      
      console.log('🔍 Session end result:', result);
      
      if (result.status === 'success') {
        console.log('🔍 Session ended successfully, showing rating modal');
        // Show rating modal instead of success alert
        setShowEndSessionModal(false);
        setShowRatingModal(true);
      } else {
        console.log('🔍 Session end failed:', result);
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
    } catch (error) {
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