import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { Icon } from '../../components/Icon';
import ImageMessage from '../../components/ImageMessage';
import RatingModal from '../../components/RatingModal';
import ReadReceipt from '../../components/ReadReceipt';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { useAuth } from '../../contexts/AuthContext';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';
import { imageService } from '../../services/imageService';
import { Message, messageStorageService } from '../../services/messageStorageService';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import sessionService from '../services/sessionService';

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

interface TextSessionInfo {
  id: number;
  doctor_id: number;
  doctor?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_picture_url?: string;
    profile_picture?: string;
  };
  started_at: string;
  status: string;
  reason?: string;
}

export default function ChatPage() {
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const router = useRouter();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  
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
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sendingVoiceMessage, setSendingVoiceMessage] = useState(false);
  
  // Image handling state
  const [sendingCameraImage, setSendingCameraImage] = useState(false);
  const [sendingGalleryImage, setSendingGalleryImage] = useState(false);
  
  // Add state to track if messages have been marked as read
  // This prevents unnecessary API calls and improves performance
  const [messagesMarkedAsRead, setMessagesMarkedAsRead] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [markReadAttempts, setMarkReadAttempts] = useState(0);
  const MAX_MARK_READ_ATTEMPTS = 3;
  
  // Add state to track if session has ended (for doctors)
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // Text session info state
  const [textSessionInfo, setTextSessionInfo] = useState<TextSessionInfo | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUserId = user?.id || 0;
  
  // Check if current user is a patient
  const isPatient = user?.user_type === 'patient';
  
  // Parse and validate appointment ID
  const isTextSession = appointmentId && appointmentId.startsWith('text_session_');
  const parsedAppointmentId = isTextSession ? appointmentId : (appointmentId ? parseInt(appointmentId, 10) : null);
  
  // Check if user is authenticated
  const isAuthenticated = !!user && !!user.id;
  
  // Show authentication error if user is not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="lock-closed" size={64} color="#FF4444" />
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#333', marginTop: 16, textAlign: 'center' }}>
            Authentication Required
          </Text>
          <Text style={{ fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            You need to be logged in to access this chat. Please log in and try again.
          </Text>
          <TouchableOpacity 
            style={{ 
              marginTop: 24, 
              paddingHorizontal: 24, 
              paddingVertical: 12, 
              backgroundColor: '#4CAF50', 
              borderRadius: 8 
            }}
            onPress={() => router.replace('/login')}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
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
  
  // Helper function to get appointment ID for message storage service
  // For text sessions, pass the full string to enable proper API endpoint formatting
  const getAppointmentIdForStorage = (): number | string => {
    if (isTextSession) {
      return appointmentId; // Return full string like "text_session_52"
    }
    return parsedAppointmentId as number;
  };

  // Helper function to get numeric appointment ID for storage operations
  const getNumericAppointmentId = (): number => {
    if (isTextSession) {
      return parseInt(appointmentId.replace('text_session_', ''), 10);
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
      
      // Load chat info only if authenticated
      if (isAuthenticated) {
        try {
          if (isTextSession) {
            // For text sessions, fetch session info
            const sessionId = appointmentId.replace('text_session_', '');
            const sessionResponse = await apiService.get(`/text-sessions/${sessionId}`);
            if (sessionResponse.success && sessionResponse.data) {
              const sessionData = sessionResponse.data as TextSessionInfo;
              setTextSessionInfo(sessionData);
              
              // Create chat info from text session data
              const chatInfoData: ChatInfo = {
                appointment_id: parseInt(sessionId, 10),
                doctor_id: sessionData.doctor_id,
                other_participant_name: sessionData.doctor?.display_name || 
                  `${sessionData.doctor?.first_name} ${sessionData.doctor?.last_name}`,
                other_participant_profile_picture_url: sessionData.doctor?.profile_picture_url,
                other_participant_profile_picture: sessionData.doctor?.profile_picture,
                appointment_date: sessionData.started_at,
                appointment_time: sessionData.started_at,
                status: sessionData.status,
              };
              setChatInfo(chatInfoData);
              
              // Check if session has ended
              if (sessionData.status === 'ended') {
                setSessionEnded(true);
              }
            }
          } else {
            // For regular appointments, fetch chat info
            const infoResponse = await apiService.get(`/chat/${parsedAppointmentId}/info`);
            if (infoResponse.success && infoResponse.data) {
              // console.log('🔍 Chat Info Response:', infoResponse.data);
              const chatInfoData = infoResponse.data as ChatInfo;
              setChatInfo(chatInfoData);
              
              // Check if session has ended (for doctors)
              if (!isPatient && chatInfoData.status === 'completed') {
                console.log('🏁 Session ended detected for doctor');
                setSessionEnded(true);
              }
            }
          }
        } catch (error) {
          console.error('Error loading chat info:', error);
        }
      }
      
      // Load messages from storage
      const loadedMessages = await messageStorageService.getMessages(getNumericAppointmentId());
      
      // Debug: Log all messages with media URLs
      const mediaMessages = loadedMessages.filter(msg => msg.media_url);
      if (mediaMessages.length > 0) {
        console.log('📱 Found messages with media URLs:', mediaMessages.map(msg => ({
          id: msg.id,
          type: msg.message_type,
          mediaUrl: msg.media_url,
          message: msg.message?.substring(0, 50) + '...'
        })));
      }
      
      setMessages(loadedMessages);
      
      // Mark messages as read if user is authenticated
      if (isAuthenticated && !messagesMarkedAsRead && markReadAttempts < MAX_MARK_READ_ATTEMPTS) {
        markMessagesAsRead();
      }
      
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !isAuthenticated) return;

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
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Safe manual refresh
  const safeRefreshMessages = async () => {
    if (isRefreshing || !isAuthenticated) return;
    
    try {
      setIsRefreshing(true);
      await messageStorageService.loadFromServer(getAppointmentIdForStorage());
    } catch (error: any) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load chat on mount only if authenticated
  useEffect(() => {
    if (messageStorageService && isAuthenticated) {
      loadChat();
      
            // Debug profile picture data
      // console.log('🔍 Chat Profile Picture Debug:', {
      //   user_profile_picture_url: user?.profile_picture_url,
      //   user_profile_picture: user?.profile_picture,
      //   chatInfo_other_participant_profile_picture_url: chatInfo?.other_participant_profile_picture_url,    
      //   chatInfo_other_participant_profile_picture: chatInfo?.other_participant_profile_picture,
      //   currentUserId,
      //   user_id: user?.id
      // });
      
      // Refresh user data to ensure profile pictures are up to date
      if (user && (!user.profile_picture_url || !user.profile_picture)) {
        // console.log('🔄 Refreshing user data to update profile pictures...');
        refreshUserData().catch((error: any) => {
          console.error('Error refreshing user data:', error);
        });
      }
    } else if (!isAuthenticated && !authLoading) {
      // console.log('❌ User not authenticated, skipping chat load');
    }
  }, [isAuthenticated, authLoading]);

  // Debug chatInfo changes
  useEffect(() => {
    if (chatInfo) {
      // console.log('🔍 Chat Header Profile Picture Props:', {
      //   imageUri: chatInfo?.other_participant_profile_picture,
      //   profilePictureUrl: chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture,
      //   chatInfo: chatInfo
      // });
    }
    
    // Debug chat header rendering
    // console.log('🔍 Chat Header Debug:', {
    //   hasChatInfo: !!chatInfo,
    //   profilePictureUrl: chatInfo?.other_participant_profile_picture_url,
    //   profilePicture: chatInfo?.other_participant_profile_picture,
    //   participantName: chatInfo?.other_participant_profile_picture_url
    // });
  }, [chatInfo]);

  // Check for session expiration (auto-end) for text sessions
  useEffect(() => {
    if (!isTextSession || !textSessionInfo || !isAuthenticated) {
      return;
    }

    const checkSessionExpiration = async () => {
      try {
        const sessionId = appointmentId.replace('text_session_', '');
        console.log('🔍 [Chat] Checking session expiration for session:', sessionId);
        
        const response = await sessionService.checkDoctorResponse(sessionId);
        
        // Add null/undefined check before accessing response.status
        if (response && (response.status === 'expired' || response.status === 'ended')) {
          console.log('🔍 [Chat] Session expired/ended:', response.status, response.message);
          
          // For expired sessions, double-check after a short delay to handle race conditions
          if (response.status === 'expired') {
            console.log('🔍 [Chat] Double-checking expired session after 2 seconds...');
            setTimeout(async () => {
              try {
                const doubleCheckResponse = await sessionService.checkDoctorResponse(sessionId);
                console.log('🔍 [Chat] Double-check result:', doubleCheckResponse.status);
                
                // If session is now active, don't show expired alert
                if (doubleCheckResponse && doubleCheckResponse.status === 'active') {
                  console.log('🔍 [Chat] Session is now active, skipping expired alert');
                  return;
                }
                
                // If still expired, show the alert
                if (doubleCheckResponse && (doubleCheckResponse.status === 'expired' || doubleCheckResponse.status === 'ended')) {
                  Alert.alert(
                    'Session Ended',
                    doubleCheckResponse.message || 'Your session has ended automatically.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Store messages and show rating modal
                          handleStoreAndClose();
                        }
                      }
                    ]
                  );
                }
              } catch (error) {
                console.error('Error in double-check:', error);
                // Show the original expired alert if double-check fails
                Alert.alert(
                  'Session Ended',
                  response.message || 'Your session has ended automatically.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Store messages and show rating modal
                        handleStoreAndClose();
                      }
                    }
                  ]
                );
              }
            }, 2000); // Wait 2 seconds before double-checking
          } else {
            // For ended sessions (not expired), show alert immediately
            Alert.alert(
              'Session Ended',
              response.message || 'Your session has ended automatically.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Store messages and show rating modal
                    handleStoreAndClose();
                  }
                }
              ]
            );
          }
        } else if (response && response.status === 'error') {
          console.log('🔍 [Chat] Session check returned error:', response.message);
          // Don't show alert for API errors, just log them
        }
      } catch (error) {
        console.error('Error checking session expiration:', error);
      }
    };

    // Check immediately when component mounts
    checkSessionExpiration();

    // Set up periodic checking every 30 seconds
    const intervalId = setInterval(checkSessionExpiration, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTextSession, textSessionInfo, isAuthenticated, appointmentId]);

  // Register for message updates and start auto-sync only if authenticated
  useEffect(() => {
    // Safety check to ensure messageStorageService is available and user is authenticated
    if (!messageStorageService || !isAuthenticated) {
      console.log('❌ messageStorageService not available or user not authenticated');
      return;
    }

    console.log('🔧 Registering callback for appointment:', getAppointmentIdForStorage());
    console.log('🔧 Numeric ID for callback:', getNumericAppointmentId());

    messageStorageService.registerUpdateCallback(getNumericAppointmentId(), (updatedMessages) => {
      console.log('🔄 CALLBACK TRIGGERED with messages:', updatedMessages.length);
      console.log('🔄 Current messages in state:', messages.length);
      
      // Check if there are new messages from other participants
      const hasNewMessagesFromOthers = updatedMessages.some(message => 
        message.sender_id !== currentUserId && 
        !messages.some(existingMessage => existingMessage.id === message.id)
      );
      
      // Debug: Log delivery status changes for own messages and track image messages
      const imageMessages = updatedMessages.filter(m => m.message_type === 'image');
      console.log(`🔍 Total messages: ${updatedMessages.length}, Image messages: ${imageMessages.length}`);
      
      // CRITICAL FIX: Preserve local messages that might not be in updatedMessages yet
      const localMessages = messages.filter(localMsg => 
        localMsg.sender_id === currentUserId && 
        localMsg.delivery_status === 'sending' &&
        !updatedMessages.some(serverMsg => 
          serverMsg.id === localMsg.id || 
          serverMsg.temp_id === localMsg.temp_id
        )
      );
      
      // Merge local messages with server messages
      const mergedMessages = [...localMessages, ...updatedMessages];
      
      // Remove duplicates based on ID or temp_id
      const uniqueMessages = mergedMessages.filter((message, index, self) => 
        index === self.findIndex(m => 
          m.id === message.id || 
          (m.temp_id && m.temp_id === message.temp_id)
        )
      );
      
      console.log(`🔍 Merged messages: ${mergedMessages.length}, Unique: ${uniqueMessages.length}, Local preserved: ${localMessages.length}`);
      
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
        
        // Special tracking for image messages
        if (message.message_type === 'image') {
          console.log(`📷 Image message detected:`, {
            id: message.id,
            temp_id: message.temp_id,
            media_url: message.media_url?.substring(0, 50) + '...',
            delivery_status: message.delivery_status,
            sender_id: message.sender_id
          });
        }
      });
      
      console.log('🔄 Setting messages to:', uniqueMessages.length);
      setMessages(uniqueMessages);
      
      // Reset the flag when new messages arrive from others so they can be marked as read
      if (hasNewMessagesFromOthers) {
        setMessagesMarkedAsRead(false);
        setMarkReadAttempts(0); // Reset attempts for new messages
        console.log(`🔄 Reset read flags due to new messages from others`);
      }
      
      // Also check if there are any unread messages that need to be marked
      const hasUnreadMessages = uniqueMessages.some(message => 
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
    console.log('🔧 Starting auto-sync for appointment:', getAppointmentIdForStorage());
    messageStorageService.startAutoSync(getNumericAppointmentId());

    return () => {
      if (messageStorageService) {
        console.log('🔧 Unregistering callback for appointment:', getAppointmentIdForStorage());
        messageStorageService.unregisterUpdateCallback(getNumericAppointmentId());
        messageStorageService.stopAutoSync(getNumericAppointmentId());
      }
    };
  }, [currentUserId, isAuthenticated]); // Removed 'messages' from dependency array

  // Mark messages as read when chat is viewed
  const markMessagesAsRead = async () => {
    if (!user?.id || isMarkingAsRead || markReadAttempts >= MAX_MARK_READ_ATTEMPTS || !isAuthenticated) return;
    
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
    
    if (messages.length > 0 && !loading && hasUnreadMessages && !isMarkingAsRead && markReadAttempts < MAX_MARK_READ_ATTEMPTS && isAuthenticated) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        markMessagesAsRead();
      }, 1000); // Increased delay to prevent rapid calls and ensure messages are fully loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, loading, isMarkingAsRead, markReadAttempts, user?.id, isAuthenticated]);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if ((window as any).recordingInterval) {
        clearInterval((window as any).recordingInterval);
        (window as any).recordingInterval = null;
      }
    };
  }, []);

  // Handle back button press
  const handleBackPress = () => {
    if (isPatient) {
      // Check if this is a scheduled appointment that hasn't started yet
      const appointmentStatus = String(chatInfo?.status || '');
      const isConfirmedAppointment = appointmentStatus === 'confirmed' || appointmentStatus === '1';
      
      if (!isTextSession && isConfirmedAppointment) {
        // For confirmed appointments that haven't started, show a different message
        Alert.alert(
          'Scheduled Appointment',
          'This is a scheduled appointment that hasn\'t started yet. You can cancel it from your appointments list.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go Back', onPress: () => router.back() }
          ]
        );
        return;
      }
      
      // Show end session modal for active sessions only
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
      
      // Check if this is a scheduled appointment that hasn't started
      const appointmentStatus = String(chatInfo?.status || '');
      const isConfirmedAppointment = appointmentStatus === 'confirmed' || appointmentStatus === '1';
      
      console.log('🔍 Ending session:', {
        originalAppointmentId: appointmentId,
        isTextSession,
        extractedSessionId: sessionId,
        sessionType: isTextSession ? 'text' : 'appointment',
        appointmentStatus: chatInfo?.status,
        appointmentStatusType: typeof chatInfo?.status,
        appointmentStatusString: appointmentStatus,
        isConfirmedAppointment: isConfirmedAppointment,
        chatInfoKeys: Object.keys(chatInfo || {})
      });
      
      if (!isTextSession && isConfirmedAppointment) {
        Alert.alert(
          'Cannot End Session',
          'This is a scheduled appointment that hasn\'t started yet. You can cancel it from your appointments list.',
          [
            { text: 'OK', onPress: () => setEndingSession(false) }
          ]
        );
        return;
      }
      
      const sessionType = isTextSession ? 'text' : 'appointment';
      // Before ending on server, capture current messages for local archive
      const archiveMessages = await messageStorageService.getMessages(getAppointmentIdForStorage());
      // Strip temp_id and ensure minimal consistency
      const cleanedMessages = archiveMessages.map(m => {
        const { temp_id, ...rest } = m as any;
        return { ...rest, delivery_status: rest.delivery_status || 'sent' };
      });

      const result = await sessionService.endSession(sessionId, sessionType);
      
      if (result.status === 'success') {
        // Build ended session payload for local storage
        const endedSession: EndedSession = {
          appointment_id: getAppointmentIdForStorage(),
          doctor_id: chatInfo?.doctor_id,
          doctor_name: chatInfo?.other_participant_name,
          doctor_profile_picture_url: chatInfo?.other_participant_profile_picture_url,
          doctor_profile_picture: chatInfo?.other_participant_profile_picture,
          patient_id: user?.id || 0,
          patient_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          appointment_date: chatInfo?.appointment_date,
          appointment_time: chatInfo?.appointment_time,
          ended_at: new Date().toISOString(),
          session_duration: undefined,
          session_summary: undefined,
          reason: textSessionInfo?.reason,
          messages: cleanedMessages,
          message_count: cleanedMessages.length,
        };

        try {
          // Store for both patient and doctor
          await endedSessionStorageService.storeEndedSessionForBoth(endedSession);
        } catch (e) {
          console.error('Failed to store ended session locally:', e);
        }

        // Show rating modal instead of success alert
        setShowEndSessionModal(false);
        setShowRatingModal(true);
      } else {
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
    } catch (error: any) {
      console.error('Error ending session:', error);
      
      // Handle specific error cases
      if (error?.response?.status === 404) {
        Alert.alert(
          'Session Not Found', 
          'This session may have already been ended or no longer exists. You can safely close this chat.',
          [
            { text: 'OK', onPress: () => {
              // Store messages locally anyway and close
              handleStoreAndClose();
            }}
          ]
        );
      } else if (error?.response?.status === 403) {
        Alert.alert('Unauthorized', 'You are not authorized to end this session.');
      } else {
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
    } finally {
      setEndingSession(false);
    }
  };

  // Helper function to store messages and close chat
  const handleStoreAndClose = async () => {
    try {
      const archiveMessages = await messageStorageService.getMessages(getAppointmentIdForStorage());
      const cleanedMessages = archiveMessages.map(m => {
        const { temp_id, ...rest } = m as any;
        return { ...rest, delivery_status: rest.delivery_status || 'sent' };
      });

      const endedSession: EndedSession = {
        appointment_id: getAppointmentIdForStorage(),
        doctor_id: chatInfo?.doctor_id,
        doctor_name: chatInfo?.other_participant_name,
        doctor_profile_picture_url: chatInfo?.other_participant_profile_picture_url,
        doctor_profile_picture: chatInfo?.other_participant_profile_picture,
        patient_id: user?.id || 0,
        patient_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        appointment_date: chatInfo?.appointment_date,
        appointment_time: chatInfo?.appointment_time,
        ended_at: new Date().toISOString(),
        session_duration: undefined,
        session_summary: undefined,
        reason: textSessionInfo?.reason,
        messages: cleanedMessages,
        message_count: cleanedMessages.length,
      };

      await endedSessionStorageService.storeEndedSessionForBoth(endedSession);
      setShowEndSessionModal(false);
      setShowRatingModal(true);
    } catch (e) {
      console.error('Failed to store session locally:', e);
      setShowEndSessionModal(false);
      router.back();
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
      
      // console.log('🔍 Submitting rating with doctorId:', doctorId, 'patientId:', patientId);
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const success = await voiceRecordingService.startRecording();
      if (success) {
        setIsRecording(true);
        setRecordingDuration(0);
        setRecordingUri(null);
        
        // Start duration timer
        const interval = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
        // Store interval reference for cleanup
        (window as any).recordingInterval = interval;
      } else {
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      const uri = await voiceRecordingService.stopRecording();
      if (uri) {
        setRecordingUri(uri);
        setIsRecording(false);
        
        // Clear duration timer
        if ((window as any).recordingInterval) {
          clearInterval((window as any).recordingInterval);
          (window as any).recordingInterval = null;
        }
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try {
      await voiceRecordingService.cancelRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingUri(null);
      
      // Clear duration timer
      if ((window as any).recordingInterval) {
        clearInterval((window as any).recordingInterval);
        (window as any).recordingInterval = null;
      }
    } catch (error: any) {
      console.error('Error canceling recording:', error);
    }
  };

  const sendVoiceMessage = async () => {
    if (!recordingUri || sendingVoiceMessage) return;
    
    setSendingVoiceMessage(true);
    try {
      const success = await voiceRecordingService.sendVoiceMessage(
        getAppointmentIdForStorage(),
        recordingUri,
        currentUserId,
        user?.first_name + ' ' + user?.last_name || 'Unknown User'
      );
      
      if (success) {
        setRecordingUri(null);
        setRecordingDuration(0);
      } else {
        Alert.alert('Error', 'Failed to send voice message.');
      }
    } catch (error: any) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message.');
    } finally {
      setSendingVoiceMessage(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Image handling functions
  const handleTakePhoto = async () => {
    try {
      setSendingCameraImage(true);
      
      const imageUri = await imageService.takePhoto();
      
      if (imageUri) {
        const success = await imageService.sendImageMessage(
          getAppointmentIdForStorage(),
          imageUri,
          currentUserId,
          `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User'
        );
        
        if (success) {
          // console.log('📷 Photo sent successfully');
        } else {
          console.error('❌ Failed to send photo');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    } finally {
      setSendingCameraImage(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setSendingGalleryImage(true);
      
      const imageUri = await imageService.pickImage();
      
      if (imageUri) {
        const success = await imageService.sendImageMessage(
          getAppointmentIdForStorage(),
          imageUri,
          currentUserId,
          `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User'
        );
        
        if (success) {
          // console.log('📷 Image picked and sent successfully');
        } else {
          console.error('❌ Failed to send picked image');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setSendingGalleryImage(false);
    }
  };

  // Debug modal state
  // console.log('🔍 showEndSessionModal state:', showEndSessionModal);
  // console.log('🔍 showRatingModal state:', showRatingModal);
  // console.log('🔍 endingSession state:', endingSession);

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
          {chatInfo?.other_participant_profile_picture_url ? (
            <Image 
              source={{ uri: chatInfo.other_participant_profile_picture_url }} 
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' }}
              onError={(error) => {
                // console.log('❌ Profile picture URL failed to load:', chatInfo.other_participant_profile_picture_url, error);
              }}
              onLoad={() => {
                // console.log('✅ Profile picture URL loaded successfully:', chatInfo.other_participant_profile_picture_url);
              }}
            />
          ) : chatInfo?.other_participant_profile_picture ? (
            <Image 
              source={{ uri: chatInfo.other_participant_profile_picture }} 
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4CAF50' }}
              onError={(error) => {
                // console.log('❌ Profile picture failed to load:', chatInfo.other_participant_profile_picture, error);
              }}
              onLoad={() => {
                // console.log('✅ Profile picture loaded successfully:', chatInfo.other_participant_profile_picture);
              }}
            />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4CAF50' }}>
              <Ionicons name="person" size={20} color="#4CAF50" />
            </View>
          )}
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
            // Create a unique key that combines multiple identifiers to prevent duplicates
            const uniqueKey = `${message.id}_${message.temp_id || 'no_temp'}_${message.created_at}_${message.sender_id}_${index}`;
            
            // Debug logging for duplicate detection
            if (index > 0) {
              const prevMessage = messages[index - 1];
              const prevKey = `${prevMessage.id}_${prevMessage.temp_id || 'no_temp'}_${prevMessage.created_at}_${prevMessage.sender_id}_${index - 1}`;
              if (uniqueKey === prevKey) {
                console.warn('⚠️ Duplicate key detected:', uniqueKey);
              }
            }
            
            return (
              <View
                key={uniqueKey}
                style={{
                  alignSelf: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                  maxWidth: '80%',
                }}
              >
                {message.message_type === 'voice' && message.media_url ? (
                  // Debug: Log voice message details
                  (() => {
                    console.log('🎵 Rendering voice message:', {
                      messageId: message.id,
                      mediaUrl: message.media_url,
                      messageType: message.message_type
                    });
                    return (
                      <VoiceMessagePlayer
                        audioUri={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                        timestamp={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        deliveryStatus={message.delivery_status || (message.sender_id === currentUserId ? 'sent' : 'delivered')}
                        profilePictureUrl={
                          message.sender_id === currentUserId
                            ? (user?.profile_picture_url || user?.profile_picture || undefined)
                            : (chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture || undefined)
                        }
                      />
                    );
                  })()
                ) : message.message_type === 'image' && message.media_url ? (
                  // Debug: Log image message details
                  (() => {
                    console.log('🖼️ Rendering image message:', {
                      messageId: message.id,
                      mediaUrl: message.media_url,
                      messageType: message.message_type
                    });
                    return (
                      <ImageMessage
                        imageUrl={message.media_url}
                        isOwnMessage={message.sender_id === currentUserId}
                        timestamp={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        deliveryStatus={message.delivery_status || (message.sender_id === currentUserId ? 'sent' : 'delivered')}
                        profilePictureUrl={
                          message.sender_id === currentUserId
                            ? (user?.profile_picture_url || user?.profile_picture || undefined)
                            : (chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture || undefined)
                        }
                        readBy={message.read_by}
                        otherParticipantId={
                          chatInfo?.doctor_id === currentUserId 
                            ? chatInfo?.patient_id 
                            : chatInfo?.doctor_id || 
                              (message.sender_id !== currentUserId ? message.sender_id : undefined)
                        }
                        messageTime={message.created_at}
                      />
                    );
                  })()
                ) : (
                  // Regular text messages with bubble
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
                )}
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
          {/* Session Ended Message for Doctors */}
          {sessionEnded && !isPatient && (
            <View style={{
              position: 'absolute',
              top: -60,
              left: 0,
              right: 0,
              backgroundColor: '#FFF3CD',
              borderTopWidth: 1,
              borderTopColor: '#FFEAA7',
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#856404',
                fontWeight: '500',
                textAlign: 'center',
              }}>
                Session ended by patient • You can no longer send messages
              </Text>
            </View>
          )}

          {/* Image Button */}
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={sendingGalleryImage || sendingCameraImage || sessionEnded}
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingGalleryImage || sendingCameraImage || sessionEnded) ? 0.5 : 1,
            }}
          >
            {sendingGalleryImage ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Ionicons name="image" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          {/* Camera Button */}
          <TouchableOpacity
            onPress={handleTakePhoto}
            disabled={sendingCameraImage || sendingGalleryImage || sessionEnded}
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingCameraImage || sendingGalleryImage || sessionEnded) ? 0.5 : 1,
            }}
          >
            {sendingCameraImage ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Ionicons name="camera" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={sessionEnded && !isPatient ? "Session ended" : "Type a message..."}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              marginRight: 8,
              opacity: sessionEnded && !isPatient ? 0.5 : 1,
            }}
            multiline
            maxLength={1000}
            editable={!(sessionEnded && !isPatient)}
          />
          
          <TouchableOpacity
            onPress={newMessage.trim() ? sendMessage : startRecording}
            disabled={sending || isRecording || sessionEnded}
            style={{
              backgroundColor: newMessage.trim() && !sending ? '#4CAF50' : isRecording ? '#FF4444' : '#E5E5E5',
              borderRadius: 20,
              padding: 12,
              minWidth: 44,
              alignItems: 'center',
              opacity: sessionEnded && !isPatient ? 0.5 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : newMessage.trim() ? (
              <Ionicons name="send" size={20} color="#fff" />
            ) : isRecording ? (
              <Ionicons name="stop" size={20} color="#fff" />
            ) : (
              <Ionicons name="mic" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {/* Voice Recording Interface */}
        {isRecording && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#FFF5F5',
            borderTopWidth: 1,
            borderTopColor: '#FFE5E5',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
            }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#FF4444',
                marginRight: 12,
              }} />
              <Text style={{
                fontSize: 16,
                color: '#FF4444',
                fontWeight: '500',
              }}>
                Recording... {formatDuration(recordingDuration)}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={stopRecording}
              style={{
                backgroundColor: '#FF4444',
                borderRadius: 20,
                padding: 12,
                marginRight: 8,
              }}
            >
              <Ionicons name="stop" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={cancelRecording}
              style={{
                backgroundColor: '#666',
                borderRadius: 20,
                padding: 12,
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Message Preview */}
        {recordingUri && !isRecording && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#F0F8FF',
            borderTopWidth: 1,
            borderTopColor: '#E5F0FF',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
            }}>
              <Ionicons name="mic" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 16,
                color: '#4CAF50',
                fontWeight: '500',
              }}>
                Voice message ready
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={sendVoiceMessage}
              disabled={sendingVoiceMessage}
              style={{
                backgroundColor: '#4CAF50',
                borderRadius: 20,
                padding: 12,
                marginRight: 8,
              }}
            >
              {sendingVoiceMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={cancelRecording}
              style={{
                backgroundColor: '#666',
                borderRadius: 20,
                padding: 12,
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
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
