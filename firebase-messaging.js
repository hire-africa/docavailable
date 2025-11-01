import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidCategory, AndroidVisibility } from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const data = remoteMessage?.data || {};
    console.log('BG FCM handler received:', JSON.stringify(data));

    await notifee.createChannel({
      id: 'calls_v2',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: 'Incoming Call',
      body: data?.caller || data?.doctor_name || 'Unknown caller',
      data,
      android: {
        channelId: 'calls_v2',
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.CALL,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: true,
        autoCancel: false,
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'accept', launchActivity: 'default' },
        actions: [
          { title: 'Accept', pressAction: { id: 'accept', launchActivity: 'default' } },
          { title: 'Reject', pressAction: { id: 'reject', launchActivity: 'default' } },
        ],
      },
    });
  } catch (e) {
    console.log('Background FCM handler error:', e);
  }
});
