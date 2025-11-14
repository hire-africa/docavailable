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
import { SessionNotificationHandler } from '../services/sessionNotificationHandler';
import { routeIncomingCall } from '../utils/callRouter';
import { routePushEvent } from '../utils/notificationRouter';

// Import crypto polyfill early to ensure it's loaded before any encryption services
import appInitializer from '../services/appInitializer';
import '../services/cryptoPolyfill';
import fullScreenPermissionService from '../services/fullScreenPermissionService';
import comprehensivePermissionManager from '../services/comprehensivePermissionManager';
import safePermissionManager from '../services/safePermissionManager';
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

            // Create notification channels with error handling
            const channels = [
              {
                id: 'calls',
                name: 'Incoming Calls',
                importance: NotifeeAndroidImportance.HIGH,
                sound: 'default',
                vibration: true,
                vibrationPattern: [250, 250, 250, 250],
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
            ];

            // Create channels one by one with error handling
            for (const channel of channels) {
              try {
                await notifee.createChannel(channel);
              } catch (channelError) {
                console.warn(`⚠️ Failed to create channel ${channel.id}:`, channelError);
              }
            }
            
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
          pushNotificationService.registerForPushNotifications().catch((fcmError) => {
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
                         type.includes('appointment') ? 'appointments' :
                         type.includes('session') ? 'sessions' : 'default';

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
        } else if (type.includes('session')) {
          expandedText = `Session Update: ${messageContent}`;
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
                   type.includes('appointment') ? '#FF9800' :
                   type.includes('session') ? '#9C27B0' : '#4CAF50',
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
      isMounted = false;
      try {
        onMessageUnsub?.();
        onOpenedUnsub?.();
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error:', cleanupError);
      }
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