// Import polyfills first
import 'react-native-get-random-values';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import './services/cryptoPolyfill';
// Register background messaging handler as early as possible
import './firebase-messaging';
import { router } from 'expo-router';
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
    console.log('CallKeep setup complete');
  } catch (e) {
    console.log('CallKeep setup error:', e);
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
    }
  }

  if (callData && !callData.callId) {
    callData.callId = callUUID;
  }

  return callData || null;
};

const navigateToActiveCall = (callData) => {
  if (!callData?.appointmentId) {
    return;
  }

  const path = `/chat/${String(callData.appointmentId)}?action=accept&callType=${callData.callType ?? 'audio'}`;

  setTimeout(() => {
    try {
      router.push(path);
    } catch (error) {
      console.error('Navigation error on call accept:', error);
    }
  }, 300);
};

const handleAnswerCall = async ({ callUUID }) => {
  console.log('CallKeep answerCall event:', callUUID);

  try {
    await callkeepService.answerCall(callUUID);
  } catch (error) {
    console.error('CallKeep answerCall invoke error:', error);
  }

  const callData = await ensureCallData(callUUID);
  navigateToActiveCall(callData);
};

const clearCallData = async () => {
  global.incomingCallData = null;
  await clearStoredCallData();
};

const handleEndCall = async ({ callUUID, reason }) => {
  console.log('CallKeep endCall event:', callUUID, 'reason:', reason);

  try {
    await callkeepService.endCall(callUUID);
  } catch (error) {
    console.error('CallKeep endCall invoke error:', error);
  } finally {
    await clearCallData();
  }
};

RNCallKeep.addEventListener('answerCall', handleAnswerCall);
RNCallKeep.addEventListener('endCall', handleEndCall);

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';
