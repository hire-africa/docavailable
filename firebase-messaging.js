import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidCategory } from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const data = remoteMessage?.data || {};

    await notifee.createChannel({
      id: 'calls',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: 'Incoming Call',
      body: data?.caller || data?.doctor_name || 'Unknown caller',
      data,
      android: {
        channelId: 'calls',
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.CALL,
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'accept' },
        actions: [
          { title: 'Accept', pressAction: { id: 'accept' } },
          { title: 'Reject', pressAction: { id: 'reject' } },
        ],
      },
    });
  } catch (e) {
    console.log('Background FCM handler error:', e);
  }
});
