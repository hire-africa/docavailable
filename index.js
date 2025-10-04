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
  }
});

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';
