// Import polyfills first
import 'react-native-get-random-values';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import './services/cryptoPolyfill';
// Register background messaging handler as early as possible
import './firebase-messaging';
import { router } from 'expo-router';
import { Platform } from 'react-native';
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

const navigateToActiveCall = (callData) => {
  if (!callData?.appointmentId) {
    console.warn('CALLKEEP: navigateToActiveCall missing appointmentId', callData);
    return;
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

  // ✅ Increased delay to ensure Root Layout is mounted
  setTimeout(() => {
    try {
      router.push(path);
      console.log('CALLKEEP: navigated directly to call screen:', path);
    } catch (error) {
      console.error('CALLKEEP: navigation error on call accept', error);
    }
  }, 800);
};

const handleAnswerCall = async ({ callUUID }) => {
  console.log('CALLKEEP: answerCall event', callUUID);

  // ✅ FIX 1: Dismiss system UI immediately on Android to prevent loop
  if (Platform.OS === 'android') {
    isDismissingSystemUI = true; // Set flag BEFORE calling endCall
    RNCallKeep.endCall(callUUID);
    console.log('CALLKEEP: dismissed system UI for', callUUID);
  }

  try {
    await callkeepService.answerCall(callUUID);
  } catch (error) {
    console.error('CALLKEEP: answerCall invoke error', error);
  }

  const callData = await ensureCallData(callUUID);
  console.log('CALLKEEP: answerCall using payload', callData);
  navigateToActiveCall(callData);
};

// Flag to track if we're dismissing UI (don't clear data)
let isDismissingSystemUI = false;

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
