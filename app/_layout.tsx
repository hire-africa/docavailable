import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
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
  useEffect(() => {
    // Warm the backend on app start to reduce initial timeouts due to cold starts
    apiService.healthCheck().catch(() => {
      // Ignore errors here; this is a best-effort warm-up
    });

    // Configure Android notification channels and default handler
    (async () => {
      try {
        // Calls channel
        await Notifications.setNotificationChannelAsync('calls', {
          name: 'Calls',
          importance: AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          bypassDnd: true,
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        });

        // Messages channel
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        });

        // Appointments channel
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Appointments',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        });

        // Default notification handler - always show pop-ups
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const data = notification.request.content.data || {};
            const type = (data.type || '').toString();

            // Always show pop-up notifications for all types
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
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

    // Foreground handler for all notification types
    const onMessageUnsub = messaging().onMessage(async (remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        const notification = remoteMessage?.notification || {};
        const type = data?.type || '';

        console.log('🔔 [Foreground] Received notification:', { type, data, notification });

        // For incoming calls, route immediately
        if (type === 'incoming_call') {
          routeIncomingCall(router, data);
          return;
        }

        // For messages and appointments, show pop-up notification
        if (type === 'chat_message' || type === 'new_message' || type.includes('appointment') || type.includes('session')) {
          // Show immediate pop-up notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title || (type === 'chat_message' ? 'New Message' : 'Appointment Update'),
              body: notification.body || (type === 'chat_message' ? 'You have a new message' : 'You have an appointment update'),
              data,
              sound: 'default',
            },
            trigger: null,
          });
        } else {
          // For other notification types, show generic pop-up notification
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

        // Let the centralized router process (it will no-op for non-call events in foreground)
        routePushEvent(router, data, 'foreground');
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
  );
} 