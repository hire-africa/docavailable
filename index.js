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
import notifee, { AndroidImportance, AndroidCategory, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { NativeModules, DeviceEventEmitter } from 'react-native';

const { IncomingCallModule } = NativeModules;

// Set up Notifee background event handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('🔔 [Notifee] Background event:', type, detail);
  
  if (type === EventType.PRESS) {
    console.log('🔔 [Notifee] Notification pressed in background');
    // Handle notification press - could navigate to call screen
  }
  
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'incoming_call') {
    console.log('🔔 [Notifee] Full-screen action pressed');
    // Handle full-screen action press
  }
});

// Background/Killed handler: Display notifications for calls, messages, and appointments with notifee
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    const data = remoteMessage?.data || {};
    const notification = remoteMessage?.notification || {};
    const type = (data?.type || '').toString();

    console.log('📱 [Background] Received FCM message:', {
      type,
      title: notification.title,
      body: notification.body
    });

    // For incoming calls, launch native activity directly + show notification
    if (type === 'incoming_call') {
      console.log('📱 [Background] Incoming call - launching native activity');
      
      try {
        // Use enhanced Notifee full-screen notification with maximum priority
        console.log('📱 [Background] Using enhanced full-screen notification approach');
        
        // Create calls channel with MAXIMUM priority for screen wake-up
        await notifee.createChannel({
          id: 'calls',
          name: 'Incoming Calls',
          importance: AndroidImportance.HIGH,
          sound: 'default', // System ringtone
          vibration: true,
          vibrationPattern: [1000, 500, 1000, 500], // Ring pattern
          bypassDnd: true,
          lights: true,
          lightColor: '#FF0000',
          visibility: 1, // VISIBILITY_PUBLIC - show on lock screen
        });

        // Display full-screen intent notification WITH TRIGGER (wakes device immediately)
        const notificationId = await notifee.displayNotification({
          id: `call_${data.appointment_id || Date.now()}`,
          title: notification.title || 'Incoming Call',
          body: notification.body || `Incoming ${data.call_type === 'video' ? 'video' : 'voice'} call...`,
          data: {
            ...data,
            notificationId: `call_${data.appointment_id || Date.now()}`,
          },
          android: {
            channelId: 'calls',
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.CALL, // Marks as call notification
            visibility: 1, // Show on lock screen
            showTimestamp: true,
            timestamp: Date.now(),
            showChronometer: true, // Shows ongoing timer
            lightUpScreen: true, // FORCE screen wake up
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            fullScreenAction: {
              id: 'incoming_call',
              launchActivity: 'com.docavailable.app.MainActivity', // Back to MainActivity with instant navigation
            },
            sound: 'default', // System ringtone
            vibrationPattern: [1000, 500, 1000, 500],
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
            color: '#FF0000',
            lights: ['#FF0000', 1000, 1000],
            ongoing: true, // Persistent until dismissed
            autoCancel: false,
            timeoutAfter: 30000, // Auto-dismiss after 30 seconds
            tag: 'incoming_call', // Group related notifications
            actions: [
              {
                title: '📞 Answer',
                pressAction: { id: 'answer' },
                icon: 'ic_launcher',
              },
              {
                title: '❌ Decline',
                pressAction: { id: 'decline' },
                icon: 'ic_launcher',
              },
            ],
            style: {
              type: 1, // BigTextStyle
              text: `Incoming ${data.call_type === 'video' ? 'Video' : 'Voice'} Call from ${data.doctor_name || 'Doctor'}`,
            },
          },
        });
        
        console.log(`✅ [Background] Notification displayed with ID: ${notificationId}`);
        console.log('✅ [Background] Full-screen call notification displayed');
        
        // Emit event for React Native app to handle when it comes to foreground
        try {
          DeviceEventEmitter.emit('INCOMING_CALL', {
            appointment_id: data.appointment_id || Date.now().toString(),
            call_type: data.call_type || 'video',
            doctor_name: data.doctor_name || 'Doctor',
            doctor_id: data.doctor_id || '1',
            doctor_profile_picture: data.doctor_profile_picture || ''
          });
          console.log('📡 [Background] Emitted INCOMING_CALL event for React Native');
        } catch (emitError) {
          console.warn('⚠️ [Background] Failed to emit INCOMING_CALL event:', emitError);
        }
        
        // Additional trigger: Create a second high-priority notification to force wake (immediate)
        try {
          const wakeId = await notifee.displayNotification({
            id: `wake_${Date.now()}`,
            title: 'Incoming Call',
            body: 'Wake up notification',
            android: {
              channelId: 'calls',
              importance: AndroidImportance.HIGH,
              category: AndroidCategory.CALL,
              visibility: 1,
              autoCancel: true,
              timeoutAfter: 3000, // Auto-dismiss after 3 seconds
              lightUpScreen: true, // FORCE screen wake up
              fullScreenAction: {
                id: 'wake_trigger',
                launchActivity: 'com.docavailable.app.MainActivity',
              },
              // Add more aggressive wake flags
              showTimestamp: false,
              ongoing: false,
            },
          });
          console.log(`🔔 [Background] Wake trigger notification sent with ID: ${wakeId}`);
        } catch (wakeError) {
          console.warn('⚠️ [Background] Wake trigger failed:', wakeError);
        }
      } catch (error) {
        console.error('❌ [Background] Failed to display call notification:', error);
      }
      return;
    }

    // Create channels with notifee
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
    });

    await notifee.createChannel({
      id: 'appointments',
      name: 'Appointments',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });


    // For other notifications, determine channel and display
    const channelId = type.includes('message') ? 'messages' : 
                     type.includes('appointment') ? 'appointments' : 'default';

    // For message notifications, try to fetch the actual message content
    let messageContent = notification.body || 'You have a new notification';
    let expandedText = messageContent;

    if (type.includes('message') && data.appointment_id) {
      try {
        // Fetch the latest message from the chat
        const response = await fetch(`https://docavailable.com/api/appointments/${data.appointment_id}/messages?limit=1&order=desc`);
        if (response.ok) {
          const messagesData = await response.json();
          if (messagesData.messages && messagesData.messages.length > 0) {
            const latestMessage = messagesData.messages[0];
            messageContent = latestMessage.message || latestMessage.content || messageContent;
            expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
            console.log('📱 [Background] Fetched actual message content:', messageContent);
          }
        }
      } catch (error) {
        console.log('📱 [Background] Could not fetch message content, using generic:', error);
        expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
      }
    } else if (type.includes('message')) {
      expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
    } else if (type.includes('appointment')) {
      expandedText = `Appointment Update: ${messageContent}`;
    }

    await notifee.displayNotification({
      title: notification.title || 'DocAvailable',
      body: messageContent,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        sound: 'default',
        vibrationPattern: [250, 250, 250, 250],
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        color: type.includes('message') ? '#2196F3' : 
               type.includes('appointment') ? '#FF9800' : '#4CAF50',
        // Add expanded text for better context
        style: {
          type: 1, // BigTextStyle
          text: expandedText,
        },
      },
    });

  } catch (e) {
    console.error('Background message handler error:', e);
  }
});

// Keep expo-router entry after handlers are set
export * from 'expo-router/entry';

