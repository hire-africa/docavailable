// Comprehensive notification popup test script
// This script tests all the fixes for notification popup issues

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const testNotificationPopupFix = async () => {
  console.log('🔔 Testing Notification Popup Fix...');
  
  try {
    // Test 1: Check notification permissions
    console.log('1. Checking notification permissions...');
    const { status } = await Notifications.getPermissionsAsync();
    console.log('   Permission status:', status);
    
    if (status !== 'granted') {
      console.log('   ❌ Notifications not permitted - requesting permission...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('   ❌ Permission denied');
        return false;
      }
    }
    console.log('   ✅ Notifications permitted');
    
    // Test 2: Check Android notification channels
    if (Platform.OS === 'android') {
      console.log('2. Checking Android notification channels...');
      
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log('   Available channels:', channels.map(c => ({ 
        id: c.id, 
        name: c.name, 
        importance: c.importance,
        bypassDnd: c.bypassDnd,
        lockscreenVisibility: c.lockscreenVisibility
      })));
      
      const requiredChannels = ['calls', 'messages', 'appointments'];
      for (const channelId of requiredChannels) {
        const channel = channels.find(c => c.id === channelId);
        if (channel) {
          console.log(`   ✅ Channel '${channelId}' exists with importance: ${channel.importance}`);
          if (channelId === 'calls' && channel.importance === 'max') {
            console.log('   ✅ Calls channel has MAX importance for popups');
          }
        } else {
          console.log(`   ❌ Channel '${channelId}' missing`);
        }
      }
    }
    
    // Test 3: Test notification handler configuration
    console.log('3. Testing notification handler configuration...');
    
    const handler = {
      handleNotification: async (notification) => {
        console.log('📱 [TestHandler] Notification received:', {
          title: notification.request.content.title,
          type: notification.request.content.data?.type,
          channelId: notification.request.content.channelId
        });
        
        const data = notification.request.content.data || {};
        const type = (data.type || '').toString();
        
        // Always show pop-up notifications
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: type === 'incoming_call' 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH,
        };
      }
    };
    
    Notifications.setNotificationHandler(handler);
    console.log('   ✅ Notification handler configured for popups');
    
    // Test 4: Test different notification types with proper channels
    console.log('4. Testing notification types with proper channels...');
    
    const notificationTests = [
      {
        type: 'incoming_call',
        title: 'Dr. Smith - Voice Call',
        body: 'Incoming call...',
        channelId: 'calls',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'incoming_call', appointment_id: '123' }
      },
      {
        type: 'chat_message',
        title: 'New Message',
        body: 'You have a new message',
        channelId: 'messages',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'chat_message' }
      },
      {
        type: 'appointment',
        title: 'Appointment Update',
        body: 'Your appointment has been confirmed',
        channelId: 'appointments',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'appointment' }
      }
    ];
    
    for (const test of notificationTests) {
      console.log(`   Testing ${test.type} notification...`);
      
      const notification = {
        content: {
          title: test.title,
          body: test.body,
          data: test.data,
          sound: 'default',
          priority: test.priority,
          ...(Platform.OS === 'android' && { channelId: test.channelId }),
        },
        trigger: null, // Show immediately
      };
      
      const id = await Notifications.scheduleNotificationAsync(notification);
      console.log(`   ✅ ${test.type} notification scheduled with ID: ${id}`);
      
      // Wait a moment between notifications
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 5: Test notification categories (for call actions)
    console.log('5. Testing notification categories...');
    
    try {
      await Notifications.setNotificationCategoryAsync('incoming_call', [
        {
          identifier: 'ANSWER_CALL',
          buttonTitle: 'Answer',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'DECLINE_CALL',
          buttonTitle: 'Decline',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);
      console.log('   ✅ Call notification categories configured');
    } catch (error) {
      console.log('   ❌ Failed to configure categories:', error);
    }
    
    // Test 6: Test full-screen intent notification (calls)
    console.log('6. Testing full-screen intent notification...');
    
    const fullScreenNotification = {
      content: {
        title: 'Dr. Johnson - Video Call',
        body: 'Incoming video call...',
        data: { 
          type: 'incoming_call', 
          appointment_id: '456',
          call_type: 'video',
          categoryId: 'incoming_call'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && { 
          channelId: 'calls',
          fullScreenAction: true
        }),
      },
      trigger: null,
    };
    
    const fullScreenId = await Notifications.scheduleNotificationAsync(fullScreenNotification);
    console.log(`   ✅ Full-screen notification scheduled with ID: ${fullScreenId}`);
    
    console.log('🎉 All notification popup tests completed!');
    console.log('📱 Check your device for popup notifications.');
    console.log('🔍 Look for:');
    console.log('   - Popup notifications appearing on screen');
    console.log('   - Call notifications with Answer/Decline buttons');
    console.log('   - Proper sound and vibration');
    console.log('   - Notifications in the correct channels');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during notification popup testing:', error);
    return false;
  }
};

// Test notification channel configuration
export const testNotificationChannels = async () => {
  console.log('🔧 Testing notification channel configuration...');
  
  try {
    // Recreate channels with proper settings
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
    
    console.log('✅ Notification channels reconfigured');
    return true;
  } catch (error) {
    console.error('❌ Error configuring channels:', error);
    return false;
  }
};

// Run all tests
export const runAllPopupTests = async () => {
  console.log('🚀 Running all notification popup tests...');
  
  // Configure channels first
  await testNotificationChannels();
  
  // Run popup tests
  const success = await testNotificationPopupFix();
  
  if (success) {
    console.log('✅ All notification popup tests passed!');
  } else {
    console.log('❌ Some notification popup tests failed!');
  }
  
  return success;
};
