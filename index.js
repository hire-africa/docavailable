// Import polyfills first
import 'react-native-get-random-values';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import './services/cryptoPolyfill';
// Register background messaging handler as early as possible
import './firebase-messaging';
import { router } from 'expo-router';
import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import { getStoredCallData, clearStoredCallData } from './services/callkeepStorage';

// Set up global error handler
if (typeof global !== 'undefined') {
  global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    console.error('Global error:', error, 'isFatal:', isFatal);
  });
}

// Import Firebase app first to ensure proper initialization
import '@react-native-firebase/app';
import firebase from '@react-native-firebase/app';

// Ensure Firebase is initialized before importing messaging
if (firebase.apps.length === 0) {
  console.log(' Firebase not initialized, this should not happen with RN Firebase');
} else {
  console.log(' Firebase app initialized:', firebase.apps[0].name);
}

// Import CallKeep for call management
import RNCallKeep from 'react-native-callkeep';
import callkeepService from './services/callkeepService';

// Setup CallKeep on app start
async function setupCallKeep() {
  try {
    await callkeepService.setup();
    console.log('CALLKEEP: setup complete');
  } catch (e) {
    console.log('CALLKEEP: setup error', e);
  }
}

setupCallKeep();

// Background message handling is now registered via './firebase-messaging'

// ✅ Wait for app to fully resume to active state (critical for locked screen)
const waitForAppForeground = async () => {
  if (AppState.currentState === 'active') {
    console.log('CALLKEEP: app already active');
    return;
  }
  
  console.log('CALLKEEP: waiting for app to resume from', AppState.currentState);
  return new Promise(resolve => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sub.remove();
        console.log('CALLKEEP: app resumed to active state');
        resolve();
      }
    });
    
    // Timeout after 4 seconds to prevent hanging
    setTimeout(() => {
      sub.remove();
      console.warn('CALLKEEP: app state timeout, proceeding anyway');
      resolve();
    }, 4000);
  });
};

const ensureCallData = async (callUUID) => {
  let callData = global.incomingCallData;

  if (!callData) {
    callData = await getStoredCallData();
    if (callData) {
      global.incomingCallData = callData;
      console.log('CALLKEEP: rehydrated call data from storage', callData);
    }
  }

  if (callData && !callData.callId) {
    callData.callId = callUUID;
  }

  return callData || null;
};

// ✅ Safe navigate with retry logic for router mounting edge cases
const safeNavigate = async (path, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      router.push(path);
      console.log('CALLKEEP: navigated directly to call screen:', path);
      return true;
    } catch (error) {
      console.warn(`CALLKEEP: router not ready, retrying (${i + 1}/${retries})...`, error.message);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  console.error('CALLKEEP: navigation failed after', retries, 'attempts');
  return false;
};

const navigateToActiveCall = async (callData) => {
  if (!callData?.appointmentId) {
    console.warn('CALLKEEP: navigateToActiveCall missing appointmentId', callData);
    return false;
  }

  // ✅ Navigate directly to /call screen with all required params
  // Extract doctorId from multiple possible field names
  const doctorId = callData.doctor_id || callData.doctorId || callData.caller_id || '';
  const doctorName = callData.callerName || callData.doctor_name || callData.doctorName || 'Doctor';
  const doctorProfilePic = callData.doctor_profile_picture || callData.doctorProfilePicture || '';
  
  const params = new URLSearchParams({
    sessionId: String(callData.appointmentId),
    doctorId: String(doctorId),
    doctorName: String(doctorName),
    doctorProfilePicture: String(doctorProfilePic),
    callType: String(callData.callType || callData.call_type || 'audio'),
    isIncomingCall: 'true',
    answeredFromCallKeep: 'true'
  });
  
  const path = `/call?${params.toString()}`;

  // ✅ Use safe navigation with retries and return success status
  return await safeNavigate(path);
};

// Flag to track if we're dismissing UI (don't clear data)
let isDismissingSystemUI = false;

// Track answered sessions to prevent duplicates
const answeredSessions = new Set();

