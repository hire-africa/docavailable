import 'expo-router/entry';
import messaging from '@react-native-firebase/messaging';

// Background/killed message handler (Android & iOS)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    console.log('[FCM] Background message:', remoteMessage?.data || remoteMessage);
    // Note: Navigation is not available here. You can display a local notification
    // or schedule a foreground service (Android) from native code if needed.
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[FCM] Background handler error:', e);
  }
});
