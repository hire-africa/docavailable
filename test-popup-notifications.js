// Test script for popup notifications
import notifee, { AndroidImportance } from '@notifee/react-native';

export const testPopupNotifications = async () => {
  console.log('🔔 Testing Popup Notifications...');
  
  try {
    // Create channels with proper configuration
    await notifee.createChannel({
      id: 'calls',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [250, 250, 250, 250],
      bypassDnd: true,
    });

    await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: 'appointments',
      name: 'Appointments',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    console.log('✅ Notification channels created');

    // Test 1: Regular popup notification
    console.log('1. Testing regular popup notification...');
    await notifee.displayNotification({
      title: 'Test Popup Notification',
      body: 'This should appear as a popup on your screen',
      android: {
        channelId: 'messages',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        sound: 'default',
        vibrationPattern: [250, 250, 250, 250],
      },
    });

    // Test 2: Incoming call style notification
    console.log('2. Testing incoming call style notification...');
    await notifee.displayNotification({
      title: 'Dr. Smith - Video Call',
      body: 'Incoming call...',
      android: {
        channelId: 'calls',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        fullScreenAction: {
          id: 'default',
        },
        sound: 'default',
        vibrationPattern: [250, 250, 250, 250],
      },
    });

    // Test 3: Appointment notification
    console.log('3. Testing appointment notification...');
    await notifee.displayNotification({
      title: 'Appointment Reminder',
      body: 'Your appointment is in 30 minutes',
      android: {
        channelId: 'appointments',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        sound: 'default',
      },
    });

    console.log('🎉 All test notifications sent!');
    console.log('Check your device for popup notifications.');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing popup notifications:', error);
    return false;
  }
};

// Run the test
export const runPopupTest = async () => {
  console.log('🚀 Starting popup notification test...');
  const success = await testPopupNotifications();
  
  if (success) {
    console.log('✅ Popup notification test completed successfully!');
  } else {
    console.log('❌ Popup notification test failed!');
  }
  
  return success;
};
