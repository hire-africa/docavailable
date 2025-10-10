import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import InstantSessionTimer from '../../components/InstantSessionTimer';
import RatingModal from '../../components/RatingModal';
import VideoCallModal from '../../components/VideoCallModal';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStateListener } from '../../hooks/useAppStateListener';
import { useInstantSessionDetector } from '../../hooks/useInstantSessionDetector';
import { AudioCallService } from '../../services/audioCallService';
import backgroundSessionTimer, { SessionTimerEvents } from '../../services/backgroundSessionTimer';
import configService from '../../services/configService';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';
import sessionService from '../../services/sessionService';
import sessionTimerNotifier from '../../services/sessionTimerNotifier';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { WebRTCChatService } from '../../services/webrtcChatService';
import { webrtcService } from '../../services/webrtcService';
import webrtcSessionService, { SessionStatus } from '../../services/webrtcSessionService';
import { ChatMessage } from '../../types/chat';
import { apiService } from '../services/apiService';

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

// Safe merge helper to always return a new, deduped, sorted array
function safeMergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  try {
    const map = new Map<string, ChatMessage>();
    
    // Add existing messages to map
    for (const m of prev) {
      const key = String(m.id);
      map.set(key, m);
    }
    
    // Add new messages, only if they don't already exist
    for (const msg of incoming) {
      const key = String(msg.id);
      if (!map.has(key)) {
        map.set(key, msg);
        console.log('🔄 [safeMergeMessages] Adding new message:', { id: msg.id, message: msg.message });
      } else {
        console.log('🔄 [safeMergeMessages] Message already exists, skipping:', { id: msg.id, message: msg.message });
      }
    }
    
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
    
    console.log('🔄 [safeMergeMessages] Result:', { 
      prevCount: prev.length, 
      incomingCount: incoming.length, 
      resultCount: arr.length 
    });
    
    return arr;
  } catch (e) {
    console.log('⚠️ safeMergeMessages failed, appending fallback', e);
    return [...prev, ...incoming];
  }
}

