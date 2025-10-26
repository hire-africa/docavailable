import notifee, { AndroidVisibility, AndroidImportance as NotifeeAndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import pushNotificationService from '../services/pushNotificationService';
import { routeIncomingCall } from '../utils/callRouter';
import { routePushEvent } from '../utils/notificationRouter';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import appInitializer from '../services/appInitializer';
import '../services/cryptoPolyfill';
import apiService from './services/apiService';

export default function RootLayout() {
  const router = useRouter();
  
  // Request phone permissions for call handling
  const requestPhonePermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        ];
        
        const results = await PermissionsAndroid.requestMultiple(permissions);
        console.log('📞 Phone permissions requested:', results);
        
        // Check if all permissions were granted
        const allGranted = Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
        if (allGranted) {
          console.log('✅ All phone permissions granted');
        } else {
          console.log('⚠️ Some phone permissions denied');
        }
      } catch (error) {
        console.error('❌ Error requesting phone permissions:', error);
      }
    }
  };

  useEffect(() => {
    // Request phone permissions first
    requestPhonePermissions();
    
    // Warm the backend on app start to reduce initial timeouts due to cold starts
    apiService.healthCheck().catch(() => {
      // Ignore errors here; this is a best-effort warm-up
    });

    // Configure Android notification channels and default handler with notifee
    (async () => {
      try {
        // Request notification permissions first
        console.log('🔔 Requesting notification permissions...');
        const permission = await notifee.requestPermission({
          alert: true,
          badge: true,
          sound: true,
          lockScreen: true,
          notificationCenter: true,
          carPlay: true,
          criticalAlert: false,
          announcement: true,
        });
        console.log('🔔 Permission request result:', permission);

        // Request floating notification permission (Android 5.0+)
        if (Platform.OS === 'android') {
          try {
            console.log('🔔 Requesting floating notification permission...');
            const floatingPermission = await notifee.requestPermission({
              alert: true,
              badge: true,
              sound: true,
              lockScreen: true,
              notificationCenter: true,
              carPlay: true,
              criticalAlert: false,
              announcement: true,
            });
            console.log('🔔 Floating permission result:', floatingPermission);
          } catch (error) {
            console.log('🔔 Floating permission not available:', error);
          }
        }

        // Create channels with notifee for better popup control
        await notifee.createChannel({
          id: 'calls',
          name: 'Incoming Calls',
          importance: NotifeeAndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [250, 250, 250, 250],
          bypassDnd: true,
          visibility: AndroidVisibility.PUBLIC,
        });

        await notifee.createChannel({
          id: 'messages',
          name: 'Messages',
          importance: NotifeeAndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        await notifee.createChannel({
          id: 'appointments',
          name: 'Appointments',
          importance: NotifeeAndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        // Set up notification categories for call actions
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

        // Default notification handler - always show pop-ups
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const data = notification.request.content.data || {};
            const type = (data.type || '').toString();

            console.log('🔔 [NotificationHandler] Processing notification:', {
              type,
              title: notification.request.content.title,
              data
            });

            // Always show popup for all notifications
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true,
              priority: type === 'incoming_call' 
                ? Notifications.AndroidNotificationPriority.MAX 
                : Notifications.AndroidNotificationPriority.HIGH,
            };
          }
        });
      } catch (e) {
        console.warn('Failed to configure notification channels', e);
      }
    })();
    
    // Initialize global services
    appInitializer.initialize();

    // Register for FCM (permission + token) and send to backend
    pushNotificationService.registerForPushNotifications().catch(() => {});

      // Initialize global WebRTC signaling service (temporarily disabled)
      // globalWebRTCService.connect().catch((error) => {
      //   console.error('❌ Failed to connect global WebRTC service:', error);
      // });

      // Set up incoming call handler for global WebRTC service
      // globalWebRTCService.onIncomingCall((callData) => {
      //   console.log('📞 [GlobalWebRTC] Incoming call received via global service:', callData);
      //   routeIncomingCall(router, callData);
      // });

    // Foreground handler for all notification types with notifee
    const onMessageUnsub = messaging().onMessage(async (remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        const notification = remoteMessage?.notification || {};
        const type = (data?.type || '').toString();

        console.log('📱 [Foreground] Received FCM message:', {
          type,
          title: notification.title,
          body: notification.body,
          data
        });

        // For incoming calls, show system ringtone notification and route to call screen
        if (type === 'incoming_call') {
          console.log('📱 [Foreground] Incoming call - showing ringtone notification and routing');
          console.log('📱 [Foreground] Call data:', data);
          console.log('📱 [Foreground] Router available:', !!router);
          
          // Create calls channel with system ringtone
          await notifee.createChannel({
            id: 'calls',
            name: 'Incoming Calls',
            importance: NotifeeAndroidImportance.MAX,
            sound: 'default', // Use system default ringtone
            vibration: true,
            vibrationPattern: [1000, 500, 1000, 500], // Ring pattern
            bypassDnd: true,
            lights: true,
            lightColor: '#FF0000',
            showBadge: true,
          });

          // Show notification with system ringtone
          await notifee.displayNotification({
            title: notification.title || 'Incoming Call',
            body: notification.body || 'Incoming call...',
            data,
            android: {
              channelId: 'calls',
              importance: NotifeeAndroidImportance.MAX,
              pressAction: {
                id: 'default',
              },
              fullScreenAction: {
                id: 'default',
              },
              sound: 'default', // System ringtone
              vibrationPattern: [1000, 500, 1000, 500], // Ring pattern
              smallIcon: 'ic_launcher',
              largeIcon: 'ic_launcher',
              color: '#FF0000', // Red for incoming calls
              lights: ['#FF0000', 1000, 1000], // [color, on_ms, off_ms]
              ongoing: true, // Make it ongoing so it can't be dismissed easily
              autoCancel: false, // Don't auto-cancel
              style: {
                type: 1, // BigTextStyle
                text: `Incoming ${data.call_type === 'video' ? 'Video' : 'Voice'} Call from ${data.doctor_name || 'Doctor'}`,
              },
            },
          });

          // Route to call screen
          routeIncomingCall(router, data);
          console.log('📱 [Foreground] Call routing completed');
          return;
        }

        // For other notifications, determine channel and display
        const channelId = type.includes('message') ? 'messages' : 
                         type.includes('appointment') ? 'appointments' : 'default';

        // Ensure channel exists before displaying notification
        await notifee.createChannel({
          id: channelId,
          name: channelId === 'messages' ? 'Messages' : 
                channelId === 'appointments' ? 'Appointments' : 'Default',
          importance: NotifeeAndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [250, 250, 250, 250],
        });

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
                console.log('📱 [Foreground] Fetched actual message content:', messageContent);
              }
            }
          } catch (error) {
            console.log('📱 [Foreground] Could not fetch message content, using generic:', error);
            expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
          }
        } else if (type.includes('message')) {
          expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
        } else if (type.includes('appointment')) {
          expandedText = `Appointment Update: ${messageContent}`;
        }

        // Use notifee for reliable popup display
        await notifee.displayNotification({
          title: notification.title || 'DocAvailable',
          body: messageContent,
          data,
          android: {
            channelId,
            importance: NotifeeAndroidImportance.HIGH,
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

        console.log('📱 [Foreground] Notification displayed');
      } catch (e) {
        console.error('Failed to handle foreground FCM:', e);
      }
    });

    // App opened from background by tapping notification
    const onOpenedUnsub = messaging().onNotificationOpenedApp((remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        routePushEvent(router, data, 'opened');
      } catch (e) {
        console.error('Failed to handle opened-app FCM:', e);
      }
    });

    // Cold start (app was quit)
    messaging().getInitialNotification().then((remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        routePushEvent(router, data, 'initial');
      } catch {}
    }).catch(() => {});

    return () => {
      onMessageUnsub();
      onOpenedUnsub();
    };
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="signup" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="doctor-signup" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="patient-signup" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="google-signup-questions" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="password-reset/[token]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="verify-reset-code" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="reset-password-with-code" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="doctor-dashboard" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="patient-dashboard" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="admin-dashboard" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="pending-approval" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="doctor-profile" options={{ headerShown: false }} />
          <Stack.Screen name="patient-profile" options={{ headerShown: false }} />
          <Stack.Screen name="edit-doctor-profile" options={{ headerShown: false }} />
          <Stack.Screen name="edit-patient-profile" options={{ headerShown: false }} />
          <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
          <Stack.Screen name="notifications-settings" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)/doctor-details/[uid]" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)/doctor-details/BookAppointmentFlow" options={{ headerShown: false }} />
          <Stack.Screen name="doctor-approval/[uid]" options={{ headerShown: false }} />
          <Stack.Screen name="appointment-details/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="my-appointments" options={{ headerShown: false }} />
          
          <Stack.Screen name="text-session-history" options={{ headerShown: false }} />
          <Stack.Screen name="blog" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article-2" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article-3" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article-4" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article-5" options={{ headerShown: false }} />
          <Stack.Screen name="blog-article-6" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[appointmentId]" options={{ headerShown: false }} />
          <Stack.Screen name="ended-session/[appointmentId]" options={{ headerShown: false }} />
          <Stack.Screen name="help-support" options={{ headerShown: false }} />
          <Stack.Screen name="payments/checkout" options={{ 
            headerShown: false,
            gestureEnabled: true
          }} />
          <Stack.Screen name="test-webview" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 