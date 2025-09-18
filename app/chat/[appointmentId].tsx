import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
    View
} from 'react-native';
import AudioCall from '../../components/AudioCall';
import AudioCallModal from '../../components/AudioCallModal';
import { Icon } from '../../components/Icon';
import ImageMessage from '../../components/ImageMessage';
import RatingModal from '../../components/RatingModal';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import { AudioCallService } from '../../services/audioCallService';
import configService from '../../services/configService';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';
import sessionService from '../../services/sessionService';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { WebRTCChatService } from '../../services/webrtcChatService';
import { webrtcService } from '../../services/webrtcService';
import webrtcSessionService, { SessionStatus } from '../../services/webrtcSessionService';
import { ChatMessage } from '../../types/chat';

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
  appointment_type?: string;
}

interface TextSessionInfo {
  id: number;
  doctor_id: number;
  patient_id: number;
  doctor?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_picture_url?: string;
    profile_picture?: string;
  };
  patient?: {
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
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  
  
  // Add state to track if session has ended (for doctors)
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // Text session info state
  const [textSessionInfo, setTextSessionInfo] = useState<TextSessionInfo | null>(null);
  
  // Audio call modal state
  const [showAudioCallModal, setShowAudioCallModal] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [isAnsweringCall, setIsAnsweringCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState<string>('');
  const [incomingCallerProfilePicture, setIncomingCallerProfilePicture] = useState<string | null>(null);
  const [showDoctorUnavailableModal, setShowDoctorUnavailableModal] = useState(false);
  const [appointmentType, setAppointmentType] = useState<string | null>(null);
  
  // WebRTC session management state
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [doctorResponseTimeRemaining, setDoctorResponseTimeRemaining] = useState<number | null>(null);
  const [sessionDeductionInfo, setSessionDeductionInfo] = useState<any>(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);
  
  // WebRTC audio call state
  const [webrtcReady, setWebrtcReady] = useState(false);
  
  // WebRTC chat service
  const [webrtcChatService, setWebrtcChatService] = useState<WebRTCChatService | null>(null);
  const [isWebRTCServiceActive, setIsWebRTCServiceActive] = useState(false);
  
  // Typing indicator state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [typingDotAnimation] = useState(() => {
    const { Animated } = require('react-native');
    return new Animated.Value(0);
  });
  
  const scrollViewRef = useRef<ScrollView>(null);
  const currentUserId = user?.id || 0;
  
  // Debug current user ID
  console.log('🔍 Current user ID debug:', {
    userId: user?.id,
    currentUserId,
    userType: typeof currentUserId,
    userObject: user
  });

  // Auto-scroll functionality
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  // Check if current user is a patient
  const isPatient = user?.user_type === 'patient';
  const isDoctor = user?.user_type === 'doctor';
  
  // Parse and validate appointment ID
  const isTextSession = appointmentId && appointmentId.startsWith('text_session_');
  
  // Determine if call button should be enabled
  const isCallEnabled = () => {
    const enabled = isTextSession ? true : (appointmentType === 'audio' || appointmentType === 'voice');
    console.log('🔍 [isCallEnabled] Debug:', {
      isTextSession,
      appointmentType,
      enabled,
      webrtcReady,
      showIncomingCall,
      userType: user?.user_type,
      appointmentId,
      chatInfo: chatInfo ? {
        appointment_type: chatInfo.appointment_type,
        status: chatInfo.status
      } : null
    });
    return enabled;
  };

  // Check if call button should be enabled (with fallback for preview builds)
  const isCallButtonEnabled = () => {
    const callEnabled = isCallEnabled();
    // Allow call button if WebRTC is ready OR if audio calls are enabled in environment
    const webrtcReadyOrFallback = webrtcReady || process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS === 'true';
    const enabled = callEnabled && webrtcReadyOrFallback && !showIncomingCall;
    
    console.log('🔍 [isCallButtonEnabled] Debug:', {
      callEnabled,
      webrtcReady,
      webrtcReadyOrFallback,
      showIncomingCall,
      enabled,
      isTextSession,
      appointmentType,
      environmentAudioCalls: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
    });
    
    return enabled;
  };
  const parsedAppointmentId = isTextSession ? appointmentId : (appointmentId ? parseInt(appointmentId, 10) : null);
  
  // Check if user is authenticated
  const isAuthenticated = !!user && !!user.id;

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Load chat on mount only if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadChat();
      
      // Refresh user data to ensure profile pictures are up to date
      if (user && (!user.profile_picture_url || !user.profile_picture)) {
        refreshUserData().catch((error: any) => {
          console.error('Error refreshing user data:', error);
        });
      }
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

  // Initialize WebRTC Chat Service
  useEffect(() => {
    if (!isAuthenticated || !appointmentId) return;

    const initializeWebRTCChat = async () => {
      try {
        console.log('🔌 [WebRTC Chat] Initializing WebRTC chat for appointment:', appointmentId);
        const config = await configService.getConfig();
        console.log('🔧 [WebRTC Chat] Config loaded:', {
          apiUrl: config.apiUrl,
          webrtc: config.webrtc,
          enableAudioCalls: config.webrtc.enableAudioCalls,
          chatSignalingUrl: config.webrtc.chatSignalingUrl
        });
        
        // Debug environment variables for chat
        console.log('🔍 [WebRTC Chat] Environment Variables Debug:', {
          processEnv: {
            WEBRTC_CHAT_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
            ENABLE_AUDIO_CALLS: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
          },
          constantsExtra: {
            WEBRTC_CHAT_SIGNALING_URL: (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
            ENABLE_AUDIO_CALLS: (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
          }
        });
        
        const chatService = new WebRTCChatService({
          baseUrl: config.apiUrl,
          appointmentId: appointmentId,
          userId: currentUserId,
          userName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          apiKey: (user as any)?.api_key || '',
          webrtcConfig: config.webrtc
        }, {
          onMessage: (message) => {
            console.log('📨 [ChatComponent] Message received via WebRTC:', message.id);
            console.log('📨 [ChatComponent] Message details:', {
              id: message.id,
              sender_id: message.sender_id,
              currentUserId: currentUserId,
              message: message.message,
              timestamp: message.created_at,
              isOwnMessage: String(message.sender_id) === String(currentUserId)
            });
            
            setMessages(prev => {
              console.log('📨 [ChatComponent] Current messages count before update:', prev.length);
              
              // Check if message already exists to prevent duplicates
              const existingMessage = prev.find(msg => msg.id === message.id);
              if (existingMessage) {
                console.log('⚠️ [ChatComponent] Message already exists in UI, skipping duplicate:', message.id);
                return prev;
              }
              
              console.log('✅ [ChatComponent] Adding new message to UI:', message.id);
              const newMessages = [...prev, message];
              console.log('📨 [ChatComponent] New messages count after update:', newMessages.length);
              return newMessages;
            });
            scrollToBottom();
          },
          onError: (error) => {
            console.error('❌ [WebRTCChat] Error:', error);
            // Error logged to console only - no modal shown
          }
        });

        console.log('🔌 [WebRTC Chat] Attempting to connect...');
        await chatService.connect();
        console.log('✅ [WebRTC Chat] Connected successfully');
        setWebrtcChatService(chatService);
        setIsWebRTCServiceActive(true);
        
        // Set up typing indicator listener
        chatService.setOnTypingIndicator(handleTypingIndicator);
        
        // Set up WebRTC session service for typing indicators
        if (webrtcSessionService) {
          webrtcSessionService.setOnTypingIndicator(handleTypingIndicator);
        }
        
        // Load existing messages from storage
        const existingMessages = await chatService.getMessages();
        setMessages(existingMessages);
        console.log('✅ [WebRTCChat] Service initialized successfully with', existingMessages.length, 'messages');
        
        // Set up fallback polling for messages in case WebRTC fails
        const fallbackInterval = setInterval(async () => {
          try {
            const currentMessages = await chatService.getMessages();
            if (currentMessages.length > messages.length) {
              console.log('🔄 [Fallback] New messages detected via polling:', currentMessages.length - messages.length);
              setMessages(currentMessages);
            }
          } catch (error) {
            console.error('❌ [Fallback] Error polling messages:', error);
          }
        }, 5000); // Poll every 5 seconds as fallback
        
        // Store interval for cleanup
        (chatService as any).fallbackInterval = fallbackInterval;
      } catch (error) {
        console.error('❌ [WebRTCChat] Failed to initialize:', error);
        console.log('🔄 [WebRTCChat] WebRTC chat failed, but chat will still work with fallback');
        // Set a fallback chat service even if WebRTC fails
        setWebrtcChatService(null);
        setIsWebRTCServiceActive(false);
        // Chat will still work through the backend API fallback
      }
    };

    initializeWebRTCChat();

    return () => {
      if (webrtcChatService) {
        console.log('🔌 [WebRTCChat] Disconnecting service');
        // Clear fallback interval
        if ((webrtcChatService as any).fallbackInterval) {
          clearInterval((webrtcChatService as any).fallbackInterval);
        }
        webrtcChatService.disconnect();
        setIsWebRTCServiceActive(false);
      }
    };
  }, [isAuthenticated, appointmentId, currentUserId, user]);

  // Initialize WebRTC session management
  useEffect(() => {
    if (!isAuthenticated) return;

    const initializeWebRTCSession = async () => {
      try {
        console.log('🔌 [WebRTC Session] Initializing WebRTC session for appointment:', appointmentId);
        await webrtcSessionService.initialize(appointmentId, {
          onSessionActivated: (sessionId: string, sessionType: 'instant' | 'appointment') => {
            console.log('✅ Session activated via WebRTC:', sessionId, sessionType);
            setSessionEnded(false);
            setIsWebRTCConnected(true);
          },
          
          onSessionExpired: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => {
            console.log('⏰ Session expired via WebRTC:', sessionId, reason, sessionType);
            // Session expired - logged to console only, no modal shown
            // Store messages locally and close chat
            handleStoreAndClose();
          },
          
          onSessionEnded: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => {
            console.log('🏁 Session ended via WebRTC:', sessionId, reason, sessionType);
            setSessionEnded(true);
            // Show rating modal or navigate back
            setShowRatingModal(true);
          },
          
          onSessionDeduction: (sessionId: string, deductionData: any, sessionType: 'instant' | 'appointment') => {
            console.log('💰 Session deduction via WebRTC:', deductionData, sessionType);
            setSessionDeductionInfo(deductionData);
            
            // Session deduction logged to console only for instant sessions
            if (sessionType === 'instant') {
              console.log(`📊 Session Deduction: ${deductionData.sessionsDeducted} session(s) deducted. ${deductionData.remainingSessions} remaining.`);
            }
          },
          
          onDoctorResponseTimerStarted: (sessionId: string, timeRemaining: number) => {
            console.log('⏱️ Doctor response timer started:', timeRemaining);
            setDoctorResponseTimeRemaining(timeRemaining);
            
            // Start countdown timer
            const countdown = setInterval(() => {
              setDoctorResponseTimeRemaining(prev => {
                if (prev && prev > 0) {
                  return prev - 1;
                  } else {
                  clearInterval(countdown);
                  return null;
                }
              });
            }, 1000);
          },
          
          onAppointmentStarted: (sessionId: string) => {
            console.log('🚀 Appointment started via WebRTC:', sessionId);
            setIsWebRTCConnected(true);
          },
          
          onSessionStatusUpdate: (status: SessionStatus) => {
            console.log('📊 Session status updated:', status);
            setSessionStatus(status);
          },
          
          onError: (error: string) => {
            console.error('❌ WebRTC session error:', error);
            // Session error logged to console only - no modal shown
          }
        });

        // Request initial session status
        webrtcSessionService.requestSessionStatus();
        setIsWebRTCConnected(true);

        // Initialize WebRTC audio call service
        await initializeWebRTCAudioCalls();

      } catch (error) {
        console.error('❌ Failed to initialize WebRTC session:', error);
        // Connection error logged to console only - no modal shown
      }
    };

    initializeWebRTCSession();

    // Cleanup
    return () => {
      webrtcSessionService.disconnect();
      // Clean up incoming call WebSocket
      if ((global as any).incomingCallWebSocket) {
        (global as any).incomingCallWebSocket.close();
        (global as any).incomingCallWebSocket = null;
      }
    };
  }, [currentUserId, isAuthenticated]);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if ((window as any).recordingInterval) {
        clearInterval((window as any).recordingInterval);
        (window as any).recordingInterval = null;
      }
    };
  }, []);
  
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
              const doctorName = sessionData.doctor?.display_name || 
                `${sessionData.doctor?.first_name} ${sessionData.doctor?.last_name}`;
              const patientName = sessionData.patient?.display_name || 
                `${sessionData.patient?.first_name} ${sessionData.patient?.last_name}`;
              
              const chatInfoData: ChatInfo = {
                appointment_id: parseInt(sessionId, 10),
                doctor_id: sessionData.doctor_id,
                other_participant_name: isPatient ? doctorName : patientName,
                other_participant_profile_picture_url: isPatient ? sessionData.doctor?.profile_picture_url : sessionData.patient?.profile_picture_url,
                other_participant_profile_picture: isPatient ? sessionData.doctor?.profile_picture : sessionData.patient?.profile_picture,
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
              console.log('🔍 Chat Info Response:', infoResponse.data);
              const chatInfoData = infoResponse.data as ChatInfo;
              
              // Ensure other_participant_name is set properly
              if (!chatInfoData.other_participant_name) {
                console.log('⚠️ other_participant_name is missing, using fallback');
                // Try to get the name from other fields or use a fallback
                if (isPatient) {
                  // If current user is patient, other participant is doctor
                  chatInfoData.other_participant_name = 'Doctor';
                } else {
                  // If current user is doctor, other participant is patient
                  chatInfoData.other_participant_name = 'Patient';
                }
              }
              
              setChatInfo(chatInfoData);
              
              // Set appointment type for call button logic
              console.log('📅 [ChatInfo] Loading appointment type:', {
                appointment_type: chatInfoData.appointment_type,
                status: chatInfoData.status,
                appointment_id: chatInfoData.appointment_id
              });
              if (chatInfoData.appointment_type) {
                setAppointmentType(chatInfoData.appointment_type);
                console.log('✅ [ChatInfo] Appointment type set:', chatInfoData.appointment_type);
              } else {
                console.log('⚠️ [ChatInfo] No appointment type found in chat info');
              }
              
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
      
      // Load messages from WebRTC chat service or fallback to backend API
      if (webrtcChatService) {
        const loadedMessages = await webrtcChatService.getMessages();
        setMessages(loadedMessages);
      } else {
        // Fallback to backend API for loading messages
        console.log('🔄 [ChatComponent] WebRTC not available, loading messages via backend API');
        try {
          const response = await apiService.get(`/chat/${appointmentId}/messages`);
          if (response.success && response.data) {
            setMessages(response.data);
            console.log('✅ [ChatComponent] Messages loaded via backend API:', response.data.length);
          }
        } catch (error) {
          console.error('❌ [ChatComponent] Failed to load messages via backend API:', error);
        }
      }
      
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message via WebRTC or fallback to backend API
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      
      if (webrtcChatService) {
        // Use WebRTC chat service if available
        console.log('📤 [ChatComponent] Sending message via WebRTC:', newMessage.trim());
        const message = await webrtcChatService.sendMessage(newMessage.trim());
        if (message) {
          setNewMessage('');
          console.log('✅ [ChatComponent] Message sent successfully via WebRTC:', message.id);
        } else {
          console.error('❌ [ChatComponent] Failed to send message via WebRTC - no message returned');
        }
      } else {
        // Fallback to backend API
        console.log('📤 [ChatComponent] WebRTC not available, using backend API fallback');
        await sendMessageViaBackendAPI();
      }
    } catch (error) {
      console.error('❌ [ChatComponent] Error sending message:', error);
      // Try backend API fallback if WebRTC fails
      if (webrtcChatService) {
        console.log('🔄 [ChatComponent] WebRTC failed, trying backend API fallback');
        try {
          await sendMessageViaBackendAPI();
        } catch (fallbackError) {
          console.error('❌ [ChatComponent] Backend API fallback also failed:', fallbackError);
        }
      }
    } finally {
      setSending(false);
    }
  };

  // Fallback method to send message via backend API
  const sendMessageViaBackendAPI = async () => {
    try {
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: newMessage.trim(),
        message_type: 'text'
      });
      
      if (response.success) {
        setNewMessage('');
        console.log('✅ [ChatComponent] Message sent successfully via backend API:', response.data.id);
        
        // Add message to local state
        const messageText = newMessage.trim();
        const chatMessage: ChatMessage = {
          id: response.data.id,
          appointment_id: Number(parsedAppointmentId) || 0,
          sender_id: currentUserId,
          sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          message: messageText,
          message_type: 'text',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          delivery_status: 'sent'
        };
        
        setMessages(prev => [...prev, chatMessage]);
        scrollToBottom();
      } else {
        console.error('❌ [ChatComponent] Backend API returned error:', response.message);
      }
    } catch (error) {
      console.error('❌ [ChatComponent] Backend API error:', error);
      throw error;
    }
  };

  // Handle typing indicator
  const handleTypingIndicator = (isTyping: boolean, senderId?: number) => {
    console.log('⌨️ [Chat] Typing indicator received:', isTyping, 'from sender:', senderId, 'current user:', currentUserId);
    
    // Only show typing indicator if it's from the other user (not from current user)
    if (senderId && senderId === currentUserId) {
      console.log('⌨️ [Chat] Ignoring typing indicator from current user');
      return;
    }
    
    if (isTyping) {
      setIsOtherUserTyping(true);
      
      // Start dot animation
      const animateDots = () => {
        const { Animated } = require('react-native');
        Animated.sequence([
          Animated.timing(typingDotAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDotAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isOtherUserTyping) {
            animateDots();
          }
        });
      };
      animateDots();
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set timeout to hide typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        setIsOtherUserTyping(false);
        typingDotAnimation.stopAnimation();
      }, 3000) as ReturnType<typeof setTimeout>;
      
      setTypingTimeout(timeout);
    } else {
      setIsOtherUserTyping(false);
      typingDotAnimation.stopAnimation();
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };


  // Initialize WebRTC audio calls
  const initializeWebRTCAudioCalls = async () => {
    try {
      console.log('🔌 Initializing WebRTC audio calls...');
      
      // Check configuration
      const config = configService.getWebRTCConfig();
      console.log('🔧 WebRTC Config:', {
        enableAudioCalls: config.enableAudioCalls,
        signalingUrl: config.signalingUrl,
        chatSignalingUrl: config.chatSignalingUrl
      });
      
      // Debug environment variables for preview builds
      console.log('🔍 Environment Variables Debug:', {
        processEnv: {
          WEBRTC_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL,
          WEBRTC_CHAT_SIGNALING_URL: process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
          ENABLE_AUDIO_CALLS: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
        },
        constantsExtra: {
          WEBRTC_SIGNALING_URL: (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_SIGNALING_URL,
          WEBRTC_CHAT_SIGNALING_URL: (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL,
          ENABLE_AUDIO_CALLS: (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
        },
        fullConfig: config
      });
      
      // Check if audio calls are enabled
      if (!config.enableAudioCalls) {
        console.log('⚠️ Audio calls are disabled in configuration');
        setWebrtcReady(false);
        return;
      }
      
      // Initialize webrtcService
      const webrtcConnected = await webrtcService.initialize();
      if (webrtcConnected) {
        setWebrtcReady(true);
        console.log('✅ WebRTC audio calls ready');
        
        // Set up incoming call listener for both doctors and patients
        setupIncomingCallListener();
      } else {
        console.error('❌ Failed to initialize WebRTC audio calls');
        setWebrtcReady(false);
      }
    } catch (error) {
      console.error('❌ Error initializing WebRTC audio calls:', error);
      setWebrtcReady(false);
    }
  };

  // Set up incoming call listener
  const setupIncomingCallListener = () => {
    if (!appointmentId || !currentUserId) return;

    console.log('📞 Setting up incoming call listener...');
    
    // Clean up any existing connection
    if ((global as any).incomingCallWebSocket) {
      console.log('🧹 Cleaning up existing incoming call WebSocket');
      (global as any).incomingCallWebSocket.close();
    }
    
    // Create WebSocket connection for incoming calls
    const wsUrl = `ws://46.101.123.123:8080/audio-signaling/${appointmentId}`;
    const signalingChannel = new WebSocket(wsUrl);
    
    // Store reference for cleanup
    (global as any).incomingCallWebSocket = signalingChannel;
    
    signalingChannel.onopen = () => {
      console.log('📞 Incoming call WebSocket connected');
    };
    
    signalingChannel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Incoming call message:', message.type);
        
        // If we receive an offer, handle the incoming call
        if (message.type === 'offer') {
          console.log('📞 Offer received - FULL MESSAGE:', JSON.stringify(message, null, 2));
          console.log('📞 Offer received - checking senderId filter:', {
            messageSenderId: message.senderId,
            messageUserId: message.userId,
            currentUserId: currentUserId,
            currentUserIdString: currentUserId.toString(),
            userType: user?.user_type,
            appointmentId: appointmentId,
            userObject: user
          });
          
          // Check if this offer is from ourselves (ignore our own offers)
          const messageSenderId = message.senderId || message.userId;
          const currentUserIdStr = currentUserId.toString();
          
          console.log('📞 Comparing sender IDs:', {
            messageSenderId,
            currentUserIdStr,
            areEqual: messageSenderId === currentUserIdStr,
            messageKeys: Object.keys(message),
            messageType: typeof messageSenderId,
            currentType: typeof currentUserIdStr
          });
          
          // Convert both to strings for comparison
          const senderIdStr = String(messageSenderId || '');
          const currentIdStr = String(currentUserIdStr || '');
          
          console.log('📞 Final comparison:', {
            senderIdStr,
            currentIdStr,
            areEqual: senderIdStr === currentIdStr,
            senderIdLength: senderIdStr.length,
            currentIdLength: currentIdStr.length
          });
          
          if (senderIdStr && currentIdStr && senderIdStr === currentIdStr) {
            console.log('📞 Ignoring own offer - not showing incoming call screen');
            return;
          }
          
          // Additional check: if currentUserId is 0 or invalid, don't show incoming call
          if (!currentUserId || currentUserId === 0) {
            console.log('📞 Invalid currentUserId, not showing incoming call screen');
            return;
          }
          
          console.log('📞 Incoming call detected! Showing incoming call screen...', {
            from: user?.user_type,
            messageType: message.type,
            isReceivingCall: true,
            senderId: message.senderId,
            currentUserId
          });
          // Store the offer for the AudioCallService to use
          (global as any).pendingOffer = message.offer;
          
          // Set caller information for the incoming call screen
          const callerName = user?.user_type === 'doctor' ? 
            (chatInfo?.other_participant_name || 'Patient') : 
            (chatInfo?.other_participant_name || 'Doctor');
          setIncomingCallerName(callerName);
          setIncomingCallerProfilePicture(chatInfo?.other_participant_profile_picture);
          
          // Show Instagram-style incoming call screen (only for receiver)
          setShowIncomingCall(true);
        }
      } catch (error) {
        console.error('❌ Error handling incoming call message:', error);
      }
    };
    
    signalingChannel.onerror = (error) => {
      console.error('❌ Incoming call WebSocket error:', error);
    };
    
    signalingChannel.onclose = () => {
      console.log('📞 Incoming call WebSocket closed');
    };
  };

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
      
      if (isWebRTCConnected) {
        // Use WebRTC session service for real-time ending
        await webrtcSessionService.endSession('manual_end');
        
        // Capture messages for local archive
        const archiveMessages = webrtcChatService ? await webrtcChatService.getMessages() : [];
        const cleanedMessages = archiveMessages.map(m => {
          const { temp_id, ...rest } = m as any;
          return { ...rest, delivery_status: rest.delivery_status || 'sent' };
        });

        // Build ended session payload for local storage
        const endedSession: EndedSession = {
          appointment_id: getNumericAppointmentId(),
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
          await endedSessionStorageService.storeEndedSessionForBoth(endedSession);
          // Clear messages from WebRTC chat service after archiving
          if (webrtcChatService) {
            await webrtcChatService.clearMessages();
          }
        } catch (e) {
          console.error('Failed to store ended session locally:', e);
        }
      } else {
        // Fallback to API calls
        // Before ending on server, capture current messages for local archive
        const archiveMessages = webrtcChatService ? await webrtcChatService.getMessages() : [];
        // Strip temp_id and ensure minimal consistency
        const cleanedMessages = archiveMessages.map(m => {
          const { temp_id, ...rest } = m as any;
          return { ...rest, delivery_status: rest.delivery_status || 'sent' };
        });

        const result = await sessionService.endSession(sessionId, sessionType);
       
       if (result.status === 'success') {
         // Build ended session payload for local storage
         const endedSession: EndedSession = {
           appointment_id: getNumericAppointmentId(),
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
          // Clear messages from WebRTC chat service after archiving
          if (webrtcChatService) {
            await webrtcChatService.clearMessages();
          }
        } catch (e) {
          console.error('Failed to store ended session locally:', e);
        }

        // Show rating modal instead of success alert
        setShowEndSessionModal(false);
        setShowRatingModal(true);
      } else {
        console.error('Failed to end session. Please try again.');
        // Session ending error logged to console only - no modal shown
      }
      }
    } catch (error: any) {
      console.error('Error ending session:', error);
      
      // Handle specific error cases - all logged to console only
      if (error?.response?.status === 404) {
        console.error('Session Not Found: This session may have already been ended or no longer exists. You can safely close this chat.');
        // Store messages locally anyway and close
        handleStoreAndClose();
      } else if (error?.response?.status === 403) {
        console.error('Unauthorized: You are not authorized to end this session.');
      } else {
        console.error('Failed to end session. Please try again.');
      }
    } finally {
      setEndingSession(false);
    }
  };

  // Helper function to store messages and close chat
  const handleStoreAndClose = async () => {
         try {
       const archiveMessages = webrtcChatService ? await webrtcChatService.getMessages() : [];
       const cleanedMessages = archiveMessages.map(m => {
         const { temp_id, ...rest } = m as any;
         return { ...rest, delivery_status: rest.delivery_status || 'sent' };
       });

       const endedSession: EndedSession = {
         appointment_id: getNumericAppointmentId(),
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
      // Clear messages from WebRTC chat service after archiving
      if (webrtcChatService) {
        await webrtcChatService.clearMessages();
      }
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
      // Rating submission error logged to console only - no modal shown
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
        console.error('Failed to start recording. Please check microphone permissions.');
        // Recording error logged to console only - no modal shown
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      // Recording error logged to console only - no modal shown
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
    console.log('📤 [SendVoice] Voice message sending is disabled');
    // Voice message sending disabled - logged to console only
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Image handling functions
  const handleTakePhoto = async () => {
    console.log('📤 [Camera] Image sending is disabled');
    // Image sending disabled - logged to console only
  };

  const handlePickImage = async () => {
    console.log('📤 [Gallery] Image sending is disabled');
    // Image sending disabled - logged to console only
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
        
        {/* Name and Typing Indicator */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
            {isPatient 
              ? (chatInfo?.other_participant_name || 'Doctor')
              : (chatInfo?.other_participant_name || 'Patient')
            }
          </Text>
          {/* Typing Indicator in Header */}
          {isOtherUserTyping && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 2,
            }}>
              <Text style={{
                fontSize: 12,
                color: '#4CAF50',
                fontStyle: 'italic',
                marginRight: 4,
              }}>
                typing
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {(() => {
                  const { Animated } = require('react-native');
                  return (
                    <>
                      <Animated.View style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: '#4CAF50',
                        marginRight: 2,
                        opacity: typingDotAnimation,
                      }} />
                      <Animated.View style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: '#4CAF50',
                        marginRight: 2,
                        opacity: typingDotAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1]
                        }),
                      }} />
                      <Animated.View style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: '#4CAF50',
                        opacity: typingDotAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1]
                        }),
                      }} />
                    </>
                  );
                })()}
              </View>
            </View>
          )}
        </View>
        
        {/* Call Icons - Role-based calling */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity 
            style={{ 
              padding: 8, 
              marginRight: 1,
            }}
            onPress={() => {
              // TODO: Implement video call functionality
              console.log('Video call feature coming soon!');
              // Video call feature coming soon - logged to console only
            }}
          >
            <Icon name="video" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {/* Audio Call Button - Only patients can initiate calls */}
          {user?.user_type === 'patient' && (
            <TouchableOpacity 
              style={{ 
                padding: 8,
                opacity: isCallButtonEnabled() ? 1 : 0.3
              }}
              onPress={() => {
                console.log('🎯 [CallButton] Press state:', {
                  userType: user?.user_type,
                  callEnabled: isCallEnabled(),
                  webrtcReady,
                  showIncomingCall,
                  appointmentType,
                  isTextSession,
                  buttonEnabled: isCallButtonEnabled()
                });
                
                if (isCallButtonEnabled()) {
                  console.log('📞 Patient call button pressed:', {
                    appointmentId,
                    currentUserId,
                    isDoctor: user?.user_type === 'doctor',
                    userType: user?.user_type
                  });
                  
                  // Clear any pending offer before starting new call
                  (global as any).pendingOffer = null;
                  // Clear incoming call flag for outgoing calls
                  (global as any).isIncomingCall = false;
                  
                  // Initialize audio call
                  // AudioCallService is already imported as audioCallService
                  
                  setShowAudioCallModal(true);
                } else if (!webrtcReady && process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS !== 'true') {
                  console.log('Call Not Ready: WebRTC is not ready yet. Please wait a moment.');
                  // Call not ready - logged to console only
                } else {
                  console.log(
                    isTextSession 
                      ? 'Call Not Available: Call feature is not available for this session type.'
                      : 'Call Not Available: Call feature is only available for audio appointments.'
                  );
                  // Call not available - logged to console only
                }
              }}
              disabled={!isCallButtonEnabled()}
            >
              <Icon name="voice" size={24} color={isCallButtonEnabled() ? "#4CAF50" : "#999"} />
            </TouchableOpacity>
          )}
          
          {/* Doctor Status - Doctors can only answer calls */}
          {user?.user_type === 'doctor' && (
            <View style={{ 
              padding: 8,
              opacity: 0.7
            }}>
              <Icon name="voice" size={24} color="#999" />
            </View>
          )}
        </View>
        

      </View>

      {/* WebRTC Session Status */}
      {isWebRTCConnected && (
        <View style={{
          backgroundColor: '#f8f9fa',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
        }}>
          {sessionStatus && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#333',
              }}>
                {sessionStatus.sessionType === 'instant' ? 'Instant Session' : 'Appointment'} • 
                {sessionStatus.status === 'active' ? ' Active' : 
                 sessionStatus.status === 'waiting_for_doctor' ? ' Waiting for Doctor' :
                 sessionStatus.status === 'in_progress' ? ' In Progress' : 
                 sessionStatus.status}
              </Text>
              
              {sessionStatus.remainingTimeMinutes && (
                <Text style={{
                  fontSize: 12,
                  color: '#666',
                }}>
                  {sessionStatus.remainingTimeMinutes} min remaining
                </Text>
              )}
            </View>
          )}
          
          {doctorResponseTimeRemaining && (
            <View style={{
              backgroundColor: '#fff3cd',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              marginBottom: 4,
            }}>
              <Text style={{
                fontSize: 12,
                color: '#856404',
                fontWeight: '500',
              }}>
                ⏱️ Doctor response: {doctorResponseTimeRemaining}s
              </Text>
            </View>
          )}
          
          {sessionDeductionInfo && (
            <View style={{
              backgroundColor: '#d1ecf1',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}>
              <Text style={{
                fontSize: 12,
                color: '#0c5460',
                fontWeight: '500',
              }}>
                💰 {sessionDeductionInfo.sessionsDeducted} session(s) deducted • 
                {sessionDeductionInfo.remainingSessions} remaining
              </Text>
            </View>
          )}
        </View>
      )}


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
                        profilePictureUrl={
                          message.sender_id === currentUserId
                            ? (user?.profile_picture_url || user?.profile_picture || undefined)
                            : (chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture || undefined)
                        }
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
            onChangeText={(text) => {
              setNewMessage(text);
              // Send typing indicator via WebRTC
              if (isWebRTCConnected && webrtcSessionService) {
                webrtcSessionService.sendTypingIndicator(text.length > 0, currentUserId);
              }
            }}
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
        doctorName={isPatient ? (chatInfo?.other_participant_name || 'Doctor') : (user?.display_name || `${user?.first_name} ${user?.last_name}` || 'Doctor')}
        sessionType={isTextSession ? 'instant' : 'appointment'}
      />

      {/* Incoming Call Screen - Now using unified AudioCall */}
      {showIncomingCall && (
        <Modal
          visible={showIncomingCall}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowIncomingCall(false);
            // Send call-rejected signal
            const audioCallService = AudioCallService.getInstance();
            audioCallService.sendMessage({
              type: 'call-rejected',
              appointmentId: appointmentId,
              reason: 'Call declined by user',
              timestamp: new Date().toISOString()
            });
          }}
          statusBarTranslucent={true}
        >
          <AudioCall
            appointmentId={appointmentId}
            userId={currentUserId.toString()}
            isDoctor={!isPatient}
            doctorName={isPatient ? chatInfo?.other_participant_name : user?.display_name || `${user?.first_name} ${user?.last_name}`}
            patientName={isPatient ? user?.display_name || `${user?.first_name} ${user?.last_name}` : (chatInfo?.other_participant_name || 'Patient')}
            otherParticipantProfilePictureUrl={chatInfo?.other_participant_profile_picture_url}
            onEndCall={async () => {
              console.log('📞 Incoming call declined');
              setShowIncomingCall(false);
              
              // Clear pending offer
              (global as any).pendingOffer = null;
              
              // Send call-rejected signal to server
              try {
                const audioCallService = AudioCallService.getInstance();
                const callRejectedMessage = {
                  type: 'call-rejected',
                  appointmentId: appointmentId,
                  reason: 'doctor_on_another_call',
                  timestamp: new Date().toISOString()
                };
                audioCallService.sendMessage(callRejectedMessage);
                console.log('📤 Call-rejected signal sent to server:', callRejectedMessage);
              } catch (error) {
                console.error('❌ Error sending call-rejected signal:', error);
              }
            }}
            onCallAnswered={async () => {
              console.log('📞 Incoming call accepted - transitioning to connected state...');
              
              // Send call-answered signal
              try {
                const audioCallService = AudioCallService.getInstance();
                const callAnsweredMessage = {
                  type: 'call-answered',
                  appointmentId: appointmentId,
                  userId: currentUserId.toString(),
                  senderId: currentUserId.toString(),
                  timestamp: new Date().toISOString()
                };
                audioCallService.sendMessage(callAnsweredMessage);
                console.log('📤 Call-answered signal sent:', callAnsweredMessage);
                
                // Process the incoming call
                await audioCallService.processIncomingCall();
                console.log('✅ Incoming call processed successfully');
                
              } catch (error) {
                console.error('❌ Error processing incoming call:', error);
                // Call processing error logged to console only - no modal shown
              }
            }}
            isIncomingCall={true}
          />
        </Modal>
      )}

      {/* Audio Call Interface - Show when answering incoming call */}
      {showAudioCall && isAnsweringCall && (
        <Modal
          visible={true}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowAudioCall(false);
            setIsAnsweringCall(false);
            const audioCallService = AudioCallService.getInstance();
            audioCallService.endCall();
          }}
          statusBarTranslucent={true}
        >
          <AudioCall
            appointmentId={appointmentId}
            userId={currentUserId.toString()}
            isDoctor={user?.user_type === 'doctor'}
            doctorName={textSessionInfo ? 
              (textSessionInfo.doctor?.display_name?.includes('Dr.') ?
                textSessionInfo.doctor.display_name :
                `Dr. ${textSessionInfo.doctor?.display_name || 'Doctor'}`) :
              chatInfo?.other_participant_name || 'Doctor'
            }
            patientName={textSessionInfo ? 
              'Patient' : 
              chatInfo?.other_participant_name || 'Patient'
            }
            otherParticipantProfilePictureUrl={textSessionInfo?.doctor?.profile_picture || chatInfo?.other_participant_profile_picture}
            onEndCall={() => {
              setShowAudioCall(false);
              setIsAnsweringCall(false);
            }}
            isIncomingCall={true}
          />
        </Modal>
      )}

      {/* Audio Call Modal */}
      <AudioCallModal
        visible={showAudioCallModal && !showIncomingCall}
        onClose={() => {
          setShowAudioCallModal(false);
          // Clear the incoming call flag when closing
          (global as any).isIncomingCall = false;
        }}
        appointmentId={appointmentId}
        userId={currentUserId.toString()}
        isDoctor={!isPatient}
        doctorName={(() => {
          const name = isPatient ? chatInfo?.other_participant_name : user?.display_name || `${user?.first_name} ${user?.last_name}`;
          console.log('🔍 AudioCall doctorName:', { isPatient, name, chatInfo: chatInfo?.other_participant_name, user: user?.display_name });
          return name;
        })()}
        patientName={(() => {
          const name = isPatient ? user?.display_name || `${user?.first_name} ${user?.last_name}` : (chatInfo?.other_participant_name || 'Patient');
          console.log('🔍 AudioCall patientName:', { isPatient, name, chatInfo: chatInfo?.other_participant_name, user: user?.display_name });
          return name;
        })()}
        otherParticipantProfilePictureUrl={chatInfo?.other_participant_profile_picture_url}
        isIncomingCall={!!(global as any).isIncomingCall}
        onCallTimeout={() => setShowDoctorUnavailableModal(true)}
        onCallRejected={() => setShowDoctorUnavailableModal(true)}
      />

      {/* Doctor Unavailable Modal */}
      <Modal
        visible={showDoctorUnavailableModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoctorUnavailableModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            minWidth: 280,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}>
            <Ionicons name="call" size={48} color="#FF4444" style={{ marginBottom: 16 }} />
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#333',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              Doctor Unavailable
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24
            }}>
              The doctor is currently unavailable. They might be attending another patient. Please try again later or send a message.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                minWidth: 120
              }}
              onPress={() => {
                setShowDoctorUnavailableModal(false);
                setShowAudioCallModal(false);
                // Optionally navigate back or stay in chat
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '500',
                textAlign: 'center'
              }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 
