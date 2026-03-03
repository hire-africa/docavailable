import notifee, { AndroidVisibility, AndroidImportance as NotifeeAndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomAlertProvider from '../components/CustomAlertProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import authService from '../services/authService';
import callDeduplicationService from '../services/callDeduplicationService';
import pushNotificationService from '../services/pushNotificationService';
import { SessionNotificationHandler } from '../services/sessionNotificationHandler';
import { routeIncomingCall } from '../utils/callRouter';
import { routePushEvent } from '../utils/notificationRouter';

import apiService from './services/apiService';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import Constants from 'expo-constants';
import ForceUpdateScreen from '../components/ForceUpdateScreen';
import appInitializer from '../services/appInitializer';
import '../services/cryptoPolyfill';
import fullScreenPermissionService from '../services/fullScreenPermissionService';
import safePermissionManager from '../services/safePermissionManager';
import { compareVersions } from '../utils/versioning';

// Global error handler for catching unhandled exceptions in release builds
if (!__DEV__) {
  const defaultHandler = (ErrorUtils as any).getGlobalHandler();
  (ErrorUtils as any).setGlobalHandler((error: any, isFatal: any) => {
    console.error('🛑 [CRITICAL ERROR]', error, 'isFatal:', isFatal);
    // You could also send this to a remote logging service here
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// ⚠️ CRITICAL: Register notification channels as early as possible
const setupNotificationChannels = async () => {
  try {
    const channels = [
      {
        id: 'incoming_calls_v3',
        name: 'Incoming Calls (High Priority)',
        importance: NotifeeAndroidImportance.HIGH,
        sound: 'ringtone',
        vibration: true,
        vibrationPattern: [0, 1000, 500, 1000],
        bypassDnd: true,
        visibility: AndroidVisibility.PUBLIC,
      },
      {
        id: 'messages',
        name: 'Messages',
        importance: NotifeeAndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
      {
        id: 'appointments',
        name: 'Appointments',
        importance: NotifeeAndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      },
      {
        id: 'sessions',
        name: 'Sessions',
        importance: NotifeeAndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        description: 'Session start and end notifications',
      }
      ,
      {
        id: 'urgent_medical',
        name: 'Urgent Medical',
        importance: NotifeeAndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        bypassDnd: true,
        visibility: AndroidVisibility.PUBLIC,
      }
    ];

    for (const channel of channels) {
      await notifee.createChannel(channel);
    }
    console.log('✅ Notification channels registered at boot');
  } catch (error) {
    console.warn('⚠️ Early notification channel registration failed:', error);
  }
};

// Call immediately at module level
setupNotificationChannels();

export default function RootLayout() {
  console.log('🏁 [RootLayout] Rendering RootLayout component');
  const router = useRouter();
  const [isCallBooting, setIsCallBooting] = useState(true);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateData, setUpdateData] = useState({ title: '', message: '', storeUrl: '' });

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
    // Mark router as ready for index.js
    (global as any).isRouterReady = true;
    console.log('✅ [RootLayout] Router ready');

    // Handle call that arrived while app was killed
    const pendingCall = (global as any).pendingIncomingCallData;
    if (pendingCall) {
      console.log('📞 [RootLayout] Found pending call from killed state, routing...');
      (global as any).pendingIncomingCallData = null;

      setTimeout(() => {
        routeIncomingCall(router, pendingCall);
      }, 300); // Small delay ensures Stack navigator is mounted
    }

    return () => {
      (global as any).isRouterReady = false;
    };
  }, [router]);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        console.log(`Checking app version: ${currentVersion} on ${platform}`);
        const result = await apiService.checkAppVersion(platform, currentVersion);
        console.log('Version check result:', result);

        if (result.forceUpdate && compareVersions(currentVersion, result.minVersion) < 0) {
          console.log('⚠️ Force update required!');
          setUpdateData({
            title: result.title,
            message: result.message,
            storeUrl: result.storeUrl
          });
          setUpdateRequired(true);
        }
      } catch (e) {
        console.warn('❌ Version check failed:', e);
      }
    };
    checkVersion();
  }, []);

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

      // Check if user is authenticated before routing
      const currentUser = authService.getCurrentUserSync();
      if (!currentUser) {
        console.warn('⚠️ [IncomingCallBridge] User not authenticated, ignoring incoming call');
        if (isMounted) {
          setIsCallBooting(false);
        }
        return;
      }

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
    let isMounted = true;

    // Initialize app with proper error handling and cleanup
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');

        // Warm the backend (non-blocking)
        apiService.healthCheck().catch(() => {
          // Ignore errors here; this is a best-effort warm-up
        });

        // Initialize comprehensive permission system with timeout
        const permissionTimeout = setTimeout(() => {
          console.warn('⚠️ Permission initialization timeout - continuing without full permissions');
        }, 10000); // 10 second timeout

        try {
          console.log('🚀 Initializing safe permission system...');

          // Use safer permission manager with timeout
          const isFirstLaunch = await Promise.race([
            safePermissionManager.isFirstLaunch(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);

          if (!isMounted) return;

          if (isFirstLaunch) {
            console.log('🎉 First app launch - skipping automatic permission requests to prevent modals');

            // Mark first launch complete without requesting permissions
            await safePermissionManager.markFirstLaunchComplete();
            console.log('📊 Skipped permission requests - permissions will be requested when needed');
          } else {
            console.log('🔍 Checking critical permissions...');
            const criticalCheck = await Promise.race([
              safePermissionManager.checkCriticalPermissions(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Check timeout')), 2000))
            ]);

            if (!isMounted) return;

            if ((criticalCheck as any).missingCritical?.length > 0) {
              console.log('⚠️ Missing critical permissions:', (criticalCheck as any).missingCritical);
              console.log('📞 Can receive calls:', (criticalCheck as any).canReceiveCalls);
              console.log('📷 Can access camera:', (criticalCheck as any).canAccessCamera);
              console.log('🎤 Can access microphone:', (criticalCheck as any).canAccessMicrophone);
            } else {
              console.log('✅ All critical permissions are granted');
            }
          }

          clearTimeout(permissionTimeout);
        } catch (permissionError) {
          clearTimeout(permissionTimeout);
          console.warn('⚠️ Safe permission initialization failed, continuing with limited functionality:', permissionError);
          // Don't crash the app - continue with limited functionality
        }

        // Legacy full-screen permission check (safer approach)
        if (Platform.OS === 'android' && isMounted) {
          try {
            console.log('📱 Running legacy permission check...');
            const setupResult = await Promise.race([
              fullScreenPermissionService.performCompleteSetup(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Legacy timeout')), 3000))
            ]);

            if (!(setupResult as any)?.success) {
              console.log('⚠️ Legacy check - missing permissions:', (setupResult as any)?.missingPermissions);
            }
          } catch (error) {
            console.log('⚠️ Legacy permission check failed (non-critical):', error);
          }
        }

        // Setup notifications (safer approach)
        if (isMounted) {
          try {
            console.log('🔔 Setting up notifications...');

            // Skip automatic notification permission requests to prevent modals
            console.log('🔔 Notification setup - skipping permission requests to prevent modals');
            console.log('🔔 Notifications will be requested when user initiates calls or needs them');

            // Channels are now registered at the top level of this file
            console.log('🔔 Notification setup - channels already initialized at boot');

            console.log('✅ Notification setup completed');
          } catch (notificationError) {
            console.warn('⚠️ Notification setup failed (non-critical):', notificationError);
          }
        }

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
              channelId: type === 'incoming_call' ? 'incoming_calls_v3' : undefined,
            };
          }
        });
        // Initialize global services (safer approach)
        if (isMounted) {
          try {
            console.log('🚀 Initializing global services...');
            await Promise.race([
              appInitializer.initialize(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('App init timeout')), 5000))
            ]);
            console.log('✅ Global services initialized');
          } catch (initError) {
            console.warn('⚠️ Global services initialization failed (non-critical):', initError);
          }
        }

        // Initialize session notification handler
        if (isMounted) {
          try {
            SessionNotificationHandler.initialize();
            console.log('✅ Session notification handler initialized');
          } catch (sessionError) {
            console.warn('⚠️ Session handler initialization failed (non-critical):', sessionError);
          }
        }

        // Register for FCM (non-blocking)
        if (isMounted) {
          pushNotificationService.registerForPushNotifications(false).catch((fcmError) => {
            console.warn('⚠️ FCM registration failed (non-critical):', fcmError);
          });
        }

        console.log('✅ App initialization completed');
      } catch (error) {
        console.error('❌ Critical app initialization error:', error);
        // Don't crash the app - log error and continue
      }
    };

    // Start initialization
    initializeApp();

    // Foreground polling fallback for unread notifications (Android only)
    let pollTimer: any = null;
    let appStateSub: any = null;
    let lastUnreadCount = -1;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const authToken = await apiService.getAuthToken();
          if (!authToken) return;

          const res: any = await apiService.get('/notifications/unread', { limit: 5 });
          const unreadCount = res?.data?.unread_count;

          if (typeof unreadCount === 'number') {
            if (lastUnreadCount >= 0 && unreadCount > lastUnreadCount) {
              DeviceEventEmitter.emit('notifications:unread', {
                unreadCount,
                notifications: res?.data?.notifications || [],
                source: 'polling',
              });
              DeviceEventEmitter.emit('notifications:refresh', { source: 'polling' });
            }
            lastUnreadCount = unreadCount;
          }
        } catch {
          // Best-effort only
        }
      }, 60000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    if (Platform.OS === 'android') {
      startPolling();
      appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          startPolling();
        } else {
          stopPolling();
        }
      });
    }

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

        const isChatMessage = type === 'chat_message';
        const isIncomingCall = type === 'incoming_call';

        console.log('📱 [Foreground] Received FCM message:', {
          type,
          title: notification.title,
          body: notification.body,
          data
        });

        // For incoming calls, route to call screen (skip notification popup in foreground)
        if (isIncomingCall) {
          console.log('📱 [Foreground] Incoming call - routing to call screen');
          console.log('📱 [Foreground] Call data:', data);

          // Check if user is authenticated before routing
          const currentUser = authService.getCurrentUserSync();
          if (!currentUser) {
            console.warn('⚠️ [Foreground] User not authenticated, ignoring incoming call notification');
            return;
          }

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
        if (isChatMessage) {
          const appointmentId = (data.appointment_id || data.appointmentId || data.session_id || data.sessionId) as any;
          DeviceEventEmitter.emit('chat:refresh', {
            appointmentId: appointmentId ? String(appointmentId) : undefined,
            source: 'push_foreground',
            data,
          });
        }

        const channelId = isChatMessage ? 'messages' :
          type.startsWith('appointment_') ? 'appointments' :
            type.startsWith('text_session_') ? 'sessions' :
              type.startsWith('wallet_') || type.startsWith('subscription_') ? 'urgent_medical' :
                type.startsWith('call_') ? 'urgent_medical' :
                  type.includes('appointment') ? 'appointments' :
                    type.includes('session') ? 'sessions' :
                      'urgent_medical';

        // Ensure channel exists before displaying notification
        await notifee.createChannel({
          id: channelId,
          name: channelId === 'messages' ? 'Messages' :
            channelId === 'appointments' ? 'Appointments' :
              channelId === 'sessions' ? 'Sessions' : 'Default',
          importance: NotifeeAndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [250, 250, 250, 250],
        });

        // For message notifications, try to fetch the actual message content
        let messageContent = notification.body || 'You have a new notification';
        let expandedText = messageContent;

        if (isChatMessage && data.appointment_id) {
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
        } else if (isChatMessage) {
          expandedText = `Message from ${data.sender_name || 'Doctor'}: ${messageContent}`;
        } else if (type.startsWith('appointment_') || type.includes('appointment')) {
          expandedText = `Appointment Update: ${messageContent}`;
        } else if (type.startsWith('text_session_') || type.includes('session')) {
          expandedText = `Session Update: ${messageContent}`;
        } else if (type.startsWith('wallet_')) {
          expandedText = `Wallet Update: ${messageContent}`;
        } else if (type.startsWith('subscription_')) {
          expandedText = `Subscription Update: ${messageContent}`;
        } else if (type.startsWith('call_')) {
          expandedText = `Call Update: ${messageContent}`;
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
            color: isChatMessage ? '#2196F3' :
              (type.startsWith('appointment_') || type.includes('appointment')) ? '#FF9800' :
                (type.startsWith('text_session_') || type.includes('session')) ? '#9C27B0' :
                  (type.startsWith('wallet_') || type.startsWith('subscription_')) ? '#4CAF50' :
                    type.startsWith('call_') ? '#14B8A6' :
                      '#4CAF50',
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
      } catch { }
    }).catch(() => { });

    return () => {
      isMounted = false;
      try {
        onMessageUnsub?.();
        onOpenedUnsub?.();
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error:', cleanupError);
      }

      stopPolling();
      try {
        appStateSub?.remove?.();
      } catch { }
    };
  }, []);


  if (updateRequired) {
    return <ForceUpdateScreen title={updateData.title} message={updateData.message} storeUrl={updateData.storeUrl} />;
  }

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
                  <Stack.Screen name="blog-article-7" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-8" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-9" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-10" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-11" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-12" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-13" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-14" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-15" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-16" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-17" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-18" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-19" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-20" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-21" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-22" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-23" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-24" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-25" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-26" options={{ headerShown: false }} />
                  <Stack.Screen name="blog-article-web" options={{ headerShown: false }} />
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