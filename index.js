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
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
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
      // Create WhatsApp-like call notification with actions
      const callerName = data.doctor_name || data.doctorName || 'Unknown Caller';
      const callType = data.call_type === 'video' ? 'Video Call' : 'Voice Call';
      
      console.log('📞 [BackgroundHandler] Creating incoming call notification:', {
        callerName,
        callType,
        data
      });
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${callerName} - ${callType}`,
          body: 'Incoming call...',
          data: {
            ...data,
            categoryId: 'incoming_call',
            priority: 'high',
            fullScreenAction: true
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          channelId: 'calls',
          // Add caller profile picture if available
          ...(data.doctor_profile_picture && {
            attachments: [{
              url: data.doctor_profile_picture,
              type: 'image'
            }]
          })
        },
        trigger: null,
      });
    } else if (type === 'chat_message' || type === 'new_message') {
      console.log('💬 [BackgroundHandler] Creating message notification');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'New Message',
          body: notification.body || 'You have a new message',
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'messages',
        },
        trigger: null,
      });
    } else if (type.includes('appointment') || type.includes('session')) {
      console.log('📅 [BackgroundHandler] Creating appointment notification');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'Appointment Update',
          body: notification.body || 'You have an appointment update',
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'appointments',
        },
        trigger: null,
      });
    } else {
      // Generic notification for other types
      console.log('🔔 [BackgroundHandler] Creating generic notification');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'DocAvailable',
          body: notification.body || 'You have a new notification',
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
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

