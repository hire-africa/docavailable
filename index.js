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

// Import Notifee for runtime channel/permission setup and action events
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

// Create notification channel and request permission on app start
async function setupNotifications() {
  try {
    await notifee.requestPermission();
    await notifee.createChannel({
      id: 'calls_v2',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      bypassDnd: true,
    });
  } catch (e) {
    console.log('Notification setup error:', e);
  }
}

setupNotifications();

// Background message handling is now registered via './firebase-messaging'

function navigateToCallFromData(data, actionId) {
  try {
    const appt = data?.appointment_id || data?.appointmentId;
    if (appt) {
      const callType = data?.call_type || data?.callType || '';
      const actionParam = actionId ? `action=${encodeURIComponent(actionId)}` : '';
      const typeParam = callType ? `callType=${encodeURIComponent(callType)}` : '';
      const query = [actionParam, typeParam].filter(Boolean).join('&');
      const path = query ? `/chat/${String(appt)}?${query}` : `/chat/${String(appt)}`;
      setTimeout(() => router.push(path), 0);
    }
  } catch {}
}

async function handleInitialNotification() {
  try {
    const initial = await notifee.getInitialNotification();
    if (initial) {
      const actionId = initial.pressAction?.id;
      if (actionId === 'accept' || actionId === 'default') {
        navigateToCallFromData(initial.notification?.data, actionId);
      }
    }
  } catch {}
}

handleInitialNotification();

// Handle foreground notification actions (Accept/Reject)
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    if (actionId === 'accept') {
      navigateToCallFromData(detail.notification?.data, actionId);
    } else if (actionId === 'reject') {
      // no-op
    }
  }
});

// Handle background action presses
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    if (actionId === 'accept') {
      navigateToCallFromData(detail.notification?.data, actionId);
    } else if (actionId === 'reject') {
      // no-op
    }
  }
});

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';