export default function ChatPage() {
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const router = useRouter();
  const { user, token, loading: authLoading, refreshUserData } = useAuth();
  
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
  
  // Session validity state
  const [sessionValid, setSessionValid] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // Audio call modal state
  const [showAudioCallModal, setShowAudioCallModal] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [isAnsweringCall, setIsAnsweringCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState<string>('');
  const [incomingCallerProfilePicture, setIncomingCallerProfilePicture] = useState<string | null>(null);
  const [showDoctorUnavailableModal, setShowDoctorUnavailableModal] = useState(false);
  
  // Video call modal state
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showIncomingVideoCall, setShowIncomingVideoCall] = useState(false);
  const [isAnsweringVideoCall, setIsAnsweringVideoCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [appointmentType, setAppointmentType] = useState<string | null>(null);
  
  // WebRTC session management state
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [doctorResponseTimeRemaining, setDoctorResponseTimeRemaining] = useState<number | null>(null);
  const [sessionDeductionInfo, setSessionDeductionInfo] = useState<any>(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);
  
  // Session duration and deduction tracking state
  const [sessionDuration, setSessionDuration] = useState<number>(0); // in minutes
  const [nextDeductionIn, setNextDeductionIn] = useState<number>(0); // minutes until next deduction
  const [sessionsDeducted, setSessionsDeducted] = useState<number>(0);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
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
  
  // Instant session detection state
  const [showInstantSessionUI, setShowInstantSessionUI] = useState(false);
  
  // Check if this is an instant session
  const isInstantSession = appointmentId.startsWith('text_session_');
  
  // Extract session ID for instant sessions
  const sessionId = isInstantSession ? appointmentId.replace('text_session_', '') : '';
  
  // Get current user ID
  const currentUserId = user?.id || 0;

  // Set up app state listener for background timer management
  useAppStateListener();
  
  // Get doctor ID from chat info or text session info
  const doctorId = chatInfo?.doctor_id || textSessionInfo?.doctor_id || 0; // Use a single source of truth for doctorId
  const patientId = chatInfo?.patient_id || textSessionInfo?.patient_id || 0; // Use a single source of truth for patientId

  // Determine if the hook should be enabled.
  // It requires the session to be an instant session, and for us to have valid IDs and an auth token.
  const isDetectorEnabled = isInstantSession && doctorId > 0 && patientId > 0 && !!token;
  
  // Debug logging for IDs
  // NOTE: This console.log is kept for your debugging purposes.
  console.log('🔍 [InstantSession] IDs Debug:', {
    currentUserId,
    doctorId,
    patientId,
    chatInfoDoctorId: chatInfo?.doctor_id,
    textSessionDoctorId: textSessionInfo?.doctor_id,
    isInstantSession,
    sessionId,
    appointmentId,
    chatInfoLoaded: !!chatInfo,
    textSessionInfoLoaded: !!textSessionInfo,
    loading: loading,
    isDetectorEnabled,
  });
  
  // Instant session detector hook
  const {
    isConnected: instantSessionConnected,
    timerState,
    hasPatientSentMessage,
    hasDoctorResponded,
    isSessionActivated,
    isSessionExpired,
    isTimerActive,
    timeRemaining,
    triggerPatientMessageDetection,
    triggerDoctorMessageDetection,
    forceStateSync,
    updateAuthToken
  } = useInstantSessionDetector({
    sessionId,
    appointmentId,
    patientId: patientId,
    doctorId: doctorId,
    authToken: token || '',
    enabled: isDetectorEnabled
  });

  // Debug auth token
  useEffect(() => {
    console.log('🔑 [InstantSession] Auth token debug:', {
      token: token ? 'Present' : 'Missing',
      tokenLength: token?.length || 0,
      authTokenPassed: (token || '') ? 'Present' : 'Missing',
      userObject: user ? 'Present' : 'Missing',
      userType: user?.user_type
    });
  }, [token, user]);

  // Update auth token in detector when it changes
  useEffect(() => {
    if (token && updateAuthToken) {
      console.log('🔑 [InstantSession] Updating auth token in detector');
      updateAuthToken(token);
    }
  }, [token, updateAuthToken]);

  // Debug instant session detector configuration
  useEffect(() => {
    console.log('🔍 [InstantSession] Detector Config Debug:', {
      sessionId,
      appointmentId,
      patientId: patientId,
      doctorId: doctorId,
      chatInfoPatientId: chatInfo?.patient_id,
      textSessionPatientId: textSessionInfo?.patient_id,
      isInstantSession,
      enabled: isDetectorEnabled
    });
    console.log('🔍 [InstantSession] Full chatInfo object:', chatInfo);
    console.log('🔍 [InstantSession] Full textSessionInfo object:', textSessionInfo);
  }, [sessionId, appointmentId, patientId, doctorId, isInstantSession, isDetectorEnabled, chatInfo, textSessionInfo]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Show instant session UI when patient sends first message or when timer is active
  useEffect(() => {
    // Only show the timer UI when the timer is confirmed to be active by the hook
    if (isInstantSession && isTimerActive && !hasDoctorResponded && !isSessionActivated) {
      setShowInstantSessionUI(true);
    } else if (isInstantSession && (hasDoctorResponded || isSessionActivated)) {
      setShowInstantSessionUI(false);
    } // When the timer is not active, the component will be hidden.
  }, [isInstantSession, hasPatientSentMessage, hasDoctorResponded, isSessionActivated, isTimerActive]);

  // Log when doctor ID becomes available
  useEffect(() => {
    if (isInstantSession && doctorId > 0) {
      console.log('✅ [InstantSession] Doctor ID now available:', doctorId);
      console.log('✅ [InstantSession] Detector should now be enabled');
    }
  }, [isInstantSession, doctorId]);

  // Log when chat info loads
  useEffect(() => {
    if (isInstantSession) {
      console.log('📊 [InstantSession] Chat info loaded:', {
        chatInfo: chatInfo ? 'loaded' : 'not loaded',
        textSessionInfo: textSessionInfo ? 'loaded' : 'not loaded',
        doctorId,
        patientId,
        currentUserId
      });
    }
  }, [isInstantSession, chatInfo, textSessionInfo, doctorId, patientId, currentUserId]);

  // Watch for new messages and trigger instant session detection
  useEffect(() => {
    if (isInstantSession && messages.length > 0) {
      // Check if there are any patient messages
      const patientMessages = messages.filter(msg => msg.sender_id === currentUserId);
      const doctorMessages = messages.filter(msg => msg.sender_id === doctorId);
      
      console.log('📊 [InstantSession] Messages loaded, checking for patient messages:', {
        totalMessages: messages.length,
        patientMessages: patientMessages.length,
        doctorMessages: doctorMessages.length,
        hasPatientSentMessage,
        hasDoctorResponded
      });
      
      // If patient has sent messages but detector hasn't been triggered, trigger it manually
      if (patientMessages.length > 0 && !hasPatientSentMessage) {
        console.log('👤 [InstantSession] Patient messages found but detector not triggered - triggering manually');
        const firstPatientMessage = patientMessages[0];
        console.log('👤 [InstantSession] Triggering detection for existing patient message:', firstPatientMessage.id);
        triggerPatientMessageDetection(firstPatientMessage);
      }
      
      // If doctor has sent messages but detector hasn't been triggered, trigger it manually
      if (doctorMessages.length > 0 && !hasDoctorResponded) {
        console.log('👨‍⚕️ [InstantSession] Doctor messages found but detector not triggered - triggering manually');
        const firstDoctorMessage = doctorMessages[0];
        console.log('👨‍⚕️ [InstantSession] Doctor message details:', {
          messageId: firstDoctorMessage.id,
          senderId: firstDoctorMessage.sender_id,
          doctorId: doctorId,
          hasDoctorResponded: hasDoctorResponded,
          isDoctor: firstDoctorMessage.sender_id === doctorId
        });
        console.log('👨‍⚕️ [InstantSession] Triggering detection for existing doctor message:', firstDoctorMessage.id);
        triggerDoctorMessageDetection(firstDoctorMessage);
      }
    }
  }, [isInstantSession, messages, currentUserId, doctorId, hasPatientSentMessage, hasDoctorResponded, triggerPatientMessageDetection, triggerDoctorMessageDetection]);
  
  // Debug current user ID
  console.log('🔍 Current user ID debug:', {
    userId: user?.id,
    currentUserId,
    userType: typeof currentUserId,
    userObject: user
  });

  // Auto-scroll functionality
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Helper function to merge messages without duplicates
  const mergeMessages = useCallback((existingMessages: ChatMessage[], newMessages: ChatMessage[]): ChatMessage[] => {
    const messageMap = new Map<string, ChatMessage>();
    
    // Add existing messages to map
    existingMessages.forEach(msg => {
      messageMap.set(String(msg.id), msg);
    });
    
    // Add new messages, keeping the most recent version
    newMessages.forEach(msg => {
      const msgId = String(msg.id);
      const existing = messageMap.get(msgId);
      if (!existing || new Date(msg.created_at || msg.timestamp) > new Date(existing.created_at || existing.timestamp)) {
        messageMap.set(msgId, msg);
        if (__DEV__) {
          console.log('🔄 [mergeMessages] Adding new message:', {
            id: msg.id,
            message: msg.message,
            sender_id: msg.sender_id,
            timestamp: msg.timestamp
          });
        }
      } else if (__DEV__) {
        console.log('🔄 [mergeMessages] Message already exists, skipping:', msg.id);
      }
    });
    
    // Convert back to array and sort by timestamp
    const result = Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || a.timestamp).getTime();
      const timeB = new Date(b.created_at || b.timestamp).getTime();
      return timeA - timeB;
    });
    
    if (__DEV__) {
      console.log('🔄 [mergeMessages] Result:', {
        existingCount: existingMessages.length,
        newCount: newMessages.length,
        resultCount: result.length,
        addedCount: result.length - existingMessages.length
      });
    }
    
    return result;
  }, []);
  
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
    console.log('🔍 [WebRTC Chat] useEffect triggered:', { isAuthenticated, appointmentId });
    if (!isAuthenticated || !appointmentId) {
      console.log('🔍 [WebRTC Chat] Skipping initialization - missing requirements:', { isAuthenticated, appointmentId });
      return;
    }

    const initializeWebRTCChat = async () => {
      try {
        console.log('🔌 [WebRTC Chat] Initializing WebRTC chat for appointment:', appointmentId);
        console.log('🔍 [WebRTC Chat] Current user info:', { currentUserId, user: user?.first_name });
        
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
        
        // Determine session type from appointmentId
        const sessionType = appointmentId.startsWith('text_session_') ? 'text_session' : 'appointment';
        
        console.log('🔍 [ChatComponent] Initializing WebRTC chat service with config:', {
          baseUrl: config.apiUrl,
          appointmentId: appointmentId,
          userId: currentUserId,
          sessionType: sessionType,
          webrtcConfig: config.webrtc
        });
        
        console.log('🔧 [WebRTC Chat] Creating WebRTC chat service...');
        console.log('🔍 [WebRTC Chat] Service config:', {
          baseUrl: config.apiUrl,
          appointmentId: appointmentId,
          userId: currentUserId,
          userName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          sessionType: sessionType,
          webrtcConfig: config.webrtc
        });
        
        const chatService = new WebRTCChatService({
          baseUrl: config.apiUrl,
          appointmentId: appointmentId,
          userId: currentUserId,
          userName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          apiKey: (user as any)?.api_key || '',
          sessionType: sessionType,
          webrtcConfig: config.webrtc
        }, {
          onMessage: (message) => {
            if (__DEV__) {
            console.log('📨 [ChatComponent] Message received via WebRTC:', message.id);
            console.log('📨 [ChatComponent] Message details:', {
              id: message.id,
              sender_id: message.sender_id,
              currentUserId: currentUserId,
              message: message.message,
              timestamp: message.created_at,
              isOwnMessage: String(message.sender_id) === String(currentUserId)
            });
            }
            
            setMessages(prev => {
              if (__DEV__) {
              console.log('📨 [ChatComponent] Current messages count before update:', prev.length);
              console.log('📨 [ChatComponent] Previous messages:', prev.map(m => ({ id: m.id, message: m.message })));
              }
              
              const mergedMessages = safeMergeMessages(prev, [message]);
              if (__DEV__) {
              console.log('📨 [ChatComponent] Messages after merge:', mergedMessages.length);
              console.log('📨 [ChatComponent] New messages array:', mergedMessages.map(m => ({ id: m.id, message: m.message })));
              }
              return mergedMessages;
            });
            scrollToBottom();
          },
          onError: (error) => {
            console.error('❌ [WebRTCChat] Error:', error);
            // Error logged to console only - no modal shown
          },
          onSessionEnded: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => {
            console.log('🏁 [ChatComponent] Session ended via WebRTC:', sessionId, reason, sessionType);
            
            // For doctors, show the session ended message
            if (!isPatient) {
              console.log('👨‍⚕️ [ChatComponent] Doctor received session end notification');
              setSessionEnded(true);
              
              // Add a system message to show that the session was ended by the patient
              const systemMessage: ChatMessage = {
                id: `session_ended_${Date.now()}`,
                message: 'Session has been ended by patient',
                sender_id: 0, // System message
                sender_name: 'System',
                created_at: new Date().toISOString(),
                message_type: 'text',
                is_own_message: false,
                delivery_status: 'sent',
                temp_id: undefined
              };
              
              setMessages(prev => [...prev, systemMessage]);
              scrollToBottom();
            }
          }
        });

        console.log('🔌 [WebRTC Chat] Attempting to connect...');
        try {
          await chatService.connect();
          console.log('✅ [WebRTC Chat] Connected successfully');
          console.log('🔧 [WebRTC Chat] Setting WebRTC chat service state...');
          setWebrtcChatService(chatService);
          setIsWebRTCServiceActive(true);
          console.log('✅ [WebRTC Chat] WebRTC chat service state set successfully');
        } catch (connectError) {
          console.error('❌ [WebRTC Chat] Connection failed:', connectError);
          throw connectError; // Re-throw to trigger the catch block below
        }
        
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
        
        // Add debug method to window for testing (only in development)
        if (__DEV__) {
          (window as any).refreshChatMessages = async () => {
            console.log('🔄 [Debug] Manually refreshing messages from server...');
            try {
              const refreshedMessages = await chatService.refreshMessagesFromServer();
              setMessages(refreshedMessages);
              console.log('✅ [Debug] Messages refreshed:', refreshedMessages.length);
            } catch (error) {
              console.error('❌ [Debug] Failed to refresh messages:', error);
            }
          };
          
          // Add debug method to test doctor message detection
          (window as any).testDoctorMessageDetection = (message: any) => {
            console.log('🧪 [Debug] Testing doctor message detection with:', message);
            if (triggerDoctorMessageDetection) {
              triggerDoctorMessageDetection(message);
            } else {
              console.error('❌ [Debug] triggerDoctorMessageDetection not available');
            }
          };
          
          // Add debug method to force state sync
          (window as any).forceStateSync = () => {
            console.log('🔄 [Debug] Forcing state synchronization...');
            if (forceStateSync) {
              forceStateSync();
            } else {
              console.error('❌ [Debug] forceStateSync not available');
            }
          };
        }
        
        // Set up fallback polling for messages in case WebRTC fails
        const fallbackInterval = setInterval(async () => {
          try {
            const currentMessages = await chatService.getMessages();
            if (currentMessages.length > 0) {
              console.log('🔄 [Fallback] Polling messages:', currentMessages.length);
              // Use merge function to prevent duplicates and loops
              setMessages(prev => {
const mergedMessages = safeMergeMessages(prev, currentMessages);
                if (mergedMessages.length !== prev.length) {
                  console.log('🔄 [Fallback] New messages merged:', mergedMessages.length - prev.length);
                }
                return mergedMessages;
              });
            }
          } catch (error) {
            console.error('❌ [Fallback] Error polling messages:', error);
          }
        }, 10000); // Poll every 10 seconds as fallback (reduced frequency)
        
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

    console.log('🔧 [WebRTC Chat] Calling initializeWebRTCChat...');
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
            console.log('⏰ Session expired via WebRTC:', { sessionId, reason, sessionType });
            
            // For instant sessions, the detector hook handles the state. We should NOT clear messages.
            // The UI will show the "expired" state, but the chat history remains.
            if (sessionType === 'instant') {
              console.log('🔥 [InstantSession] Expiration event received. UI state will be managed by the detector. Not clearing messages.');
            } else {
              // For regular appointments, store messages locally and close the chat.
              handleStoreAndClose();
            }
          },
          
          onSessionEnded: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => {
            console.log('🏁 Session ended via WebRTC:', sessionId, reason, sessionType);
            setSessionEnded(true);
            // Show rating modal or navigate back
            setShowRatingModal(true);
          },
          
          onSessionEndSuccess: (sessionId: string, reason: string, sessionType: 'instant' | 'appointment') => {
            console.log('✅ [DEPRECATED] Session end success via WebRTC:', sessionId, reason, sessionType);
            // This callback is now deprecated for message handling to prevent premature clearing.
            // Message archiving is now handled exclusively by the manual `handleEndSession` function.
            // This callback will now only handle UI state transitions.

            // Update UI state
            setEndingSession(false);
            setShowEndSessionModal(false);
            setSessionEnded(true);
            setShowRatingModal(true);
          },
          
          onSessionEndError: (error: string) => {
            console.log('❌ Session end error via WebRTC:', error);
            setEndingSession(false);
            // Show error alert
            Alert.alert('Error', `Failed to end session: ${error}`);
          },
          
          onSessionDeduction: (sessionId: string, deductionData: any, sessionType: 'instant' | 'appointment') => {
            console.log('💰 Session deduction via WebRTC:', deductionData, sessionType);
            setSessionDeductionInfo(deductionData);
            
            // Update local deduction tracking for instant sessions
            if (sessionType === 'instant') {
              console.log(`📊 Session Deduction: ${deductionData.sessionsDeducted} session(s) deducted. ${deductionData.remainingSessions} remaining.`);
              
              // Update local state to reflect the deduction
              setSessionsDeducted(deductionData.sessionsDeducted || 0);
              setRemainingSessions(deductionData.remainingSessions || 0);
              
              // Show a brief notification about the deduction
              if (deductionData.sessionsDeducted > 0) {
                console.log(`🔔 [SessionTimer] Auto-deduction occurred: ${deductionData.sessionsDeducted} session(s) deducted`);
              }
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

  // Background session timer setup
  useEffect(() => {
    if (!isInstantSession || !sessionId) return;
    
    // Only set up timer for patients, not doctors
    if (user?.user_type !== 'patient') {
      console.log('🕐 [BackgroundTimer] Timer setup skipped - user is not a patient:', user?.user_type);
      return;
    }

    // Set up background timer events
    const timerEvents: SessionTimerEvents = {
      onDeductionTriggered: (sessionId, deductions) => {
        console.log('💰 [BackgroundTimer] Deduction triggered:', { sessionId, deductions });
        setSessionsDeducted(prev => prev + deductions);
        // Refresh session status to get updated remaining sessions
        requestSessionStatus();
      },
      onTimerUpdate: (sessionId, elapsedMinutes, nextDeductionIn) => {
        console.log('🕐 [BackgroundTimer] Timer update:', { sessionId, elapsedMinutes, nextDeductionIn });
        setSessionDuration(elapsedMinutes);
        setNextDeductionIn(nextDeductionIn);
      },
      onSessionEnded: (sessionId) => {
        console.log('🕐 [BackgroundTimer] Session ended:', sessionId);
        setSessionDuration(0);
        setNextDeductionIn(0);
        setSessionsDeducted(0);
      }
    };

    backgroundSessionTimer.setEvents(timerEvents);

    // Check if there's already an active timer for this session
    const existingState = backgroundSessionTimer.getSessionState(sessionId);
    if (existingState && existingState.isActive) {
      console.log('🕐 [BackgroundTimer] Resuming existing timer for session:', sessionId);
      const startTime = new Date(existingState.startTime);
      setSessionStartTime(startTime);
      setSessionsDeducted(existingState.sessionsDeducted);
      
      // Calculate current elapsed time
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      setSessionDuration(elapsedMinutes);
      
      const nextDeductionMinute = Math.ceil(elapsedMinutes / 10) * 10;
      const minutesUntilNextDeduction = Math.max(0, nextDeductionMinute - elapsedMinutes);
      setNextDeductionIn(minutesUntilNextDeduction);
    }

    return () => {
      // Don't stop the timer when component unmounts - let it run in background
      console.log('🕐 [BackgroundTimer] Component unmounted, timer continues in background');
    };
  }, [isInstantSession, sessionId]);

  // Initialize session start time when session is activated
  useEffect(() => {
    console.log('🕐 [SessionTimer] Checking session activation:', {
      isInstantSession,
      isSessionActivated,
      sessionStartTime: sessionStartTime?.toISOString(),
      hasDoctorResponded,
      chatInfoStatus: chatInfo?.status,
      sessionId,
      userType: user?.user_type,
      currentUserId: user?.id
    });
    
    // Only start timer for patients, not doctors
    if (user?.user_type !== 'patient') {
      console.log('🕐 [SessionTimer] Timer skipped - user is not a patient:', user?.user_type);
      return;
    }
    
    // Start timer if session is activated OR if it's an active instant session with doctor response
    const shouldStartTimer = (isInstantSession && isSessionActivated) || 
                            (isInstantSession && chatInfo?.status === 'active' && hasDoctorResponded);
    
    console.log('🕐 [SessionTimer] Timer start conditions:', {
      condition1: isInstantSession && isSessionActivated,
      condition2: isInstantSession && chatInfo?.status === 'active' && hasDoctorResponded,
      shouldStartTimer,
      hasSessionStartTime: !!sessionStartTime
    });
    
    if (shouldStartTimer && !sessionStartTime) {
      const startTime = new Date();
      setSessionStartTime(startTime);
      console.log('🕐 [SessionTimer] Session activated, starting background timer at:', startTime.toISOString());
      
      // Start background timer
      backgroundSessionTimer.startSessionTimer(sessionId, startTime);
      
      // Request initial session status to get current deduction info
      requestSessionStatus();
    } else if (shouldStartTimer && sessionStartTime) {
      console.log('🕐 [SessionTimer] Timer already started, checking if background timer is active');
      // Check if background timer is already running
      const existingState = backgroundSessionTimer.getSessionState(sessionId);
      if (!existingState || !existingState.isActive) {
        console.log('🕐 [SessionTimer] Background timer not active, starting it now');
        backgroundSessionTimer.startSessionTimer(sessionId, sessionStartTime);
      } else {
        console.log('🕐 [SessionTimer] Background timer already active');
      }
    }
  }, [isInstantSession, isSessionActivated, sessionStartTime, hasDoctorResponded, chatInfo?.status, sessionId]);

  // Function to request session status from backend
  const requestSessionStatus = async () => {
    if (!isInstantSession || !sessionId) return;
    
    try {
      console.log('🔍 [SessionTimer] Requesting session status for:', sessionId);
      const response = await apiService.get(`/text-sessions/${sessionId}`);
      
      if ((response.data as any)?.success && (response.data as any)?.data) {
        const sessionData = (response.data as any).data;
        console.log('📊 [SessionTimer] Session status received:', sessionData);
        
        // Update deduction info if available
        if (sessionData.sessions_used !== undefined) {
          setSessionsDeducted(sessionData.sessions_used);
        }
        if (sessionData.remaining_sessions !== undefined) {
          setRemainingSessions(sessionData.remaining_sessions);
        }
        
        // Also try to get the actual subscription balance
        if (sessionData.patient?.subscription?.text_sessions_remaining !== undefined) {
          setRemainingSessions(sessionData.patient.subscription.text_sessions_remaining);
          console.log('📊 [SessionTimer] Updated remaining sessions from subscription:', sessionData.patient.subscription.text_sessions_remaining);
        }
        
        // Update session start time if available
        if (sessionData.activated_at && !sessionStartTime) {
          const activatedTime = new Date(sessionData.activated_at);
          setSessionStartTime(activatedTime);
          console.log('🕐 [SessionTimer] Session start time updated from backend:', activatedTime.toISOString());
        }
      }
    } catch (error) {
      console.error('❌ [SessionTimer] Failed to get session status:', error);
    }
  };

  // Function to trigger backend auto-deduction
  const triggerAutoDeduction = async () => {
    if (!isInstantSession || !sessionId) {
      console.log('❌ [SessionTimer] Cannot trigger auto-deduction:', {
        isInstantSession,
        sessionId,
        reason: !isInstantSession ? 'Not instant session' : 'No session ID'
      });
      return;
    }
    
    try {
      console.log('💰 [SessionTimer] Triggering auto-deduction for session:', sessionId);
      const response = await apiService.post(`/text-sessions/${sessionId}/auto-deduction`, {
        triggered_by: 'frontend_timer'
      });
      
      console.log('💰 [SessionTimer] Auto-deduction API response:', response.data);
      
      if ((response.data as any)?.success) {
        const deductionData = (response.data as any).data;
        console.log('✅ [SessionTimer] Auto-deduction processed:', deductionData);
        
        // Update local state with the deduction results
        if (deductionData.deductions_processed > 0) {
          setSessionsDeducted(prev => prev + deductionData.deductions_processed);
          console.log(`🔔 [SessionTimer] ${deductionData.deductions_processed} session(s) deducted via backend`);
        }
        
        // Refresh session status to get updated remaining sessions
        await requestSessionStatus();
      } else {
        console.warn('⚠️ [SessionTimer] Auto-deduction response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ [SessionTimer] Failed to trigger auto-deduction:', error);
    }
  };

  // Update remaining sessions when deduction info changes
  useEffect(() => {
    if (sessionDeductionInfo?.remainingSessions !== undefined) {
      setRemainingSessions(sessionDeductionInfo.remainingSessions);
    }
  }, [sessionDeductionInfo]);

  // Periodic status check to sync with backend deductions
  useEffect(() => {
    if (!isInstantSession || !isSessionActivated || !sessionId) {
      return;
    }

    // Check status every 2 minutes to sync with backend
    const statusCheckInterval = setInterval(() => {
      requestSessionStatus();
    }, 120000); // 2 minutes

    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [isInstantSession, isSessionActivated, sessionId]);

  // Clean up background timer when session ends
  useEffect(() => {
    if (sessionEnded && sessionId) {
      console.log('🕐 [BackgroundTimer] Session ended, cleaning up timer:', sessionId);
      backgroundSessionTimer.endSessionTimer(sessionId);
    }
  }, [sessionEnded, sessionId]);

  // Direct timer start when session becomes active (fallback)
  useEffect(() => {
    if (!isInstantSession || !sessionId || user?.user_type !== 'patient') return;

    // Check if session is active and should start timer
    const shouldStartTimer = chatInfo?.status === 'active' && hasDoctorResponded;
    
    console.log('🚀 [Chat] Checking direct timer start:', {
      sessionId,
      chatStatus: chatInfo?.status,
      hasDoctorResponded,
      shouldStartTimer,
      sessionStartTime: sessionStartTime?.toISOString()
    });
    
    if (shouldStartTimer && !sessionStartTime) {
      console.log('🚀 [Chat] Starting timer directly - session is active:', {
        sessionId,
        chatStatus: chatInfo?.status,
        hasDoctorResponded
      });
      
      const startTime = new Date();
      setSessionStartTime(startTime);
      
      // Start background timer directly
      backgroundSessionTimer.startSessionTimer(sessionId, startTime);
      
      // Request initial session status
      requestSessionStatus();
    }
  }, [isInstantSession, sessionId, chatInfo?.status, hasDoctorResponded, sessionStartTime, user?.user_type]);

  // Listen for real-time timer updates
  useEffect(() => {
    if (!isInstantSession || !sessionId) return;

    const handleTimerUpdate = (update: any) => {
      if (update.sessionId === sessionId) {
        console.log('📡 [Chat] Received timer update:', update);
        setSessionDuration(update.elapsedMinutes);
        setNextDeductionIn(update.nextDeductionIn);
        setSessionsDeducted(update.sessionsDeducted);
      }
    };

    const handleDeduction = (update: any) => {
      if (update.sessionId === sessionId) {
        console.log('📡 [Chat] Received deduction update:', update);
        setSessionsDeducted(prev => prev + update.deductions);
        // Refresh session status to get updated remaining sessions
        requestSessionStatus();
      }
    };

    const handleSessionStarted = (update: any) => {
      if (update.sessionId === sessionId) {
        console.log('📡 [Chat] Session started notification:', update);
        setSessionStartTime(new Date(update.startTime));
      }
    };

    const handleSessionEnded = (update: any) => {
      if (update.sessionId === sessionId) {
        console.log('📡 [Chat] Session ended notification:', update);
        setSessionDuration(0);
        setNextDeductionIn(0);
        setSessionsDeducted(0);
      }
    };

    // Add event listeners
    sessionTimerNotifier.on('timerUpdate', handleTimerUpdate);
    sessionTimerNotifier.on('deduction', handleDeduction);
    sessionTimerNotifier.on('sessionStarted', handleSessionStarted);
    sessionTimerNotifier.on('sessionEnded', handleSessionEnded);

    return () => {
      // Remove event listeners
      sessionTimerNotifier.off('timerUpdate', handleTimerUpdate);
      sessionTimerNotifier.off('deduction', handleDeduction);
      sessionTimerNotifier.off('sessionStarted', handleSessionStarted);
      sessionTimerNotifier.off('sessionEnded', handleSessionEnded);
    };
  }, [isInstantSession, sessionId]);
  
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
            console.log('📊 [InstantSession] Making API call to:', `/text-sessions/${sessionId}`);
            const sessionResponse = await apiService.get(`/text-sessions/${sessionId}`);
            console.log('📊 [InstantSession] Text session API response:', {
              success: sessionResponse.success,
              data: sessionResponse.data,
              sessionId: sessionId,
              error: sessionResponse.error || 'No error'
            });
            
            if (sessionResponse.success && sessionResponse.data) {
              const sessionData = sessionResponse.data as TextSessionInfo;
              
              // Extract doctor and patient IDs from the nested objects
              const actualDoctorId = sessionData.doctor?.id || 0;
              const actualPatientId = sessionData.patient?.id || 0;
              
              console.log('📊 [InstantSession] Text session data loaded:', {
                doctorId: actualDoctorId,
                patientId: actualPatientId,
                sessionId: sessionData.id,
                status: sessionData.status,
                doctorName: sessionData.doctor?.display_name,
                patientName: sessionData.patient?.display_name
              });
              
              console.log('📊 [InstantSession] Patient ID extraction debug:', {
                sessionDataPatient: sessionData.patient,
                sessionDataPatientId: sessionData.patient?.id,
                actualPatientId: actualPatientId,
                type: typeof actualPatientId
              });
              
              // Create a modified session data with the correct IDs
              const modifiedSessionData = {
                ...sessionData,
                doctor_id: actualDoctorId,
                patient_id: actualPatientId
              };
              
              setTextSessionInfo(modifiedSessionData);
            } else {
              console.error('❌ [InstantSession] Failed to load text session data:', {
                success: sessionResponse.success,
                error: sessionResponse.error,
                sessionId: sessionId
              });
              
              // If text session doesn't exist, show error and prevent further actions
              if (sessionResponse.error?.includes('not found') || sessionResponse.error?.includes('404')) {
                console.error('❌ [InstantSession] Text session not found - marking session as invalid');
                setSessionValid(false);
                setSessionError('This text session is no longer available. It may have been ended or expired.');
                setLoading(false);
                return; // Exit early to prevent loading messages
              }
            }
            
            // Create chat info from text session data (only if we have the data)
            if (sessionResponse.success && sessionResponse.data) {
              const sessionData = sessionResponse.data as TextSessionInfo;
              
              // Extract the correct IDs
              const actualDoctorId = sessionData.doctor?.id || 0;
              const actualPatientId = sessionData.patient?.id || 0;
              
              const doctorName = sessionData.doctor?.display_name || 
                `${sessionData.doctor?.first_name} ${sessionData.doctor?.last_name}`;
              const patientName = sessionData.patient?.display_name || 
                `${sessionData.patient?.first_name} ${sessionData.patient?.last_name}`;
              
              const chatInfoData: ChatInfo = {
                appointment_id: parseInt(sessionId, 10),
                doctor_id: actualDoctorId,
                patient_id: actualPatientId,
                other_participant_name: isPatient ? doctorName : patientName,
                other_participant_profile_picture_url: isPatient ? sessionData.doctor?.profile_picture_url : sessionData.patient?.profile_picture_url,
                other_participant_profile_picture: isPatient ? sessionData.doctor?.profile_picture : sessionData.patient?.profile_picture,
                appointment_date: sessionData.started_at,
                appointment_time: sessionData.started_at,
                status: sessionData.status,
              };
              setChatInfo(chatInfoData);
              
              // Debug logging for instant sessions
              if (isInstantSession) {
                console.log('✅ [InstantSession] Chat info loaded for text session:', {
                  doctorId: actualDoctorId,
                  patientId: actualPatientId,
                  sessionId: sessionId,
                  appointmentId: appointmentId
                });
              }
              
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
        
        // FIXED: Also sync with server to get any messages that might not be in local storage
        try {
          console.log('🔄 [ChatComponent] Syncing with server to get latest messages...');
          const syncedMessages = await webrtcChatService.syncWithServer();
          if (syncedMessages.length !== loadedMessages.length) {
            console.log('✅ [ChatComponent] Messages synced with server:', syncedMessages.length);
            // Merge with existing messages to avoid duplicates
            setMessages(prev => {
const mergedMessages = safeMergeMessages(prev, syncedMessages);
              console.log('✅ [ChatComponent] Messages merged from server sync:', mergedMessages.length);
              return mergedMessages;
            });
          }
        } catch (error) {
          console.error('❌ [ChatComponent] Failed to sync with server, using local messages only:', error);
        }
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
    
    // Check if session is valid before sending message
    if (!sessionValid) {
      console.error('❌ [ChatComponent] Cannot send message - session is invalid');
      return;
    }
    
    // Check if session has expired (for instant sessions)
    if (isInstantSession && isSessionExpired) {
      console.error('❌ [ChatComponent] Cannot send message - session has expired');
      return;
    }
    
    try {
      setSending(true);
      
      // Check if this is the first patient message in an instant session
      if (isInstantSession && !hasPatientSentMessage) {
        console.log('👤 [InstantSession] First patient message detected - timer will start');
        console.log('👤 [InstantSession] Current state:', {
          hasPatientSentMessage,
          hasDoctorResponded,
          isSessionActivated,
          isTimerActive,
          timeRemaining
        });
        console.log('👤 [InstantSession] Detector state:', {
          isConnected: instantSessionConnected,
          doctorId,
          currentUserId,
          sessionId,
          appointmentId
        });
      }
      
      console.log('🔍 [ChatComponent] WebRTC chat service state:', {
        hasService: !!webrtcChatService,
        isWebRTCServiceActive: isWebRTCServiceActive,
        serviceType: webrtcChatService ? typeof webrtcChatService : 'null'
      });
      
      if (webrtcChatService) {
        // Use WebRTC chat service if available
        console.log('📤 [ChatComponent] Sending message via WebRTC:', newMessage.trim());
        console.log('🔍 [ChatComponent] WebRTC connection status:', {
          hasService: !!webrtcChatService,
          isConnected: webrtcChatService.isConnected,
          connectionStatus: webrtcChatService.getConnectionStatus()
        });
        try {
          const message = await webrtcChatService.sendMessage(newMessage.trim());
          if (message) {
            setNewMessage('');
            console.log('✅ [ChatComponent] Message sent successfully via WebRTC:', message.id);
            
            // Debug instant session state after message sent
            if (isInstantSession) {
              console.log('👤 [InstantSession] Message sent, checking detector state:', {
                hasPatientSentMessage,
                hasDoctorResponded,
                isSessionActivated,
                isTimerActive,
                timeRemaining,
                messageId: message.id,
                senderId: message.sender_id
              });
              
            // Manually trigger patient message detection for instant sessions
            if (!hasPatientSentMessage && message.sender_id === currentUserId) {
              console.log('👤 [InstantSession] First patient message sent - manually triggering timer');
              triggerPatientMessageDetection(message);
            }
            }
          } else {
            console.error('❌ [ChatComponent] Failed to send message via WebRTC - no message returned');
            // Fallback to backend API
            console.log('🔄 [ChatComponent] WebRTC returned null, trying backend API fallback');
            await sendMessageViaBackendAPI();
          }
        } catch (webrtcError) {
          console.error('❌ [ChatComponent] WebRTC failed:', webrtcError);
          // Fallback to backend API
          console.log('🔄 [ChatComponent] WebRTC failed, trying backend API fallback');
          await sendMessageViaBackendAPI();
        }
        
      } else {
        // Fallback to backend API
        console.log('📤 [ChatComponent] WebRTC not available, using backend API fallback');
        await sendMessageViaBackendAPI();
      }
    } catch (error) {
      console.error('❌ [ChatComponent] Unexpected error sending message:', error);
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
        
        // Merge message with existing messages to prevent duplicates
        setMessages(prev => {
const mergedMessages = safeMergeMessages(prev, [chatMessage]);
          console.log('✅ [ChatComponent] Message merged with existing messages:', mergedMessages.length);
          console.log('✅ [ChatComponent] New message details:', {
            id: chatMessage.id,
            message: chatMessage.message,
            sender_id: chatMessage.sender_id,
            timestamp: chatMessage.timestamp
          });
          return mergedMessages;
        });
        scrollToBottom();
        
        // Manually trigger message detection for instant sessions
        if (isInstantSession) {
          console.log('🔍 [InstantSession] Message sent, checking detection:', {
            senderId: chatMessage.sender_id,
            currentUserId,
            doctorId,
            hasPatientSentMessage,
            hasDoctorResponded,
            isPatient: chatMessage.sender_id === currentUserId,
            isDoctor: chatMessage.sender_id === doctorId
          });
          
          if (!hasPatientSentMessage && chatMessage.sender_id === currentUserId) {
          console.log('👤 [InstantSession] First patient message sent via backend API - manually triggering timer');
          triggerPatientMessageDetection(chatMessage);
          } else if (!hasDoctorResponded && chatMessage.sender_id === doctorId) {
            console.log('👨‍⚕️ [InstantSession] Doctor message sent via backend API - manually triggering detection');
            console.log('👨‍⚕️ [InstantSession] Doctor message details:', {
              messageId: chatMessage.id,
              senderId: chatMessage.sender_id,
              doctorId: doctorId,
              hasDoctorResponded: hasDoctorResponded
            });
            triggerDoctorMessageDetection(chatMessage);
          }
        }
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
    const wsUrl = `wss://docavailable.org/audio-signaling?appointmentId=${appointmentId}&userId=${userId}`;
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
            userObject: user,
            callType: message.callType || 'audio' // Check if it's video or audio call
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
            callType: message.callType || 'audio',
            isReceivingCall: true,
            senderId: message.senderId,
            currentUserId
          });
          
          // Store the offer for the appropriate service to use
          (global as any).pendingOffer = message.offer;
          
          // Set caller information for the incoming call screen
          const callerName = user?.user_type === 'doctor' ? 
            (chatInfo?.other_participant_name || 'Patient') : 
            (chatInfo?.other_participant_name || 'Doctor');
          setIncomingCallerName(callerName);
          setIncomingCallerProfilePicture(chatInfo?.other_participant_profile_picture);
          
          // Determine call type and show appropriate incoming call screen
          const callType = message.callType || 'audio';
          if (callType === 'video') {
            console.log('📹 Showing incoming video call screen');
            setShowIncomingVideoCall(true);
          } else {
            console.log('📞 Showing incoming audio call screen');
            setShowIncomingCall(true);
          }
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
    console.log('🛑 [End Session] Starting session end process...');
    
    try {
      let sessionId;
      
      if (isTextSession) {
        sessionId = appointmentId.replace('text_session_', '');
      } else {
        sessionId = appointmentId;
      }
      
      // Check if this is a scheduled appointment that hasn't started
      const appointmentStatus = String(chatInfo?.status || '');
      const isConfirmedAppointment = appointmentStatus === 'confirmed' || appointmentStatus === '1';
      
      if (!isTextSession && isConfirmedAppointment) {
        Alert.alert(
          'Cannot End Session',
          'This is a scheduled appointment that hasn\'t started yet. You can cancel it from your appointments list.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const sessionType = isTextSession ? 'text' : 'appointment';
      
      // Call backend to end session
      const result = await sessionService.endSession(sessionId, sessionType);
      
      console.log('🔍 [End Session] Backend response:', result);
      
      if (result.status === 'success') {
        console.log('✅ [End Session] Session ended successfully');
        
        // Archive messages before clearing
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
          reason: textSessionInfo?.reason || 'General Checkup', // Use original reason, fallback to generic
          messages: cleanedMessages,
          message_count: cleanedMessages.length,
        };

        try {
          await endedSessionStorageService.storeEndedSessionForBoth(endedSession);
          if (webrtcChatService) {
            console.log('🧹 Clearing messages from WebRTC service after manual end.');
            await webrtcChatService.clearMessages();
          }
        } catch (e) {
          console.error('Failed to store ended session locally:', e);
        }

        // Update UI - same as test button
        setShowEndSessionModal(false);
        setSessionEnded(true);
        setShowRatingModal(true);
        
        console.log('✅ [End Session] UI updated - showing rating modal');
      } else {
        console.error('❌ [End Session] Failed to end session:', result);
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ [End Session] Error ending session:', error);
      
      if (error?.response?.status === 404) {
        console.error('Session Not Found: This session may have already been ended or no longer exists.');
        // Store messages locally anyway and show rating modal
        setShowEndSessionModal(false);
        setSessionEnded(true);
        setShowRatingModal(true);
      } else if (error?.response?.status === 403) {
        console.error('Unauthorized: You are not authorized to end this session.');
        Alert.alert('Error', 'You are not authorized to end this session.');
      } else {
        console.error('Failed to end session. Please try again.');
        Alert.alert('Error', 'Failed to end session. Please try again.');
      }
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
      
      console.log('🔍 [Rating] Submitting rating with:', {
        sessionId,
        doctorId,
        patientId,
        rating,
        comment: comment.substring(0, 50) + '...'
      });
      
      const result = await sessionService.submitRating(sessionId, rating, comment, doctorId, patientId);
      
      console.log('✅ [Rating] Rating submitted successfully:', result);
      
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
    } catch (error: any) {
      console.error('❌ [Rating] Error submitting rating:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to submit rating. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = 'Rating already exists for this session.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to rate this session.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Session not found.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert(
        'Rating Submission Failed',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => {
              // Keep the rating modal open for retry
            }
          },
          {
            text: 'Skip',
            onPress: () => {
              setShowRatingModal(false);
              router.back();
            }
          }
        ]
      );
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
    if (!recordingUri || !webrtcChatService) return;
    
    try {
      setSendingVoiceMessage(true);
      
      if (webrtcChatService) {
        // Use WebRTC for voice messages
        console.log('📤 [SendVoice] Sending voice message via WebRTC');
        const message = await webrtcChatService.sendVoiceMessage(recordingUri, appointmentId);
        if (message) {
          setRecordingUri(null);
          setRecordingDuration(0);
          console.log('✅ Voice message sent via WebRTC:', message.id);
        }
      } else {
        // Fallback to backend API
        console.log('📤 [SendVoice] WebRTC not available, using backend API fallback');
        await sendVoiceMessageViaBackendAPI();
      }
    } catch (error) {
      console.error('❌ Error sending voice message:', error);
      // Try backend API fallback if WebRTC fails
      if (webrtcChatService) {
        console.log('🔄 WebRTC failed, trying backend API fallback');
        try {
          await sendVoiceMessageViaBackendAPI();
        } catch (fallbackError) {
          console.error('❌ Backend API fallback also failed:', fallbackError);
        }
      }
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
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📤 [Camera] Photo taken, sending via WebRTC');
        
        if (webrtcChatService) {
          const message = await webrtcChatService.sendImageMessage(imageUri, appointmentId);
          if (message) {
            console.log('✅ Camera image sent via WebRTC:', message.id);
          }
        } else {
          console.log('📤 [Camera] WebRTC not available, using backend API fallback');
          await sendImageMessageViaBackendAPI(imageUri);
        }
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
    } finally {
      setSendingCameraImage(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setSendingGalleryImage(true);
      
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        return;
      }

      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📤 [Gallery] Image selected, sending via WebRTC');
        
        if (webrtcChatService) {
          const message = await webrtcChatService.sendImageMessage(imageUri, appointmentId);
          if (message) {
            console.log('✅ Gallery image sent via WebRTC:', message.id);
          }
        } else {
          console.log('📤 [Gallery] WebRTC not available, using backend API fallback');
          await sendImageMessageViaBackendAPI(imageUri);
        }
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
    } finally {
      setSendingGalleryImage(false);
    }
  };

  // Fallback functions for when WebRTC is not available
  const sendVoiceMessageViaBackendAPI = async () => {
    if (!recordingUri) return;
    
    try {
      const { voiceRecordingService } = await import('../../services/voiceRecordingService');
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (isTextSession) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      const success = await voiceRecordingService.sendVoiceMessage(
        numericAppointmentId,
        recordingUri,
        user?.id || 0,
        user?.display_name || 'User'
      );
      
      if (success) {
        setRecordingUri(null);
        setRecordingDuration(0);
        console.log('✅ Voice message sent via backend API');
      }
    } catch (error) {
      console.error('❌ Error sending voice message via backend API:', error);
    }
  };

  const sendImageMessageViaBackendAPI = async (imageUri: string) => {
    try {
      const { imageService } = await import('../../services/imageService');
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (isTextSession) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      const success = await imageService.sendImageMessage(
        numericAppointmentId,
        imageUri,
        user?.id || 0,
        user?.display_name || 'User'
      );
      
      if (success) {
        console.log('✅ Image message sent via backend API');
      }
    } catch (error) {
      console.error('❌ Error sending image message via backend API:', error);
    }
  };

  // Debug modal state
  // console.log('🔍 showEndSessionModal state:', showEndSessionModal);
  console.log('🔍 showRatingModal state:', showRatingModal);
  console.log('🔍 sessionEnded state:', sessionEnded);
  console.log('🔍 endingSession state:', endingSession);

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
              opacity: isCallButtonEnabled() ? 1 : 0.3
            }}
            onPress={() => {
              if (isCallButtonEnabled()) {
                console.log('Starting video call...');
                setShowVideoCallModal(true);
              } else {
                Alert.alert(
                  'Call Not Available',
                  'Video calls are only available during active sessions or when the doctor is online.',
                  [{ text: 'OK' }]
                );
              }
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

      {/* Session Error Message */}
      {!sessionValid && sessionError && (
        <View style={{
          backgroundColor: '#FFEBEE',
          padding: 16,
          marginHorizontal: 16,
          marginTop: 8,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: '#F44336',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="warning" size={20} color="#F44336" />
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#D32F2F',
              marginLeft: 8,
            }}>
              Session Unavailable
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            color: '#D32F2F',
            lineHeight: 20,
          }}>
            {sessionError}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 12,
              padding: 8,
              backgroundColor: '#F44336',
              borderRadius: 6,
              alignSelf: 'flex-start',
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '500',
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
          

          {/* Instant Session Timer */}
          {isInstantSession && showInstantSessionUI && (
            <InstantSessionTimer
              isActive={isTimerActive}
              timeRemaining={timeRemaining}
              hasPatientSentMessage={hasPatientSentMessage}
              hasDoctorResponded={hasDoctorResponded}
              isSessionActivated={isSessionActivated}
              isSessionExpired={isSessionExpired}
              onTimerExpired={() => {
                console.log('⏰ [InstantSession] Timer expired');
                // Handle timer expiration
              }}
            />
          )}
          
          {messages.map((message, index) => {
            // Create a stable unique key using message ID and timestamp
            if (__DEV__ && index === 0) {
              console.log('🔍 [ChatComponent] Rendering messages:', {
                totalMessages: messages.length,
                firstMessage: {
                  id: message.id,
                  message: message.message,
                  sender_id: message.sender_id,
                  timestamp: message.timestamp
                }
              });
            }
            const uniqueKey = message.id ? `msg_${message.id}` : `temp_${message.temp_id || index}_${message.created_at}`;
            
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
                ) : message.message_type === 'image' && message.media_url ? (
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
            disabled={sendingGalleryImage || sendingCameraImage || sessionEnded || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)}
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingGalleryImage || sendingCameraImage || sessionEnded || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)) ? 0.5 : 1,
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
            disabled={sendingCameraImage || sendingGalleryImage || sessionEnded || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)}
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingCameraImage || sendingGalleryImage || sessionEnded || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)) ? 0.5 : 1,
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
            editable={sessionValid}
            style={{
              opacity: sessionValid ? 1 : 0.5
            }}
            placeholder={
              !sessionValid
                ? "Session unavailable - cannot send messages"
                : sessionEnded && !isPatient 
                ? "Session ended" 
                : isInstantSession && hasPatientSentMessage && !hasDoctorResponded && isTimerActive && isPatient
                ? "Waiting for doctor to respond..."
                : isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isTimerActive && isPatient
                ? "Session expired - doctor did not respond"
                : isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isPatient
                ? "Patient is waiting for your response..."
                : "Type a message..."
            }
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              marginRight: 8,
              opacity: (sessionEnded && !isPatient) || (isInstantSession && isSessionExpired) || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ? 0.5 : 1,
              backgroundColor: (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ? '#F5F5F5' : 'white',
            }}
            multiline
            maxLength={1000}
            editable={
              !(sessionEnded && !isPatient) && 
              !(isInstantSession && isSessionExpired) &&
              !(isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)
            }
          />
          
          <TouchableOpacity
            onPress={newMessage.trim() ? sendMessage : startRecording}
            disabled={
              sending || 
              isRecording || 
              sessionEnded || 
              !sessionValid ||
              (isInstantSession && isSessionExpired) ||
              (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient)
            }
            style={{
              backgroundColor: newMessage.trim() && !sending ? '#4CAF50' : isRecording ? '#FF4444' : '#E5E5E5',
              borderRadius: 20,
              padding: 12,
              minWidth: 44,
              alignItems: 'center',
              opacity: (sessionEnded && !isPatient) || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated) ? 0.5 : 1,
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
        submitting={submittingRating}
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
        doctorId={doctorId}
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

      {/* Video Call Modal */}
      {showVideoCallModal && (
        <Modal
          visible={true}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowVideoCallModal(false);
            setShowVideoCall(false);
          }}
          statusBarTranslucent={true}
        >
          <VideoCallModal
            appointmentId={appointmentId}
            userId={currentUserId.toString()}
            isDoctor={user?.user_type === 'doctor'}
            doctorId={doctorId}
            doctorName={chatInfo?.other_participant_name || 'Doctor'}
            patientName={user?.display_name || 'Patient'}
            otherParticipantProfilePictureUrl={chatInfo?.other_participant_profile_picture_url}
            onEndCall={() => {
              setShowVideoCallModal(false);
              setShowVideoCall(false);
            }}
            onCallTimeout={() => {
              setShowVideoCallModal(false);
              setShowVideoCall(false);
            }}
            onCallRejected={() => {
              setShowVideoCallModal(false);
              setShowVideoCall(false);
            }}
            onCallAnswered={() => {
              console.log('Video call answered');
            }}
            isIncomingCall={false}
          />
        </Modal>
      )}

      {/* Incoming Video Call Modal */}
      {showIncomingVideoCall && (
        <Modal
          visible={true}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowIncomingVideoCall(false);
            setShowVideoCall(false);
          }}
          statusBarTranslucent={true}
        >
          <VideoCallModal
            appointmentId={appointmentId}
            userId={currentUserId.toString()}
            isDoctor={user?.user_type === 'doctor'}
            doctorName={incomingCallerName || 'Doctor'}
            patientName={user?.display_name || 'Patient'}
            otherParticipantProfilePictureUrl={incomingCallerProfilePicture}
            onEndCall={() => {
              setShowIncomingVideoCall(false);
              setShowVideoCall(false);
            }}
            onCallTimeout={() => {
              setShowIncomingVideoCall(false);
              setShowVideoCall(false);
            }}
            onCallRejected={() => {
              setShowIncomingVideoCall(false);
              setShowVideoCall(false);
            }}
            onCallAnswered={() => {
              // Don't create a new modal, just transition the existing one
              console.log('📞 Video call answered - transitioning to connected state');
            }}
            isIncomingCall={true}
            onAcceptCall={() => {
              // Don't create a new modal, just transition the existing one
              console.log('📞 Video call accepted - transitioning to connected state');
            }}
            onRejectCall={() => {
              setShowIncomingVideoCall(false);
              setIsAnsweringVideoCall(false);
            }}
          />
        </Modal>
      )}

      {/* Note: Video call state transitions are handled internally by VideoCallModal */}
    </SafeAreaView>
  );
} 
