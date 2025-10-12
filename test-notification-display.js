// Test script to verify notification display functionality
// Run this in the React Native app to test notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const testNotificationDisplay = async () => {
  console.log('🔔 Testing Notification Display...');
  
  try {
    // Test 1: Check notification permissions
    console.log('1. Checking notification permissions...');
    const { status } = await Notifications.getPermissionsAsync();
    console.log('   Permission status:', status);
    
    if (status !== 'granted') {
      console.log('   ❌ Notifications not permitted');
      return false;
    }
    console.log('   ✅ Notifications permitted');
    
    // Test 2: Check notification channels (Android)
    if (Platform.OS === 'android') {
      console.log('2. Checking Android notification channels...');
      
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log('   Available channels:', channels.map(c => ({ id: c.id, name: c.name, importance: c.importance })));
      
      const requiredChannels = ['calls', 'messages', 'appointments'];
      for (const channelId of requiredChannels) {
        const channel = channels.find(c => c.id === channelId);
        if (channel) {
          console.log(`   ✅ Channel '${channelId}' exists with importance: ${channel.importance}`);
        } else {
          console.log(`   ❌ Channel '${channelId}' missing`);
        }
      }
    }
    
    // Test 3: Test immediate notification display
    console.log('3. Testing immediate notification display...');
    
    const testNotification = {
      content: {
        title: 'Test Notification',
        body: 'This is a test to verify pop-up display',
        data: { type: 'test' },
        sound: 'default',
      },
      trigger: null, // Show immediately
    };
    
    const notificationId = await Notifications.scheduleNotificationAsync(testNotification);
    console.log('   ✅ Test notification scheduled with ID:', notificationId);
    
    // Test 4: Test notification handler settings
    console.log('4. Checking notification handler settings...');
    
    const handler = Notifications.getNotificationHandler();
    console.log('   Current handler:', handler);
    
    // Test 5: Test different notification types
    console.log('5. Testing different notification types...');
    
    const notificationTypes = [
      { type: 'calls', title: 'Incoming Call', body: 'Test call notification' },
      { type: 'messages', title: 'New Message', body: 'Test message notification' },
      { type: 'appointments', title: 'Appointment Update', body: 'Test appointment notification' },
    ];
    
    for (const notif of notificationTypes) {
      const channelId = Platform.OS === 'android' ? notif.type : undefined;
      
      const notification = {
        content: {
          title: notif.title,
          body: notif.body,
          data: { type: notif.type },
          sound: 'default',
          ...(channelId && { channelId }),
        },
        trigger: null,
      };
      
      const id = await Notifications.scheduleNotificationAsync(notification);
      console.log(`   ✅ ${notif.type} notification scheduled with ID: ${id}`);
    }
    
    console.log('🎉 All notification display tests completed!');
    console.log('Check your device for the test notifications.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during notification display testing:', error);
    return false;
  }
};

// Test notification handler configuration
export const testNotificationHandler = () => {
  console.log('🔧 Testing notification handler configuration...');
  
  const handler = {
    handleNotification: async (notification) => {
      console.log('📱 Notification handler called:', notification);
      
      const data = notification.request.content.data || {};
      const type = (data.type || '').toString();
      
      console.log('   Notification type:', type);
      console.log('   Title:', notification.request.content.title);
      console.log('   Body:', notification.request.content.body);
      
      // Always show pop-up notifications for all types
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
  };
  
  Notifications.setNotificationHandler(handler);
  console.log('✅ Notification handler configured');
  
  return handler;
};

// Run the tests
export const runAllNotificationTests = async () => {
  console.log('🚀 Running all notification tests...');
  
  // Configure handler first
  testNotificationHandler();
  
  // Run display tests
  const success = await testNotificationDisplay();
  
  if (success) {
    console.log('✅ All notification tests passed!');
  } else {
    console.log('❌ Some notification tests failed!');
  }
  
  return success;
};
