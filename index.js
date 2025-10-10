// Import polyfills first
import 'react-native-get-random-values';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import './services/cryptoPolyfill';

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
  console.log('🔥 Firebase not initialized, this should not happen with RN Firebase');
} else {
  console.log('🔥 Firebase app initialized:', firebase.apps[0].name);
}

// Import Firebase messaging after app initialization
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

// Background/Killed handler: Display notifications for calls, messages, and appointments
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    const data = remoteMessage?.data || {};
    const notification = remoteMessage?.notification || {};
    const type = data?.type || '';

    // Set up notification channels
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Handle different notification types
    if (type === 'incoming_call') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.call_type === 'video' ? 'Incoming video call' : 'Incoming audio call',
          body: 'Tap to answer',
          data,
          sound: 'default',
        },
        trigger: null,
      });
    } else if (type === 'chat_message' || type === 'new_message') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'New Message',
          body: notification.body || 'You have a new message',
          data,
          sound: 'default',
        },
        trigger: null,
      });
    } else if (type.includes('appointment') || type.includes('session')) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'Appointment Update',
          body: notification.body || 'You have an appointment update',
          data,
          sound: 'default',
        },
        trigger: null,
      });
    } else {
      // Generic notification for other types
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'DocAvailable',
          body: notification.body || 'You have a new notification',
          data,
          sound: 'default',
        },
        trigger: null,
      });
    }
  } catch (e) {
    // headless errors must be swallowed
    console.error('Background message handler error:', e);
  }
});

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';

