import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { AuthProvider } from '../contexts/AuthContext';
import pushNotificationService from '../services/pushNotificationService';

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
    
    // Initialize global services
    appInitializer.initialize();

    // Register for FCM (permission + token) and send to backend
    pushNotificationService.registerForPushNotifications().catch(() => {});

    // Foreground handler for incoming call data
    const onMessageUnsub = messaging().onMessage(async (remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        if (data.type === 'incoming_call') {
          const appointmentId = data.appointment_id || data.appointmentId;
          const callType = (data.call_type || data.callType || 'audio').toLowerCase();
          if (appointmentId) {
            router.push({ pathname: '/call', params: { sessionId: String(appointmentId), callType, isIncomingCall: 'true' } });
          }
        }
      } catch (e) {
        console.error('Failed to handle foreground FCM:', e);
      }
    });

    // App opened from background by tapping notification
    const onOpenedUnsub = messaging().onNotificationOpenedApp((remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        if (data.type === 'incoming_call') {
          const appointmentId = data.appointment_id || data.appointmentId;
          const callType = (data.call_type || data.callType || 'audio').toLowerCase();
          if (appointmentId) {
            router.push({ pathname: '/call', params: { sessionId: String(appointmentId), callType, isIncomingCall: 'true' } });
          }
        }
      } catch (e) {
        console.error('Failed to handle opened-app FCM:', e);
      }
    });

    // Cold start (app was quit)
    messaging().getInitialNotification().then((remoteMessage) => {
      try {
        const data: any = remoteMessage?.data || {};
        if (data.type === 'incoming_call') {
          const appointmentId = data.appointment_id || data.appointmentId;
          const callType = (data.call_type || data.callType || 'audio').toLowerCase();
          if (appointmentId) {
            router.push({ pathname: '/call', params: { sessionId: String(appointmentId), callType, isIncomingCall: 'true' } });
          }
        }
      } catch {}
    }).catch(() => {});

    return () => {
      onMessageUnsub();
      onOpenedUnsub();
    };
  }, []);
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="signup" options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="doctor-signup" options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="patient-signup" options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="password-reset/[token]" options={{ headerShown: false, gestureEnabled: true }} />
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
  );
} 