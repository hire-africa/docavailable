import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AudioCall from '../../components/AudioCall';
import AudioCallModal from '../../components/AudioCallModal';
import { Icon } from '../../components/Icon';
import ImageMessage from '../../components/ImageMessage';
import InstantSessionTimer from '../../components/InstantSessionTimer';
import RatingModal from '../../components/RatingModal';
import ReadReceipt from '../../components/ReadReceipt';
import VideoCallModal from '../../components/VideoCallModal';
import VoiceMessagePlayer from '../../components/VoiceMessagePlayer';
import { useAuth } from '../../contexts/AuthContext';
import { useAnonymousMode } from '../../hooks/useAnonymousMode';
import { useAppStateListener } from '../../hooks/useAppStateListener';
import { useInstantSessionDetector } from '../../hooks/useInstantSessionDetector';
import { useScreenshotPrevention } from '../../hooks/useScreenshotPrevention';
import { AudioCallService } from '../../services/audioCallService';
import backgroundSessionTimer, { SessionTimerEvents } from '../../services/backgroundSessionTimer';
import configService from '../../services/configService';
import { EndedSession, endedSessionStorageService } from '../../services/endedSessionStorageService';
import { sessionService } from '../../services/sessionService';
import sessionTimerNotifier from '../../services/sessionTimerNotifier';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { WebRTCChatService } from '../../services/webrtcChatService';
import { webrtcService } from '../../services/webrtcService';
import webrtcSessionService, { SessionStatus } from '../../services/webrtcSessionService';
import { ChatMessage } from '../../types/chat';

