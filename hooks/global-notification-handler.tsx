import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CallNotificationService from '../services/callNotificationService';

export function useGlobalNotificationHandler() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Handle deep links when app is already running
    const handleDeepLink = (url: string) => {
      console.log('🔗 [GlobalNotificationHandler] Deep link received:', url);
      
      try {
        // Parse the URL to extract parameters
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const params = new URLSearchParams(urlObj.search);
        
        console.log('🔗 [GlobalNotificationHandler] Parsed URL:', { path, params: Object.fromEntries(params) });
        
        // Handle incoming direct call deep links
        if (path.includes('incoming-direct-call')) {
          const appointmentId = params.get('appointmentId');
          const callerId = params.get('callerId');
          const callerName = params.get('callerName');
          const callType = params.get('callType') || 'audio';
          const reason = params.get('reason') || '';
          
          console.log('📞 [GlobalNotificationHandler] Processing incoming call notification:', {
            appointmentId,
            callerId,
            callerName,
            callType,
            reason,
            currentUser: user?.user_type
          });
          
          // Only process if user is authenticated and is a doctor
          if (user && user.user_type === 'doctor') {
            // Navigate to incoming call screen with parameters
            router.push({
              pathname: '/incoming-direct-call',
              params: {
                appointmentId,
                callerId,
                callerName,
                callType,
                reason
              }
            });
          } else {
            console.log('⚠️ [GlobalNotificationHandler] User not authenticated or not a doctor, ignoring call notification');
          }
        }
      } catch (error) {
        console.error('❌ [GlobalNotificationHandler] Error processing deep link:', error);
      }
    };

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 [GlobalNotificationHandler] App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // Check if there's a pending deep link when app becomes active
        Linking.getInitialURL().then((url) => {
          if (url) {
            console.log('🔗 [GlobalNotificationHandler] Initial URL found:', url);
            handleDeepLink(url);
          }
        });
      }
    };

    // Set up deep link listener
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Set up app state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up notification response listener (when notification is tapped or action button pressed)
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('🔔 [GlobalNotificationHandler] Notification response:', response);
      
      const data = response.notification.request.content.data;
      const actionIdentifier = response.actionIdentifier;
      
      if (data && (data.type === 'incoming_call' || data.type === 'direct_call')) {
        console.log('📞 [GlobalNotificationHandler] Processing call notification:', { data, actionIdentifier });
        
        // Handle call action buttons
        if (actionIdentifier === 'ANSWER_CALL') {
          console.log('📞 [GlobalNotificationHandler] Answer call button pressed');
          try {
            // Handle call answer through service
            await CallNotificationService.handleCallAnswer({
              appointmentId: String(data.appointment_id || data.session_id || ''),
              callerId: String(data.doctor_id || data.caller_id || ''),
              sessionId: String(data.session_id || ''),
            });
            
            // Navigate to call screen to answer
            router.push({
              pathname: '/call',
              params: {
                sessionId: String(data.appointment_id || data.session_id || ''),
                doctorId: String(data.doctor_id || data.caller_id || ''),
                doctorName: String(data.doctor_name || data.caller_name || ''),
                callType: String(data.call_type || 'audio'),
                isIncomingCall: 'true',
                action: 'answer'
              }
            });
          } catch (error) {
            console.error('Failed to handle call answer:', error);
          }
        } else if (actionIdentifier === 'DECLINE_CALL') {
          console.log('📞 [GlobalNotificationHandler] Decline call button pressed');
          try {
            // Handle call decline through service
            await CallNotificationService.handleCallDecline({
              appointmentId: String(data.appointment_id || data.session_id || ''),
              callerId: String(data.doctor_id || data.caller_id || ''),
              sessionId: String(data.session_id || ''),
            });
          } catch (error) {
            console.error('Failed to handle call decline:', error);
          }
        } else {
          // Regular tap on notification - navigate to call screen
          console.log('📞 [GlobalNotificationHandler] Call notification tapped');
          router.push({
            pathname: '/call',
            params: {
              sessionId: String(data.appointment_id || data.session_id || ''),
              doctorId: String(data.doctor_id || data.caller_id || ''),
              doctorName: String(data.doctor_name || data.caller_name || ''),
              callType: String(data.call_type || 'audio'),
              isIncomingCall: 'true'
            }
          });
        }
      }
    });

    // Check for initial URL (when app is opened from notification)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 [GlobalNotificationHandler] Initial URL on app start:', url);
        handleDeepLink(url);
      }
    });

    return () => {
      linkingSubscription?.remove();
      appStateSubscription?.remove();
      notificationResponseSubscription?.remove();
    };
  }, [user, router]);
}

// Export the hook as named export only
// This file should not be treated as a route component