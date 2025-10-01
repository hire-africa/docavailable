import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

// Background/Killed handler: Display a high-importance local notification for incoming calls
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    const data = remoteMessage?.data || {};
    if (data?.type === 'incoming_call') {
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.call_type === 'video' ? 'Incoming video call' : 'Incoming audio call',
          body: 'Tap to answer',
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
