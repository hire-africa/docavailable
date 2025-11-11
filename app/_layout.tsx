import notifee, { AndroidVisibility, AndroidImportance as NotifeeAndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomAlertProvider from '../components/CustomAlertProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import callDeduplicationService from '../services/callDeduplicationService';
import pushNotificationService from '../services/pushNotificationService';
import { routeIncomingCall } from '../utils/callRouter';
import { routePushEvent } from '../utils/notificationRouter';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import appInitializer from '../services/appInitializer';
import '../services/cryptoPolyfill';
import fullScreenPermissionService from '../services/fullScreenPermissionService';
import apiService from './services/apiService';

export default function RootLayout() {
  const router = useRouter();
  const [isCallBooting, setIsCallBooting] = useState(true);
  
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
    const incomingCallModule: any = NativeModules?.IncomingCallModule;
    let isMounted = true;

    if (!incomingCallModule) {
      console.log('⚠️ IncomingCallModule not available on NativeModules');
      if (isMounted) {
        setIsCallBooting(false);
      }
      return () => {
        isMounted = false;
      };
    }

    const emitter = new NativeEventEmitter(incomingCallModule);

    const handleIncomingCall = (payload: any) => {
      if (!payload) {
        console.log('⚠️ [IncomingCallBridge] Empty payload received, ignoring');
        return;
      }

      const callTypeRaw = payload.call_type || payload.callType || 'audio';
      const appointmentIdRaw = payload.appointment_id || payload.appointmentId;
      const doctorNameRaw = payload.doctor_name || payload.doctorName || payload.caller_name || payload.callerName || '';
      const doctorAvatar = payload.doctor_profile_picture || payload.doctorProfilePicture || '';

      const normalizedPayload = {
        type: 'incoming_call',
        call_type: callTypeRaw,
        callType: callTypeRaw,
        appointment_id: appointmentIdRaw,
        appointmentId: appointmentIdRaw,
        doctor_name: doctorNameRaw,
        doctorName: doctorNameRaw,
        doctor_profile_picture: doctorAvatar,
        doctorProfilePicture: doctorAvatar,
      };

      console.log('📞 [IncomingCallBridge] Routing incoming call from native event', normalizedPayload);
      routeIncomingCall(router, normalizedPayload as any);
      if (isMounted) {
        setIsCallBooting(false);
      }
    };

    const subscription = emitter.addListener('incomingCallShow', handleIncomingCall);

    (async () => {
      if (typeof incomingCallModule.getPendingIncomingCall === 'function') {
        try {
          const pending = await incomingCallModule.getPendingIncomingCall();
          if (pending) {
            console.log('📞 [IncomingCallBridge] Processing pending incoming call payload', pending);
            handleIncomingCall(pending);
            return;
          }
        } catch (error) {
          console.warn('⚠️ [IncomingCallBridge] Failed to fetch pending incoming call', error);
        }
      }

      if (isMounted) {
        setIsCallBooting(false);
      }
    })();

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);

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

        // Request full-screen intent permissions for incoming calls (Android 12+)
        if (Platform.OS === 'android') {
          try {
            console.log('📱 Requesting full-screen intent permissions...');
            await fullScreenPermissionService.requestFullScreenPermission();
            
            // Perform complete setup check
            const setupResult = await fullScreenPermissionService.performCompleteSetup();
            if (!setupResult.success) {
              console.log('⚠️ Some permissions missing for full-screen calls:', setupResult.missingPermissions);
              console.log('💡 User needs to enable: Settings → Apps → DocAvailable → Display over other apps');
            }
          } catch (error) {
            console.log('⚠️ Could not check full-screen permissions:', error);
          }
        }

        // Request notification permissions
        if (Platform.OS === 'android') {
          try {
            console.log('🔔 Requesting Android notification permission...');
            // For Android, notifee automatically handles permissions when creating channels
            // No need to explicitly request permissions like iOS
            console.log('🔔 Android notification permissions handled automatically');
          } catch (error) {
            console.log('🔔 Android notification setup error:', error);
          }
        } else if (Platform.OS === 'ios') {
          try {
            console.log('🔔 Requesting iOS notification permission...');
            const iosPermission = await notifee.requestPermission({
              alert: true,
              badge: true,
              sound: true,
              criticalAlert: false,
              announcement: true,
            });
            console.log('🔔 iOS permission result:', iosPermission);
          } catch (error) {
            console.log('🔔 iOS permission request failed:', error);
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

        // For incoming calls, route to call screen (skip notification popup in foreground)
        if (type === 'incoming_call') {
          console.log('📱 [Foreground] Incoming call - routing to call screen');
          console.log('📱 [Foreground] Call data:', data);
          
          // Check deduplication service to prevent multiple call screens
          const appointmentId = String(data.appointment_id || '');
          const callType = (data.call_type === 'video' ? 'video' : 'audio') as 'audio' | 'video';
          
          if (!callDeduplicationService.shouldShowCall(appointmentId, callType, 'firebase')) {
            console.log('📱 [Foreground] Duplicate call blocked by deduplication service');
            return;
          }
          
          // In foreground: Skip notification popup, just route to call screen
          // WebSocket already shows the incoming call UI, so notification is redundant
          try {
            routeIncomingCall(router, data);
            console.log('✅ [Foreground] Routed to call screen (no notification popup)');
          } catch (error) {
            console.error('❌ [Foreground] Failed to route call:', error);
          }
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
          <ThemeProvider>
            <CustomAlertProvider>
            {isCallBooting ? (
              <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16 }}>Connecting call...</Text>
              </View>
            ) : (
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
              <Stack.Screen name="call" options={{ headerShown: false }} />
              <Stack.Screen name="help-support" options={{ headerShown: false }} />
              <Stack.Screen name="payments/checkout" options={{
                headerShown: false,
                gestureEnabled: true
              }} />
              <Stack.Screen name="test-webview" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          )}
            </CustomAlertProvider>
        </ThemeProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 