// Extended ChatMessage type with upload tracking
interface ExtendedChatMessage extends ChatMessage {
  _isUploaded?: boolean;
  server_media_url?: string; // Store server URL separately from display URL
}
import {
  getUserTimezone,
  isAppointmentTimeReached
} from '../../utils/appointmentTimeUtils';
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
function safeMergeMessages(prev: ExtendedChatMessage[], incoming: ExtendedChatMessage[]): ExtendedChatMessage[] {
  try {
    const map = new Map<string, ExtendedChatMessage>();
    
    // Add all existing messages to map using unique key
    for (const msg of prev) {
      // Use temp_id if available, otherwise use regular id
      const key = msg.temp_id || String(msg.id);
      map.set(key, msg);
    }
    
    // Add incoming messages, avoiding duplicates and handling immediate messages
    for (const msg of incoming) {
      const key = msg.temp_id || String(msg.id);
      
      // Check if this is a server response for a temp message (text or image)
      // Look for existing temp message with same content/timestamp
      const isTempMessageUpdate = prev.some(existingMsg => {
        // Skip if existing message doesn't have temp_id
        if (!existingMsg.temp_id) return false;
        
        // Check if this is the same message by comparing:
        // 1. Message content (for text)
        // 2. Timestamp proximity (within 5 seconds)
        // 3. Sender ID
        const timeDiff = Math.abs(new Date(existingMsg.created_at).getTime() - new Date(msg.created_at).getTime());
        const sameContent = existingMsg.message === msg.message;
        const sameSender = existingMsg.sender_id === msg.sender_id;
        const closeTime = timeDiff < 5000;
        
        return sameContent && sameSender && closeTime;
      });
      
      if (isTempMessageUpdate) {
        console.log('🔄 Skipping duplicate - server response for temp message:', msg.message?.substring(0, 30));
        continue;
      }
      
      // Check if this is a duplicate of an immediate image message
      if (msg.message_type === 'image' && msg.media_url) {
        // Look for existing message with matching characteristics
        const isDuplicate = prev.some(existingMsg => {
          if (existingMsg.message_type !== 'image') return false;
          
          // Only consider it a duplicate if:
          // 1. Exact same server URL match
          if (existingMsg.server_media_url === msg.media_url) return true;
          
          // 2. Has temp_id and media_url matches (immediate message being updated)
          if (existingMsg.temp_id && existingMsg.media_url === msg.media_url) return true;
          
          // 3. Message uploaded recently (within 3 seconds) with EXACT same URL
          const timeDiff = Math.abs(new Date(existingMsg.created_at).getTime() - new Date(msg.created_at).getTime());
          if (existingMsg._isUploaded && timeDiff < 3000 && existingMsg.server_media_url === msg.media_url) {
            return true;
          }
          
          return false;
        });
        
        if (isDuplicate) {
          console.log('🔄 Skipping duplicate image with same URL');
          continue;
        }
      }
      
      if (!map.has(key)) {
        map.set(key, msg);
        console.log(' [safeMergeMessages] Adding new message:', { id: msg.id, message: msg.message });
      } else {
        console.log(' [safeMergeMessages] Message already exists, skipping:', { id: msg.id, message: msg.message });
      }
    }
    
    // Convert to sorted array
    const arr = Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return ta - tb;
    });
    
    console.log(' [safeMergeMessages] Result:', { 
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
  const { isAnonymousModeEnabled } = useAnonymousMode();
  const { enable: enableScreenshotPrevention } = useScreenshotPrevention();
  
  // Ensure screenshot prevention is enabled when chat loads
  useEffect(() => {
    const enableScreenshotProtection = async () => {
      try {
        console.log('🔒 [Chat] Ensuring screenshot prevention is enabled...');
        
        // Enable screenshot prevention
        await enableScreenshotPrevention();
        console.log('✅ [Chat] Screenshot prevention enabled for chat');
      } catch (error) {
        console.error('❌ [Chat] Failed to enable screenshot prevention:', error);
      }
    };

    enableScreenshotProtection();
  }, [enableScreenshotPrevention]);
  
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  
  
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
  
  // Track if incoming call modal is already showing to prevent duplicates
  const incomingCallShownRef = useRef(false);
  // Track processed offer messages to prevent duplicates
  const processedOffersRef = useRef<Set<string>>(new Set());

  // Handle navigation from notification actions
  const handledNotificationActionRef = useRef(false);
  useEffect(() => {
    if (handledNotificationActionRef.current) return;
    const action = (params as any)?.action as string | undefined;
    const callTypeParam = ((params as any)?.callType as string | undefined)?.toLowerCase();
    const answeredFromCallKeep = (params as any)?.answeredFromCallKeep === 'true'; // ✅ FIX 3
    
    if (!action) return;
    handledNotificationActionRef.current = true;
    
    if (action === 'accept') {
      if (callTypeParam === 'video') {
        setShowIncomingVideoCall(false);
        setIsAnsweringVideoCall(true);
        setShowVideoCallModal(true);
        setShowVideoCall(true);
        
        // ✅ Already answered from CallKeep system UI
        if (answeredFromCallKeep) {
          console.log('✅ [CallKeep] Video call already answered from system UI');
        }
      } else {
        setShowIncomingCall(false);
        setIsAnsweringCall(true);
        setShowAudioCallModal(true);
        setShowAudioCall(true);
        
        // ✅ Already answered from CallKeep system UI
        if (answeredFromCallKeep) {
          console.log('✅ [CallKeep] Audio call already answered from system UI');
        }
      }
    } else if (action === 'reject') {
      setShowIncomingCall(false);
      setShowIncomingVideoCall(false);
    }
  }, [params]);
  
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
  const webrtcServiceRef = useRef<WebRTCChatService | null>(null);
  
  // Appointment time checking state
  const [isAppointmentTime, setIsAppointmentTime] = useState(false);
  const [timeUntilAppointment, setTimeUntilAppointment] = useState<string>('');
  
  // Subscription data for call availability
  const [subscriptionData, setSubscriptionData] = useState<{
    voiceCallsRemaining: number;
    videoCallsRemaining: number;
    isActive: boolean;
  } | null>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState<Date | null>(null);
  
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
  
  // Determine if chat should be enabled based on appointment type
  const isChatEnabled = () => {
    // Chat is always available for text sessions and text appointments
    if (isTextSession) return true;
    if (appointmentType === 'text') return true;
    // For audio/video appointments, chat interface is available but text input is disabled
    if (appointmentType === 'audio' || appointmentType === 'voice' || appointmentType === 'video') return true;
    return false;
  };

  // Determine if text input should be enabled (only for text sessions and text appointments)
  const isTextInputEnabled = () => {
    // Text input only enabled for text sessions and text appointments
    if (isTextSession) return true;
    if (appointmentType === 'text') return true;
    // If appointment type is unknown/null, allow text input as fallback
    if (!appointmentType) return true;
    // For audio/video appointments, text input is disabled
    return false;
  };

  // Check if this is a text appointment (not text session)
  const isTextAppointment = appointmentType === 'text' && !isTextSession;

  // Text appointment session state
  const [textAppointmentSession, setTextAppointmentSession] = useState<{
    isActive: boolean;
    startTime: Date | null;
    lastActivityTime: Date | null;
    hasPatientActivity: boolean;
    hasDoctorActivity: boolean;
    sessionsUsed: number;
    isEnded: boolean;
  }>({
    isActive: false,
    startTime: null,
    lastActivityTime: null,
    hasPatientActivity: false,
    hasDoctorActivity: false,
    sessionsUsed: 0,
    isEnded: false
  });

  // Determine if audio calls should be enabled based on appointment type
  const isAudioCallEnabled = () => {
    // Audio calls available for audio appointments only (NOT text sessions)
    if (isTextSession) return false; // FIX: Disable call buttons for text sessions
    if (appointmentType === 'audio' || appointmentType === 'voice') return true;
    return false;
  };

  // Determine if video calls should be enabled based on appointment type
  const isVideoCallEnabled = () => {
    // Video calls available for video appointments only (NOT text sessions)
    if (isTextSession) return false; // FIX: Disable call buttons for text sessions
    if (appointmentType === 'video') return true;
    return false;
  };

  // Legacy function for backward compatibility (now checks audio calls only)
  const isCallEnabled = () => {
    return isAudioCallEnabled();
  };

  // Fetch subscription data for call availability
  const fetchSubscriptionData = async () => {
    try {
      const response = await apiService.get('/subscription');
      if (response.data) {
        const subData = response.data;
        setSubscriptionData({
          voiceCallsRemaining: subData.voiceCallsRemaining || 0,
          videoCallsRemaining: subData.videoCallsRemaining || 0,
          isActive: subData.isActive || false
        });
        console.log('📊 [Subscription] Data fetched:', {
          voiceCallsRemaining: subData.voiceCallsRemaining,
          videoCallsRemaining: subData.videoCallsRemaining,
          isActive: subData.isActive
        });
      }
    } catch (error) {
      console.error('❌ [Subscription] Failed to fetch subscription data:', error);
    }
  };

  // Check if call button should be enabled (with subscription check)
  const isCallButtonEnabled = (callType: 'voice' | 'video' = 'voice') => {
    // Check if the specific call type is allowed for this appointment type
    const callTypeEnabled = callType === 'voice' ? isAudioCallEnabled() : isVideoCallEnabled();
    
    // Allow call button if WebRTC is ready OR if audio calls are enabled in environment
    const webrtcReadyOrFallback = webrtcReady || process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS === 'true';
    // For appointments, also check if it's appointment time
    const appointmentTimeCheck = isTextSession || isAppointmentTime;
    
    // Check subscription availability
    const hasAvailableSessions = subscriptionData ? (
      callType === 'voice' ? subscriptionData.voiceCallsRemaining > 0 : subscriptionData.videoCallsRemaining > 0
    ) : true; // Allow if no subscription data yet (will be checked on call initiation)
    
    const enabled = callTypeEnabled && webrtcReadyOrFallback && !showIncomingCall && appointmentTimeCheck && hasAvailableSessions;
    
    console.log('🔍 [isCallButtonEnabled] Debug:', {
      callTypeEnabled,
      callType,
      appointmentType,
      isTextSession,
      webrtcReady,
      webrtcReadyOrFallback,
      showIncomingCall,
      isAppointmentTime,
      appointmentTimeCheck,
      hasAvailableSessions,
      subscriptionData,
      enabled,
      environmentAudioCalls: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS
    });
    
    return enabled;
  };
  const parsedAppointmentId = isTextSession ? appointmentId : (appointmentId ? parseInt(appointmentId, 10) : null);
  
  // Check if user is authenticated
  const isAuthenticated = !!user && !!user.id;

  // Fetch subscription data on mount
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'patient') {
      fetchSubscriptionData();
    }
  }, [isAuthenticated, user?.user_type]);

  // Helper function to check if current time is within appointment time
  // IMPORTANT: This only affects scheduled appointments, NOT instant sessions
  const checkAppointmentTime = useCallback(() => {
    // Skip time checking for instant sessions - they work differently
    if (isInstantSession) {
      setIsAppointmentTime(true);
      setTimeUntilAppointment('');
      return;
    }

    if (!chatInfo?.appointment_date || !chatInfo?.appointment_time) {
      setIsAppointmentTime(true); // If no appointment info, allow interaction
      return;
    }

    try {
      // Use the unified appointment time utility
      const userTimezone = getUserTimezone();
      const timeValidation = isAppointmentTimeReached(
        chatInfo.appointment_date,
        chatInfo.appointment_time,
        userTimezone,
        5 // 5-minute buffer to match backend
      );

      if (timeValidation.error) {
        console.error('Error checking appointment time:', timeValidation.error);
        // For scheduled appointments, be more conservative on errors
        setIsAppointmentTime(false);
        setTimeUntilAppointment(`Error: ${timeValidation.error}`);
        return;
      }

      setAppointmentDateTime(timeValidation.appointmentDateTime);
      setIsAppointmentTime(timeValidation.isTimeReached);
      setTimeUntilAppointment(timeValidation.timeUntilAppointment);

      // Debug logging for appointment time validation
      console.log('🕐 [AppointmentTime] Time validation result:', {
        appointment_date: chatInfo.appointment_date,
        appointment_time: chatInfo.appointment_time,
        user_timezone: userTimezone,
        is_time_reached: timeValidation.isTimeReached,
        time_until_appointment: timeValidation.timeUntilAppointment,
        time_difference_ms: timeValidation.timeDifference
      });

    } catch (error) {
      console.error('Error checking appointment time:', error);
      // For scheduled appointments, be conservative on errors
      setIsAppointmentTime(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTimeUntilAppointment(`Error: ${errorMessage}`);
    }
  }, [chatInfo?.appointment_date, chatInfo?.appointment_time, isInstantSession]);

  // Check appointment time when chat info changes
  useEffect(() => {
    checkAppointmentTime();
  }, [checkAppointmentTime]);

  // Start text appointment session when appointment time is reached
  useEffect(() => {
    if (isTextAppointment && isAppointmentTime && !textAppointmentSession.isActive && !textAppointmentSession.isEnded) {
      console.log('🕐 [TextAppointment] Starting text appointment session');
      startTextAppointmentSession();
    }
  }, [isTextAppointment, isAppointmentTime, textAppointmentSession.isActive, textAppointmentSession.isEnded]);

  // Function to start text appointment session via API
  const startTextAppointmentSession = async () => {
    try {
      const response = await apiService.post('/text-appointments/start-session', {
        appointment_id: getNumericAppointmentId(),
        user_timezone: getUserTimezone() // Include user timezone for backend validation
      });

      if (response.success) {
        console.log('✅ [TextAppointment] Session started successfully:', response.data);
        setTextAppointmentSession(prev => ({
          ...prev,
          isActive: true,
          startTime: new Date(response.data.start_time),
          lastActivityTime: new Date(response.data.start_time),
          sessionsUsed: response.data.sessions_used || 0
        }));
      } else {
        console.error('❌ [TextAppointment] Failed to start session:', response.message);
      }
    } catch (error) {
      console.error('❌ [TextAppointment] Error starting session:', error);
    }
  };

  // Function to update text appointment activity via API
  const updateTextAppointmentActivity = async () => {
    try {
      const response = await apiService.post('/text-appointments/update-activity', {
        appointment_id: getNumericAppointmentId(),
        user_timezone: getUserTimezone(), // Include user timezone for backend validation
        user_type: user?.user_type
      });

      if (response.success) {
        console.log('✅ [TextAppointment] Activity updated successfully');
      } else {
        console.error('❌ [TextAppointment] Failed to update activity:', response.message);
      }
    } catch (error) {
      console.error('❌ [TextAppointment] Error updating activity:', error);
    }
  };

  // Monitor activity and handle session logic for text appointments
  useEffect(() => {
    if (!isTextAppointment || !textAppointmentSession.isActive || textAppointmentSession.isEnded) {
      return;
    }

    const checkActivity = () => {
      const now = new Date();
      const timeSinceLastActivity = textAppointmentSession.lastActivityTime 
        ? (now.getTime() - textAppointmentSession.lastActivityTime.getTime()) / (1000 * 60) // minutes
        : 0;

      const timeSinceStart = textAppointmentSession.startTime 
        ? (now.getTime() - textAppointmentSession.startTime.getTime()) / (1000 * 60) // minutes
        : 0;

      // If no activity in first 10 minutes, end session and deduct 1
      if (timeSinceLastActivity >= 10 && !textAppointmentSession.hasPatientActivity && !textAppointmentSession.hasDoctorActivity) {
        console.log('⏰ [TextAppointment] No activity in first 10 minutes, ending session');
        processTextAppointmentDeduction(1, 'no_activity');
        endTextAppointmentSession(1); // Deduct 1 session
        return;
      }

      // If there was activity, check for 10-minute intervals for additional deductions
      if (textAppointmentSession.hasPatientActivity || textAppointmentSession.hasDoctorActivity) {
        // Deduct 1 session every 10 minutes after the first 10 minutes
        const expectedSessionsUsed = Math.floor(timeSinceStart / 10);
        if (expectedSessionsUsed > textAppointmentSession.sessionsUsed) {
          console.log(`⏰ [TextAppointment] 10-minute interval reached, deducting session. Total: ${expectedSessionsUsed}`);
          const sessionsToDeduct = expectedSessionsUsed - textAppointmentSession.sessionsUsed;
          processTextAppointmentDeduction(sessionsToDeduct, 'interval');
          setTextAppointmentSession(prev => ({
            ...prev,
            sessionsUsed: expectedSessionsUsed
          }));
        }
      }

      // FIX: Auto-end session if no activity for 20+ minutes (regardless of previous activity)
      if (timeSinceLastActivity >= 20) {
        console.log('⏰ [TextAppointment] No activity for 20+ minutes, auto-ending session');
        const sessionsToDeduct = Math.max(1, Math.floor(timeSinceStart / 10));
        processTextAppointmentDeduction(sessionsToDeduct, 'timeout');
        endTextAppointmentSession(sessionsToDeduct);
        return;
      }
    };

    const interval = setInterval(checkActivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isTextAppointment, textAppointmentSession]);

  // Function to process text appointment deduction via API
  const processTextAppointmentDeduction = async (sessionsToDeduct: number, reason: string) => {
    try {
      const response = await apiService.post('/text-appointments/process-deduction', {
        appointment_id: getNumericAppointmentId(),
        sessions_to_deduct: sessionsToDeduct,
        reason: reason
      });

      if (response.success) {
        console.log(`✅ [TextAppointment] Deduction processed successfully: ${sessionsToDeduct} sessions, reason: ${reason}`);
      } else {
        console.error('❌ [TextAppointment] Failed to process deduction:', response.message);
      }
    } catch (error) {
      console.error('❌ [TextAppointment] Error processing deduction:', error);
    }
  };

  // Function to end text appointment session
  const endTextAppointmentSession = async (additionalSessions = 0) => {
    const totalSessions = textAppointmentSession.sessionsUsed + additionalSessions;
    console.log(`🏁 [TextAppointment] Ending session, total sessions used: ${totalSessions}`);
    
    try {
      const response = await apiService.post('/text-appointments/end-session', {
        appointment_id: getNumericAppointmentId(),
        sessions_to_deduct: additionalSessions,
        user_timezone: getUserTimezone() // Include user timezone for backend validation
      });

      if (response.success) {
        console.log('✅ [TextAppointment] Session ended successfully via API');
      } else {
        console.error('❌ [TextAppointment] Failed to end session via API:', response.message);
      }
    } catch (error) {
      console.error('❌ [TextAppointment] Error ending session via API:', error);
    }
    
    setTextAppointmentSession(prev => ({
      ...prev,
      isActive: false,
      isEnded: true
    }));
  };

  // Update appointment time check every minute
  useEffect(() => {
    const interval = setInterval(checkAppointmentTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkAppointmentTime]);

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
      console.log('🔍 Chat Header Profile Picture Props:', {
        imageUri: chatInfo?.other_participant_profile_picture,
        profilePictureUrl: chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture,
        chatInfo: chatInfo
      });
    }
    
    // Debug chat header rendering
    console.log('🔍 Chat Header Debug:', {
      hasChatInfo: !!chatInfo,
      profilePictureUrl: chatInfo?.other_participant_profile_picture_url,
      profilePicture: chatInfo?.other_participant_profile_picture,
      participantName: chatInfo?.other_participant_name
    });
  }, [chatInfo]);

  // Initialize WebRTC Chat Service
  useEffect(() => {
    console.log('🔍 [WebRTC Chat] useEffect triggered:', { isAuthenticated, appointmentId });
    if (!isAuthenticated || !appointmentId) {
      console.log('🔍 [WebRTC Chat] Skipping initialization - missing requirements:', { isAuthenticated, appointmentId });
      return;
    }

    // Prevent multiple instances
    if (webrtcServiceRef.current) {
      console.log('⚠️ [WebRTC Chat] Service already exists, skipping initialization');
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

            // Track activity for text appointments when receiving messages
            if (isTextAppointment && textAppointmentSession.isActive && String(message.sender_id) !== String(currentUserId)) {
              console.log('📝 [TextAppointment] Message received - tracking activity');
              updateTextAppointmentActivity();
              setTextAppointmentSession(prev => ({
                ...prev,
                lastActivityTime: new Date(),
                hasPatientActivity: String(message.sender_id) === String(chatInfo?.patient_id) ? true : prev.hasPatientActivity,
                hasDoctorActivity: String(message.sender_id) === String(chatInfo?.doctor_id) ? true : prev.hasDoctorActivity
              }));
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
        console.log('🔍 [WebRTC Chat] Connection details:', {
          url: `${config.webrtc.chatSignalingUrl}?appointmentId=${encodeURIComponent(appointmentId)}&userId=${encodeURIComponent(String(currentUserId))}&authToken=***`,
          appointmentId,
          userId: currentUserId,
          sessionType,
          chatSignalingUrl: config.webrtc.chatSignalingUrl
        });
        
        // Add a timeout to detect connection issues
        const connectionTimeout = setTimeout(() => {
          console.error('❌ [WebRTC Chat] Connection timeout after 15 seconds');
          throw new Error('WebRTC connection timeout');
        }, 15000);
        
        try {
          await chatService.connect();
          clearTimeout(connectionTimeout); // Clear timeout on successful connection
          console.log('✅ [WebRTC Chat] Connected successfully');
          console.log('🔧 [WebRTC Chat] Setting WebRTC chat service state...');
          webrtcServiceRef.current = chatService;
          setWebrtcChatService(chatService);
          setIsWebRTCServiceActive(true);
          console.log('✅ [WebRTC Chat] WebRTC chat service state set successfully');
        } catch (connectError) {
          clearTimeout(connectionTimeout); // Clear timeout on error
          console.error('❌ [WebRTC Chat] Connection failed:', connectError);
          console.error('❌ [WebRTC Chat] Connection error details:', {
            message: connectError.message,
            name: connectError.name,
            stack: connectError.stack
          });
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
        
        // WebRTC is working, no need for fallback polling
        console.log('✅ [WebRTC Chat] WebRTC connected successfully - no fallback polling needed');
        
        // Add a periodic check to ensure WebRTC is still working
        const webrtcHealthCheck = setInterval(() => {
          if (chatService && chatService.getConnectionStatus()) {
            console.log('✅ [WebRTC Health] WebRTC connection is healthy');
          } else {
            console.warn('⚠️ [WebRTC Health] WebRTC connection lost, but service still active');
          }
        }, 30000); // Check every 30 seconds
        
        // Store interval for cleanup
        (chatService as any).healthCheckInterval = webrtcHealthCheck;
      } catch (error) {
        console.error('❌ [WebRTCChat] Failed to initialize:', error);
        console.log('🔄 [WebRTCChat] WebRTC chat failed, enabling fallback polling');
        
        // Set a fallback chat service even if WebRTC fails
        setWebrtcChatService(null);
        setIsWebRTCServiceActive(false);
        
        // Set up fallback polling only when WebRTC fails
        const fallbackInterval = setInterval(async () => {
          try {
            console.log('🔄 [Fallback] Polling messages from server...');
            
            // Fetch messages directly from API since WebRTC failed
            const authToken = await AsyncStorage.getItem('auth_token');
            if (!authToken) {
              console.error('❌ [Fallback] No auth token available');
              return;
            }
            
            const currentConfig = configService.getConfig();
            const response = await fetch(`${currentConfig.apiUrl}/api/chat/${appointmentId}/messages`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              console.error('❌ [Fallback] API request failed:', response.status);
              return;
            }
            
            const data = await response.json();
            if (data.success && data.data) {
              const serverMessages = data.data;
              console.log('🔄 [Fallback] Polling messages:', serverMessages.length);
              
              // Use merge function to prevent duplicates and loops
              setMessages(prev => {
                const mergedMessages = safeMergeMessages(prev, serverMessages);
                if (mergedMessages.length !== prev.length) {
                  console.log('🔄 [Fallback] New messages merged:', mergedMessages.length - prev.length);
                }
                return mergedMessages;
              });
            }
          } catch (error) {
            console.error('❌ [Fallback] Error polling messages:', error);
          }
        }, 10000); // Poll every 10 seconds as fallback
        
        // Store interval for cleanup
        (window as any).fallbackInterval = fallbackInterval;
      }
    };

    console.log('🔧 [WebRTC Chat] Calling initializeWebRTCChat...');
    initializeWebRTCChat();

    return () => {
      if (webrtcServiceRef.current) {
        console.log('🔌 [WebRTCChat] Disconnecting service');
        
        // Clear health check interval if it exists
        if ((webrtcServiceRef.current as any).healthCheckInterval) {
          console.log('🔄 [WebRTC Health] Clearing health check interval');
          clearInterval((webrtcServiceRef.current as any).healthCheckInterval);
        }
        
        webrtcServiceRef.current.disconnect();
        webrtcServiceRef.current = null;
        setWebrtcChatService(null);
        setIsWebRTCServiceActive(false);
      }
      
      // Clear fallback interval if it exists
      if ((window as any).fallbackInterval) {
        console.log('🔄 [Fallback] Clearing fallback polling interval');
        clearInterval((window as any).fallbackInterval);
        (window as any).fallbackInterval = null;
      }
    };
  }, [isAuthenticated, appointmentId, currentUserId]);

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
            
            // FIX: Refresh chat data when session ends to update UI immediately
            console.log('🔄 [SessionEnded] Refreshing chat data for session end notification...');
            setTimeout(() => {
              // Force refresh of chat info and messages
              if (webrtcChatService) {
                webrtcChatService.requestSessionStatus();
              }
              // Also refresh local chat info
              loadChat();
            }, 500);
            
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
    // Prevent multiple simultaneous loadChat calls
    if (isLoadingChat) {
      console.log('⚠️ [loadChat] Already loading chat, skipping duplicate call');
      return;
    }
    
    try {
      console.log('🔄 [loadChat] Starting chat load...', { 
        userType: user?.user_type, 
        appointmentId, 
        hasWebRTCService: !!webrtcChatService 
      });
      setIsLoadingChat(true);
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
              other_participant_name: sessionResponse.data?.other_participant_name,
              other_participant_profile_picture_url: sessionResponse.data?.other_participant_profile_picture_url,
              patient_data: sessionResponse.data?.patient,
              doctor_data: sessionResponse.data?.doctor,
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
              
              // Set appointment type for text sessions
              setAppointmentType('text');
              console.log('✅ [TextSession] Appointment type set to text for text session');
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
              console.log('🔍 Raw other_participant_name:', infoResponse.data.other_participant_name);
              console.log('🔍 Raw other_participant_profile_picture_url:', infoResponse.data.other_participant_profile_picture_url);
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
                appointment_id: chatInfoData.appointment_id,
                full_chat_info: chatInfoData
              });
              if (chatInfoData.appointment_type) {
                setAppointmentType(chatInfoData.appointment_type);
                console.log('✅ [ChatInfo] Appointment type set:', chatInfoData.appointment_type);
              } else {
                console.log('⚠️ [ChatInfo] No appointment type found in chat info, defaulting to text input enabled');
                // Set a default appointment type to prevent null issues
                setAppointmentType('text');
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
        // First sync with server to get the latest messages
        try {
          console.log('🔄 [ChatComponent] Syncing with server to get latest messages...');
          const syncedMessages = await webrtcChatService.syncWithServer();
          console.log('✅ [ChatComponent] Messages synced with server:', syncedMessages.length);
          setMessages(syncedMessages);
        } catch (error) {
          console.error('❌ [ChatComponent] Failed to sync with server, using local messages only:', error);
          // Fallback to local messages if sync fails
          const loadedMessages = await webrtcChatService.getMessages();
          setMessages(loadedMessages);
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
      setIsLoadingChat(false);
    }
  };

  // Send message via WebRTC or fallback to backend API
  const sendMessage = async () => {
    console.log('📤 [ChatComponent] sendMessage function called with:', newMessage.trim());
    console.log('📤 [ChatComponent] sendMessage conditions check:', {
      hasMessage: !!newMessage.trim(),
      sending,
      sessionEnded,
      sessionValid,
      isInstantSession,
      isSessionExpired,
      hasPatientSentMessage,
      hasDoctorResponded,
      isSessionActivated,
      isPatient,
      isTextSession,
      isAppointmentTime,
      textAppointmentSessionActive: textAppointmentSession.isActive
    });
    
    if (!newMessage.trim()) {
      console.log('📤 [ChatComponent] sendMessage aborted - no message text');
      return;
    }
    
    // Check if session is valid before sending message
    if (!sessionValid) {
      console.error('❌ [ChatComponent] Cannot send message - session is invalid');
      return;
    }

    // Track activity for text appointments
    if (isTextAppointment && textAppointmentSession.isActive) {
      console.log('📝 [TextAppointment] Message sent - tracking activity');
      updateTextAppointmentActivity();
      setTextAppointmentSession(prev => ({
        ...prev,
        lastActivityTime: new Date(),
        hasPatientActivity: user?.user_type === 'patient' ? true : prev.hasPatientActivity,
        hasDoctorActivity: user?.user_type === 'doctor' ? true : prev.hasDoctorActivity
      }));
    }
    
    // Check if session has expired (for instant sessions)
    if (isInstantSession && isSessionExpired) {
      console.error('❌ [ChatComponent] Cannot send message - session has expired');
      return;
    }
    
    // Add message immediately to chat
    const messageText = newMessage.trim();
    const tempId = addImmediateTextMessage(messageText);
    setNewMessage(''); // Clear input immediately
    
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
        serviceType: webrtcChatService ? typeof webrtcChatService : 'null',
        connectionStatus: webrtcChatService ? webrtcChatService.getConnectionStatus() : 'N/A'
      });
      
      console.log('🔍 [ChatComponent] WebRTC service details:', {
        service: webrtcChatService,
        hasSendMessage: webrtcChatService ? typeof webrtcChatService.sendMessage === 'function' : false,
        isConnected: webrtcChatService ? webrtcChatService.getConnectionStatus() : false
      });
      
      if (webrtcChatService) {
        // Use WebRTC chat service if available
        console.log('📤 [ChatComponent] Sending message via WebRTC:', messageText);
        console.log('🔍 [ChatComponent] WebRTC connection status:', {
          hasService: !!webrtcChatService,
          connectionStatus: webrtcChatService.getConnectionStatus(),
          isWebRTCServiceActive: isWebRTCServiceActive
        });
        console.log('🔍 [ChatComponent] WebRTC service details:', {
          serviceType: typeof webrtcChatService,
          hasSendMessage: typeof webrtcChatService.sendMessage === 'function'
        });
        try {
          const message = await webrtcChatService.sendMessage(messageText);
          if (message) {
            updateTextMessage(tempId, message.id);
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
            await sendMessageViaBackendAPI(tempId, messageText);
          }
        } catch (webrtcError) {
          console.error('❌ [ChatComponent] WebRTC failed:', webrtcError);
          console.error('❌ [ChatComponent] WebRTC error details:', {
            message: webrtcError.message,
            name: webrtcError.name,
            stack: webrtcError.stack
          });
          // Fallback to backend API
          console.log('🔄 [ChatComponent] WebRTC failed, trying backend API fallback');
          await sendMessageViaBackendAPI(tempId, messageText);
        }
        
      } else {
        // Fallback to backend API
        console.log('📤 [ChatComponent] WebRTC not available, using backend API fallback');
        console.log('📤 [ChatComponent] WebRTC service state when not available:', {
          webrtcChatService: webrtcChatService,
          isWebRTCServiceActive: isWebRTCServiceActive
        });
        await sendMessageViaBackendAPI(tempId, messageText);
      }
    } catch (error) {
      console.error('❌ [ChatComponent] Unexpected error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Fallback method to send message via backend API
  const sendMessageViaBackendAPI = async (tempId: string, messageText: string) => {
    try {
      const response = await apiService.post(`/chat/${appointmentId}/messages`, {
        message: messageText,
        message_type: 'text'
      });
      
      if (response.success) {
        console.log('✅ [ChatComponent] Message sent successfully via backend API:', response.data.id);
        
        // Update the temp message with real ID
        updateTextMessage(tempId, response.data.id);
        
        console.log('✅ [ChatComponent] Message status updated:', {
          tempId,
          realId: response.data.id,
          message: messageText
        });
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
      try {
        // Remove event handlers before closing to prevent stale listeners
        (global as any).incomingCallWebSocket.onopen = null;
        (global as any).incomingCallWebSocket.onmessage = null;
        (global as any).incomingCallWebSocket.onerror = null;
        (global as any).incomingCallWebSocket.onclose = null;
        (global as any).incomingCallWebSocket.close();
      } catch (e) {
        console.warn('Error cleaning up WebSocket:', e);
      }
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
          // CRITICAL: Generate unique message ID for deduplication
          const messageId = `${message.senderId}-${message.appointmentId}-${message.callType || 'audio'}-${Date.now()}`;
          const offerHash = message.offer?.sdp ? message.offer.sdp.substring(0, 50) : messageId;
          
          // Check if we've already processed this offer (within last 5 seconds)
          if (processedOffersRef.current.has(offerHash)) {
            console.log('📞 Duplicate offer detected and ignored:', offerHash.substring(0, 20));
            return;
          }
          
          console.log('📞 Offer received - FULL MESSAGE:', JSON.stringify(message, null, 2));
          console.log('📞 Offer received - checking senderId filter:', {
            messageSenderId: message.senderId,
            messageUserId: message.userId,
            currentUserId: currentUserId,
            currentUserIdString: currentUserId.toString(),
            userType: user?.user_type,
            appointmentId: appointmentId,
            userObject: user,
            callType: message.callType || 'audio', // Check if it's video or audio call
            offerHash: offerHash.substring(0, 20)
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
            currentUserId,
            doctorName: message.doctorName,
            doctor_name: message.doctor_name,
            doctorProfilePicture: message.doctorProfilePicture,
            doctor_profile_picture: message.doctor_profile_picture
          });
          
          // Store the offer for the appropriate service to use
          (global as any).pendingOffer = message.offer;
          
          // Set caller information for the incoming call screen
          // Use the caller information from the WebSocket message if available
          const callerName = message.doctorName || message.doctor_name || 
            (user?.user_type === 'doctor' ? 
            (chatInfo?.other_participant_name || 'Patient') : 
              (chatInfo?.other_participant_name || 'Doctor'));
          const callerProfilePicture = message.doctorProfilePicture || message.doctor_profile_picture || 
            chatInfo?.other_participant_profile_picture;
          
          setIncomingCallerName(callerName);
          setIncomingCallerProfilePicture(callerProfilePicture);
          
          // Mark this offer as processed immediately to prevent race conditions
          processedOffersRef.current.add(offerHash);
          
          // Clean up old processed offers after 10 seconds to prevent memory leak
          setTimeout(() => {
            processedOffersRef.current.delete(offerHash);
          }, 10000);
          
          // Determine call type and show appropriate incoming call screen
          const callType = message.callType || 'audio';
          
          // CRITICAL FIX: Use global flag to prevent duplicate modals across all connections
          const globalKey = `incomingCall_${appointmentId}_${callType}`;
          if ((global as any)[globalKey]) {
            console.log(`📞 Incoming ${callType} call already shown globally, ignoring duplicate offer`);
            return;
          }
          
          // Set global flag immediately
          (global as any)[globalKey] = true;
          
          if (callType === 'video') {
            console.log('📹 Showing incoming video call screen');
            incomingCallShownRef.current = true;
            setShowIncomingVideoCall(true);
          } else {
            console.log('📞 Showing incoming audio call screen');
            incomingCallShownRef.current = true;
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
      // Check if this is a text appointment with active session
      if (isTextAppointment && textAppointmentSession.isActive) {
        // Show end session modal for text appointment sessions
        setShowEndSessionModal(true);
        return;
      }
      
      // Check if this is a scheduled appointment that hasn't started yet
      const appointmentStatus = String(chatInfo?.status || '');
      const isConfirmedAppointment = appointmentStatus === 'confirmed' || appointmentStatus === '1';
      
      // FIX: Only show "cannot end" message if it's a confirmed appointment AND it's not appointment time AND it's not a text appointment
      if (!isTextSession && !isTextAppointment && isConfirmedAppointment && !isAppointmentTime) {
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
      
      // Show end session modal for active sessions (including when appointment time has been reached)
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
      
      // Handle text appointment session ending
      if (isTextAppointment && textAppointmentSession.isActive) {
        console.log('🏁 [TextAppointment] Ending text appointment session manually');
        processTextAppointmentDeduction(1, 'manual_end');
        endTextAppointmentSession(1); // Deduct 1 session for manual end
        
        // FIX: Trigger refresh for both participants
        console.log('🔄 [TextAppointment] Triggering chat refresh for both participants...');
        if (webrtcChatService) {
          try {
            await webrtcChatService.sendSessionEndNotification('manual_end');
            console.log('✅ [TextAppointment] Session end notification sent via WebRTC');
          } catch (error) {
            console.error('❌ [TextAppointment] Failed to send session end notification:', error);
          }
        }
        
        // Force refresh chat data
        setTimeout(() => {
          console.log('🔄 [TextAppointment] Forcing chat data refresh...');
          if (webrtcChatService) {
            webrtcChatService.requestSessionStatus();
          }
          loadChat();
        }, 1000);
        
        setShowEndSessionModal(false);
        setShowRatingModal(true);
        return;
      }
      
      // Check if this is a scheduled appointment that hasn't started
      const appointmentStatus = String(chatInfo?.status || '');
      const isConfirmedAppointment = appointmentStatus === 'confirmed' || appointmentStatus === '1';
      
      // FIX: Only prevent ending if it's a confirmed appointment AND it's not a text appointment AND it's not appointment time
      if (!isTextSession && !isTextAppointment && isConfirmedAppointment && !isAppointmentTime) {
        Alert.alert(
          'Cannot End Session',
          'This is a scheduled appointment that hasn\'t started yet. You can cancel it from your appointments list.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const sessionType = isTextSession ? 'text' : 'appointment';
      
      // Call backend to end session based on type
      let result;
      if (isTextSession) {
        await sessionService.endTextSession(sessionId);
        result = { status: 'success' };
      } else {
        await sessionService.endTextAppointmentSession(sessionId);
        result = { status: 'success' };
      }
      
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
        
        // FIX: Trigger refresh for both participants to update chat state
        console.log('🔄 [End Session] Triggering chat refresh for both participants...');
        if (webrtcChatService) {
          // Send a session-ended notification to refresh both chats
          try {
            await webrtcChatService.sendSessionEndNotification('manual_end');
            console.log('✅ [End Session] Session end notification sent via WebRTC');
          } catch (error) {
            console.error('❌ [End Session] Failed to send session end notification:', error);
          }
        }
        
        // Force refresh chat data for both participants
        setTimeout(() => {
          console.log('🔄 [End Session] Forcing chat data refresh...');
          // Trigger a re-fetch of chat info and messages
          if (webrtcChatService) {
            webrtcChatService.requestSessionStatus();
          }
        }, 1000);
        
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
      
      // Submit rating directly via API
      const response = await apiService.post('/ratings', {
        session_id: sessionId,
        doctor_id: doctorId,
        patient_id: patientId,
        rating: rating,
        comment: comment
      });
      
      const result = response;
      
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

  // Image and camera picker functions
  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 [ImagePicker] Image selected:', imageUri);
        
        if (webrtcChatService) {
          console.log('📤 [ImagePicker] Sending image via WebRTC');
          const message = await webrtcChatService.sendImageMessage(imageUri, appointmentId);
          if (message) {
            console.log('✅ [ImagePicker] Image sent via WebRTC:', message.id);
          }
        } else {
          console.log('📤 [ImagePicker] WebRTC not available, using backend API');
          // Fallback to backend API if needed
        }
      }
    } catch (error) {
      console.error('❌ [ImagePicker] Error selecting image:', error);
    }
  };

  const handleCameraPicker = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 [CameraPicker] Photo taken:', imageUri);
        
        if (webrtcChatService) {
          console.log('📤 [CameraPicker] Sending photo via WebRTC');
          const message = await webrtcChatService.sendImageMessage(imageUri, appointmentId);
          if (message) {
            console.log('✅ [CameraPicker] Photo sent via WebRTC:', message.id);
          }
        } else {
          console.log('📤 [CameraPicker] WebRTC not available, using backend API');
          // Fallback to backend API if needed
        }
      }
    } catch (error) {
      console.error('❌ [CameraPicker] Error taking photo:', error);
    }
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

  // Function to add immediate text message
  const addImmediateTextMessage = (messageText: string): string => {
    const tempId = `temp_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const immediateMessage: ExtendedChatMessage = {
      id: tempId,
      temp_id: tempId,
      appointment_id: isTextSession ? parseInt(appointmentId.replace('text_session_', ''), 10) : Number(appointmentId),
      sender_id: user?.id || 0,
      sender_name: user?.display_name || 'You',
      message: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      delivery_status: 'sending',
      is_own_message: true,
    };

    console.log('📤 [Chat] Adding immediate text message:', tempId);
    setMessages(prev => [...prev, immediateMessage]);
    scrollToBottom();
    
    return tempId;
  };

  // Function to add immediate image message with local URI
  const addImmediateImageMessage = (localImageUri: string): string => {
    const tempId = `temp_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const immediateMessage: ExtendedChatMessage = {
      id: tempId,
      temp_id: tempId,
      appointment_id: isTextSession ? parseInt(appointmentId.replace('text_session_', ''), 10) : Number(appointmentId),
      sender_id: user?.id || 0,
      sender_name: user?.display_name || 'You',
      message: '🖼️ Image',
      message_type: 'image',
      media_url: localImageUri, // Use local URI initially
      created_at: new Date().toISOString(),
      delivery_status: 'sending',
      is_own_message: true,
      _isUploaded: false // Mark as not uploaded yet
    };

    console.log('📤 [Chat] Adding immediate image message:', tempId);
    setMessages(prev => [...prev, immediateMessage]);
    scrollToBottom();
    
    return tempId;
  };

  // Function to update text message when send completes
  const updateTextMessage = (tempId: string, messageId: string | number, status: 'sent' | 'delivered' | 'read' = 'sent') => {
    console.log('✅ [Chat] Text message sent successfully:', messageId);
    
    setMessages(prev => prev.map(msg => {
      if (msg.temp_id === tempId || msg.id === tempId) {
        return {
          ...msg,
          id: messageId,
          delivery_status: status,
        };
      }
      return msg;
    }));
  };

  // Function to update image message when upload completes
  const updateImageMessage = (tempId: string, serverImageUrl: string, messageId?: string | number) => {
    console.log('✅ [Chat] Image uploaded successfully:', serverImageUrl);
    
    setMessages(prev => prev.map(msg => {
      if (msg.temp_id === tempId || msg.id === tempId) {
        return {
          ...msg,
          id: messageId || msg.id,
          // Use server URL (backend fixed!)
          media_url: serverImageUrl,
          delivery_status: 'sent' as const,
          // Store server URL for deduplication
          server_media_url: serverImageUrl,
          // Mark as uploaded to prevent duplicates
          _isUploaded: true
        };
      }
      return msg;
    }));
  };

  // Function to mark image message as failed
  const markImageMessageFailed = (tempId: string) => {
    console.log('❌ [Chat] Marking image message as failed:', tempId);
    
    setMessages(prev => prev.map(msg => {
      if (msg.temp_id === tempId || msg.id === tempId) {
        return {
          ...msg,
          delivery_status: 'failed' as const
        };
      }
      return msg;
    }));
  };

  // Image handling functions
  const handleTakePhoto = async () => {
    try {
      setSendingCameraImage(true);
      
      // Request camera permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 [Camera] Photo taken, attaching to input');
        
        // Attach image to input instead of sending immediately
        setSelectedImage(imageUri);
        setImageCaption(''); // Clear any existing caption
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      // Show user-friendly error message
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setSendingCameraImage(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setSendingGalleryImage(true);
      
      // Request media library permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access to select images.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('🖼️ [Gallery] Image selected, attaching to input');
        
        // Attach image to input instead of sending immediately
        setSelectedImage(imageUri);
        setImageCaption(''); // Clear any existing caption
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      // Show user-friendly error message
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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

  const sendImageMessageViaBackendAPIWithUpdate = async (imageUri: string, tempId: string) => {
    try {
      console.log('📤 [Backend] Starting image upload for tempId:', tempId);
      const { imageService } = await import('../../services/imageService');
      // Handle text sessions - extract numeric ID
      let numericAppointmentId: number;
      if (isTextSession) {
        numericAppointmentId = parseInt(appointmentId.replace('text_session_', ''), 10);
      } else {
        numericAppointmentId = Number(appointmentId);
      }

      console.log('📤 [Backend] Uploading image to server...');
      const result = await imageService.uploadImage(numericAppointmentId, imageUri);
      
      if (result && result.success && result.imageUrl) {
        console.log('✅ [Backend] Image uploaded successfully:', {
          tempId,
          imageUrl: result.imageUrl,
          appointmentId: numericAppointmentId
        });
        updateImageMessage(tempId, result.imageUrl);
        
        // Send the message to the chat
        console.log('📤 [Backend] Sending image message to chat...');
        const messageSuccess = await imageService.sendImageMessage(
          numericAppointmentId,
          imageUri,
          user?.id || 0,
          user?.display_name || 'User'
        );
        
        if (messageSuccess) {
          console.log('✅ [Backend] Image message sent to chat successfully');
        } else {
          console.warn('⚠️ [Backend] Image uploaded but message send failed');
        }
      } else {
        console.error('❌ [Backend] Image upload failed:', result);
        throw new Error('Image upload failed');
      }
    } catch (error) {
      console.error('❌ [Backend] Error in image upload process:', error);
      markImageMessageFailed(tempId);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Wallpaper */}
      <Image
        source={require('./white_wallpaper.jpg')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          opacity: 0.8,
          zIndex: -1,
        }}
        resizeMode="cover"
        onLoad={() => console.log('✅ Wallpaper loaded successfully')}
        onError={(error) => console.log('❌ Wallpaper failed to load:', error)}
      />
      
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior="padding"
        keyboardVerticalOffset={0}
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
          <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          {/* Profile Picture and Name - Using Backend Anonymized Data */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {(chatInfo?.other_participant_profile_picture_url || chatInfo?.other_participant_profile_picture) ? (
            <Image
                source={{ uri: chatInfo.other_participant_profile_picture_url || chatInfo.other_participant_profile_picture }}
              style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
                onError={(error) => {
                  console.log('❌ Profile picture failed to load:', error);
                  console.log('❌ URL was:', chatInfo.other_participant_profile_picture_url || chatInfo.other_participant_profile_picture);
                }}
                onLoad={() => {
                  console.log('✅ Profile picture loaded successfully:', chatInfo.other_participant_profile_picture_url || chatInfo.other_participant_profile_picture);
                }}
                resizeMode="cover"
            />
          ) : (
            <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#4CAF50',
              justifyContent: 'center',
              alignItems: 'center',
                marginRight: 10,
                borderWidth: 1,
                borderColor: '#E5E5E5',
            }}>
                <Icon name="user" size={18} color="#fff" />
            </View>
          )}
            <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
              <Text 
                style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#333',
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
            {chatInfo?.other_participant_name || 'User'}
          </Text>
          {isOtherUserTyping && (
              <Text style={{
                  fontSize: 11, 
                color: '#4CAF50',
                  fontWeight: '500',
                  marginTop: 1,
              }}>
                  Typing...
              </Text>
              )}
            </View>
        </View>
        
        
        {/* Call Icons - Role-based calling */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity 
            style={{ 
              padding: 8, 
              marginRight: 1,
              opacity: isCallButtonEnabled('video') ? 1 : 0.3
            }}
            onPress={() => {
              if (isCallButtonEnabled('video')) {
                console.log('Starting video call...');
                setShowVideoCallModal(true);
              } else {
                let message = '';
                if (!isVideoCallEnabled()) {
                  message = `Video calls are not available for ${appointmentType} appointments. Video calls are only available for video appointments.`;
                } else if (subscriptionData?.videoCallsRemaining === 0) {
                  message = 'No video calls remaining in your subscription. Please upgrade your plan.';
                } else {
                  message = 'Video calls are only available during active sessions or when the doctor is online.';
                }
                Alert.alert('Call Not Available', message, [{ text: 'OK' }]);
              }
            }}
          >
            <Icon name="video" size={24} color={isCallButtonEnabled('video') ? "#4CAF50" : "#999"} />
          </TouchableOpacity>
          
          {/* Audio Call Button - Only patients can initiate calls */}
          {user?.user_type === 'patient' && (
            <TouchableOpacity 
              style={{ 
                padding: 8,
                opacity: isCallButtonEnabled('voice') ? 1 : 0.3
              }}
              onPress={() => {
                console.log('🎯 [CallButton] Press state:', {
                  userType: user?.user_type,
                  callEnabled: isCallEnabled(),
                  webrtcReady,
                  showIncomingCall,
                  appointmentType,
                  isTextSession,
                  buttonEnabled: isCallButtonEnabled('voice'),
                  subscriptionData
                });
                
                if (isCallButtonEnabled('voice')) {
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
                } else {
                  let message = '';
                  if (!isAudioCallEnabled()) {
                    message = `Audio calls are not available for ${appointmentType} appointments. Audio calls are only available for audio appointments.`;
                  } else if (subscriptionData?.voiceCallsRemaining === 0) {
                    message = 'No voice calls remaining in your subscription. Please upgrade your plan.';
                  } else if (!webrtcReady && process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS !== 'true') {
                    message = 'Call Not Ready: WebRTC is not ready yet. Please wait a moment.';
                  } else {
                    message = 'Call Not Available: Call feature is not available at this time.';
                  }
                  Alert.alert('Call Not Available', message, [{ text: 'OK' }]);
                }
              }}
              disabled={!isCallButtonEnabled('voice')}
            >
              <Icon name="voice" size={24} color={isCallButtonEnabled('voice') ? "#4CAF50" : "#999"} />
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
        <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={{ 
              padding: 16,
              paddingBottom: 0, // No bottom padding to prevent extra space
            }}
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
          
          {/* Appointment Time Placeholder */}
          {!isTextSession && !isAppointmentTime && appointmentDateTime && (
            <View style={{
              backgroundColor: '#FFF3E0',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#FFB74D',
            }}>
              <Ionicons 
                name="time" 
                size={32} 
                color="#FF9800" 
                style={{ marginBottom: 12 }}
              />
                <Text style={{
                  fontSize: 18,
                  color: '#E65100',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  You're Early! 🎉
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#F57C00',
                  textAlign: 'center',
                  lineHeight: 20,
                }}>
                  Your appointment is on {appointmentDateTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })} at {appointmentDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#F57C00',
                  textAlign: 'center',
                  marginTop: 8,
                  fontWeight: '500',
                }}>
                  Make sure you don't miss it! 🎯
                </Text>
            </View>
          )}

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
          
          {/* Only show messages if it's appointment time or text session */}
          {(isTextSession || isAppointmentTime) && messages.map((message, index) => {
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
            // Create stable unique key - prefer temp_id for immediate messages, then id, then fallback
            const uniqueKey = message.temp_id ? `temp_${message.temp_id}` : (message.id ? `msg_${message.id}` : `fallback_${index}_${message.created_at}`);
            
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
                        deliveryStatus={message.delivery_status}
                        appointmentId={appointmentId}
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
                    {/* Add delivery status for text messages */}
                    {message.sender_id === currentUserId && (
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                        <ReadReceipt
                          isOwnMessage={true}
                          deliveryStatus={(message.delivery_status === 'failed' ? 'sent' : message.delivery_status) || 'sent'}
                          readBy={message.read_by}
                          otherParticipantId={doctorId || patientId}
                          messageTime={message.created_at}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Input - Fixed at bottom with proper keyboard handling and safe area */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 0,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          backgroundColor: '#fff',
          position: 'relative',
          zIndex: 1000,
          minHeight: 60, // Ensure minimum height to cover any keyboard space
        }}>
          {/* White overlay below input to hide grey space */}
          <View style={{
            position: 'absolute',
            bottom: -100, // Extend below the input
            left: 0,
            right: 0,
            height: 100,
            backgroundColor: '#fff',
            zIndex: -1,
          }} />
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

          {/* Session Ended Message for Patients */}
          {sessionEnded && isPatient && (
            <View style={{
              position: 'absolute',
              top: -60,
              left: 0,
              right: 0,
              backgroundColor: '#F8D7DA',
              borderTopWidth: 1,
              borderTopColor: '#F5C6CB',
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#721C24',
                fontWeight: '500',
                textAlign: 'center',
              }}>
                Session has ended • You can no longer send messages
              </Text>
            </View>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <View style={{
              position: 'absolute',
              bottom: 60,
              left: 16,
              right: 16,
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={{ width: 60, height: 60, borderRadius: 8, marginRight: 8 }}
                />
                <Text style={{ flex: 1, color: '#666', fontSize: 14 }}>
                  {newMessage || 'Add a caption...'}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedImage(null);
                    setNewMessage('');
                  }}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close-circle" size={24} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Image Button */}
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={
              sendingGalleryImage ||
              sending || 
              sessionEnded || 
              !sessionValid ||
              selectedImage !== null ||
              (isInstantSession && isSessionExpired) ||
              (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
              (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))
            }
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingGalleryImage ||
                sending || 
                sessionEnded || 
                !sessionValid ||
                selectedImage !== null ||
                (isInstantSession && isSessionExpired) ||
                (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
                (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))) ? 0.3 : 1,
            }}
          >
            <Ionicons name="image" size={24} color={(sendingGalleryImage || selectedImage !== null) ? "#999" : "#4CAF50"} />
          </TouchableOpacity>
          
          {/* Camera Button */}
          <TouchableOpacity
            onPress={handleTakePhoto}
            disabled={
              sendingCameraImage ||
              sending || 
              sessionEnded || 
              !sessionValid ||
              (isInstantSession && isSessionExpired) ||
              (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
              (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))
            }
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sendingCameraImage ||
                sending || 
                sessionEnded || 
                !sessionValid ||
                (isInstantSession && isSessionExpired) ||
                (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
                (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))) ? 0.3 : 1,
            }}
          >
            <Ionicons name="camera" size={24} color={sendingCameraImage ? "#999" : "#4CAF50"} />
          </TouchableOpacity>
          
          {/* Voice Recording Button */}
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            disabled={
              sending || 
              sessionEnded || 
              !sessionValid ||
              (isInstantSession && isSessionExpired) ||
              (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
              (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))
            }
            style={{
              padding: 8,
              marginRight: 8,
              opacity: (sending || 
                sessionEnded || 
                !sessionValid ||
                (isInstantSession && isSessionExpired) ||
                (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
                (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))) ? 0.3 : 1,
            }}
          >
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={24} 
              color={(sending || 
                sessionEnded || 
                !sessionValid ||
                (isInstantSession && isSessionExpired) ||
                (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
                (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))) ? "#999" : (isRecording ? "#ff4444" : "#4CAF50")} 
            />
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
            editable={sessionValid && !sessionEnded && isTextInputEnabled() && (isTextSession || isAppointmentTime || (isTextAppointment && textAppointmentSession.isActive))}
            placeholder="Message..."
            placeholderTextColor="#999"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: newMessage.trim() ? '#4CAF50' : '#E5E5E5',
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 14,
              fontSize: 16,
              marginRight: 8,
              opacity: (sessionValid && !sessionEnded && isTextInputEnabled() && (isTextSession || isAppointmentTime || (isTextAppointment && textAppointmentSession.isActive))) ? 1 : 0.5,
              backgroundColor: (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ? '#F5F5F5' : 'white',
              maxHeight: 100,
              minHeight: 48,
              textAlignVertical: 'center',
            }}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            onPress={async () => {
              if (selectedImage) {
                // Send image with optional caption
                const tempId = addImmediateImageMessage(selectedImage);
                const caption = newMessage.trim();
                
                try {
                  if (webrtcChatService) {
                    const message = await webrtcChatService.sendImageMessage(selectedImage, appointmentId);
                    if (message && message.media_url) {
                      updateImageMessage(tempId, message.media_url, message.id);
                      
                      // Send caption as separate text message if provided
                      if (caption) {
                        const captionTempId = addImmediateTextMessage(caption);
                        const captionMessage = await webrtcChatService.sendMessage(caption);
                        if (captionMessage) {
                          updateTextMessage(captionTempId, captionMessage.id);
                        }
                      }
                    } else {
                      throw new Error('WebRTC image send returned null');
                    }
                  } else {
                    await sendImageMessageViaBackendAPIWithUpdate(selectedImage, tempId);
                    
                    // Send caption as separate text message if provided
                    if (caption) {
                      await sendMessageViaBackendAPI(addImmediateTextMessage(caption), caption);
                    }
                  }
                } catch (error) {
                  console.error('❌ Failed to send image:', error);
                  await sendImageMessageViaBackendAPIWithUpdate(selectedImage, tempId);
                  
                  // Still try to send caption if provided
                  if (caption) {
                    const captionTempId = addImmediateTextMessage(caption);
                    try {
                      if (webrtcChatService) {
                        const captionMessage = await webrtcChatService.sendMessage(caption);
                        if (captionMessage) {
                          updateTextMessage(captionTempId, captionMessage.id);
                        }
                      } else {
                        await sendMessageViaBackendAPI(captionTempId, caption);
                      }
                    } catch (captionError) {
                      console.error('❌ Failed to send caption:', captionError);
                    }
                  }
                }
                
                // Clear image and caption
                setSelectedImage(null);
                setNewMessage('');
              } else {
                // Send text message
                sendMessage();
              }
            }}
            disabled={
              sending || 
              (!newMessage.trim() && !selectedImage) || // Allow sending if there's text OR image
              sessionEnded || 
              !sessionValid ||
              (isInstantSession && isSessionExpired) ||
              (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient) ||
              (!isTextSession && !isAppointmentTime && !(isTextAppointment && textAppointmentSession.isActive))
            }
            style={{
              backgroundColor: (newMessage.trim() || selectedImage) && !sending ? '#4CAF50' : '#E5E5E5',
              borderRadius: 24,
              padding: 14,
              minWidth: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (sessionEnded && !isPatient) || (isInstantSession && hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated) ? 0.5 : 1,
              shadowColor: (newMessage.trim() || selectedImage) && !sending ? '#4CAF50' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" /> // FIX: Only show send icon
            )}
          </TouchableOpacity>
        </View>

        {/* Voice Recording Interface */}
        {isRecording && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#f0f0f0',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            zIndex: 1001, // Ensure it appears above the white overlay
            position: 'relative'
          }}>
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#ff4444',
                marginRight: 12
              }} />
              <Text style={{
                fontSize: 16,
                color: '#333',
                fontWeight: '500'
              }}>
                Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={stopRecording}
              style={{
                padding: 8,
                backgroundColor: '#ff4444',
                borderRadius: 20
              }}
            >
              <Ionicons name="stop" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
        
        {recordingUri && !isRecording && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#f0f0f0',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            zIndex: 1001, // Ensure it appears above the white overlay
            position: 'relative'
          }}>
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="mic" size={20} color="#4CAF50" style={{ marginRight: 12 }} />
              <Text style={{
                fontSize: 16,
                color: '#333',
                fontWeight: '500'
              }}>
                Voice message ready
              </Text>
            </View>
            <TouchableOpacity
              onPress={sendVoiceMessage}
              disabled={sendingVoiceMessage}
              style={{
                padding: 8,
                backgroundColor: sendingVoiceMessage ? '#ccc' : '#4CAF50',
                borderRadius: 20,
                marginRight: 8
              }}
            >
              {sendingVoiceMessage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setRecordingUri(null);
                setRecordingDuration(0);
              }}
              style={{
                padding: 8,
                backgroundColor: '#ff4444',
                borderRadius: 20
              }}
            >
              <Ionicons name="close" size={20} color="white" />
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
            patientName={isPatient ? user?.display_name || `${user?.first_name} ${user?.last_name}` : chatInfo?.other_participant_name || 'Patient'}
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
              (chatInfo?.other_participant_name || 'Doctor')
            }
            patientName={textSessionInfo ? 
              'Patient' : 
              (chatInfo?.other_participant_name || 'Patient')
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
        onCallTimeout={() => {
          // Only show "Doctor Unavailable" modal to patients (callers)
          if (isPatient) {
            setShowDoctorUnavailableModal(true);
          }
        }}
        onCallRejected={() => {
          // Only show "Doctor Unavailable" modal to patients (callers)
          if (isPatient) {
            setShowDoctorUnavailableModal(true);
          }
        }}
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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            minWidth: 320,
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 16
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FFF3E0',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Ionicons name="call" size={40} color="#FF9800" />
            </View>
            
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#11181C',
              marginBottom: 12,
              textAlign: 'center'
            }}>
              Doctor Unavailable
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#687076',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 32
            }}>
              The doctor is currently unavailable. They might be attending another patient. Please try again later or send a message.
            </Text>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                minWidth: 140,
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8
              }}
              onPress={() => {
                setShowDoctorUnavailableModal(false);
                setShowAudioCallModal(false);
                // Optionally navigate back or stay in chat
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
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
              // Only show "Doctor Unavailable" modal to patients (callers)
              if (isPatient) {
                setShowDoctorUnavailableModal(true);
              }
            }}
            onCallRejected={() => {
              setShowVideoCallModal(false);
              setShowVideoCall(false);
              // Only show "Doctor Unavailable" modal to patients (callers)
              if (isPatient) {
                setShowDoctorUnavailableModal(true);
              }
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
              incomingCallShownRef.current = false; // Reset flag when call ends
              (global as any)[`incomingCall_${appointmentId}_video`] = false; // Reset global flag
            }}
            onCallTimeout={() => {
              setShowIncomingVideoCall(false);
              setShowVideoCall(false);
              incomingCallShownRef.current = false; // Reset flag when call times out
              (global as any)[`incomingCall_${appointmentId}_video`] = false; // Reset global flag
              // Only show "Doctor Unavailable" modal to patients (callers)
              if (isPatient) {
                setShowDoctorUnavailableModal(true);
              }
            }}
            onCallRejected={() => {
              setShowIncomingVideoCall(false);
              setShowVideoCall(false);
              incomingCallShownRef.current = false; // Reset flag when call is rejected
              (global as any)[`incomingCall_${appointmentId}_video`] = false; // Reset global flag
              // Only show "Doctor Unavailable" modal to patients (callers)
              if (isPatient) {
                setShowDoctorUnavailableModal(true);
              }
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
              incomingCallShownRef.current = false; // Reset flag when user rejects call
              (global as any)[`incomingCall_${appointmentId}_video`] = false; // Reset global flag
            }}
          />
        </Modal>
      )}

      {/* Note: Video call state transitions are handled internally by VideoCallModal */}
      
    </SafeAreaView>
  );
} 