// Handle native incoming call intents
const handleNativeIncomingCall = () => {
  try {
    // Check for native call data in global (set by MainActivity)
    if (global.nativeCallData) {
      const callData = global.nativeCallData;
      console.log('CALLKEEP: Processing native incoming call:', callData);
      
      // Navigate to call screen with native data
      navigateToActiveCall({
        appointmentId: callData.sessionId,
        doctorId: callData.doctorId,
        doctorName: callData.doctorName,
        callType: callData.callType,
        isIncomingCall: true,
        answeredFromNative: true,
      });
      
      // Clear the native data
      global.nativeCallData = null;
    }
  } catch (error) {
    console.error('CALLKEEP: Error handling native incoming call:', error);
  }
};

// Listen for native incoming call events from MainActivity
DeviceEventEmitter.addListener('nativeIncomingCall', (callData) => {
  console.log('CALLKEEP: Received native incoming call event:', callData);
  
  // Navigate to call screen with native data
  navigateToActiveCall({
    appointmentId: callData.sessionId,
    doctorId: callData.doctorId,
    doctorName: callData.doctorName,
    callType: callData.callType,
    isIncomingCall: true,
    answeredFromNative: true,
  });
});

const handleAnswerCall = async ({ callUUID }) => {
  console.log('CALLKEEP: answerCall event', callUUID);

  const callData = await ensureCallData(callUUID);
  const sessionId = callData?.appointmentId || callData?.appointment_id;
  
  // Deduplicate: Skip if we've already answered this session
  // ✅ Deduplicate: Skip if we've already answered this session
  if (sessionId && answeredSessions.has(sessionId)) {
    console.log('CALLKEEP: Already answered session', sessionId, '- ignoring duplicate');
    // Still dismiss the duplicate UI
    if (Platform.OS === 'android') {
      isDismissingSystemUI = true;
      RNCallKeep.endCall(callUUID);
    }
    return;
  }

  // Mark this session as answered
  if (sessionId) {
    answeredSessions.add(sessionId);
    console.log('CALLKEEP: Marked session as answered:', sessionId);
    
    // Auto-clear after 30 seconds to allow re-answers if needed
    setTimeout(() => {
      answeredSessions.delete(sessionId);
      console.log('CALLKEEP: Cleared answered session:', sessionId);
    }, 30000);
  }

  // ✅ 1️⃣ Dismiss system UI immediately on Android to prevent loop
  if (Platform.OS === 'android') {
    isDismissingSystemUI = true;
    RNCallKeep.endCall(callUUID);
    console.log('CALLKEEP: dismissed system UI for', callUUID);
  }

  try {
    await callkeepService.answerCall(callUUID);
  } catch (error) {
    console.error('CALLKEEP: answerCall invoke error', error);
  }

  console.log('CALLKEEP: answerCall using payload', callData);
  
  // ✅ 2️⃣ Navigate to call screen with delay
  setTimeout(() => {
    navigateToActiveCall(callData);
  }, 800);
};

const clearCallData = async () => {
  global.incomingCallData = null;
  await clearStoredCallData();
  console.log('CALLKEEP: cleared stored call data');
};

const handleEndCall = async ({ callUUID, reason }) => {
  console.log('CALLKEEP: endCall event', callUUID, 'reason:', reason);

  // ✅ Don't clear data if we're just dismissing system UI
  if (isDismissingSystemUI) {
    console.log('CALLKEEP: endCall ignored (dismissing system UI, keeping call data)');
    isDismissingSystemUI = false;
    return;
  }

  try {
    await callkeepService.endCall(callUUID);
  } catch (error) {
    console.error('CALLKEEP: endCall invoke error', error);
  } finally {
    await clearCallData();
  }
};

const handleDidDisplayIncomingCall = ({ callUUID }) => {
  console.log('CALLKEEP: didDisplayIncomingCall', callUUID);
};

const bootstrapPendingCallCheck = async () => {
  const pending = await getStoredCallData();
  if (pending) {
    console.log('CALLKEEP: pending call found on boot', pending);
  } else {
    console.log('CALLKEEP: no pending call on boot');
  }
};

console.log('CALLKEEP: registering listeners');
RNCallKeep.addEventListener('answerCall', handleAnswerCall);
RNCallKeep.addEventListener('endCall', handleEndCall);
RNCallKeep.addEventListener('didDisplayIncomingCall', handleDidDisplayIncomingCall);

bootstrapPendingCallCheck();

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';
