// Import polyfills first
import 'react-native-get-random-values';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import './services/cryptoPolyfill';
// Register background messaging handler as early as possible
import './firebase-messaging';
import { router } from 'expo-router';

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

// Handle CallKeep answer event - navigate to call screen
RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
  console.log('CallKeep answerCall event:', callUUID);
  
  try {
    const callData = global.incomingCallData;
    if (callData) {
      const { appointmentId, callType } = callData;
      const path = `/chat/${String(appointmentId)}?action=accept&callType=${callType}`;
      setTimeout(() => {
        router.push(path);
      }, 300);
    }
  } catch (error) {
    console.error('Error navigating on answer:', error);
  }
});

// Handle CallKeep end call event
RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
  console.log('CallKeep endCall event:', callUUID);
  callkeepService.endCall(callUUID);
  global.incomingCallData = null;
});

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';
