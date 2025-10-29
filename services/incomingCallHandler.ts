import { AppState, DeviceEventEmitter } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { router } from 'expo-router';

interface IncomingCallData {
  appointment_id: string;
  call_type: 'video' | 'voice';
  doctor_name: string;
  doctor_id: string;
  doctor_profile_picture?: string;
}

class IncomingCallHandler {
  private static instance: IncomingCallHandler;
  private currentCallData: IncomingCallData | null = null;
  private appStateSubscription: any = null;

  private constructor() {
    this.setupNotificationHandler();
    this.setupAppStateHandler();
  }

  public static getInstance(): IncomingCallHandler {
    if (!IncomingCallHandler.instance) {
      IncomingCallHandler.instance = new IncomingCallHandler();
    }
    return IncomingCallHandler.instance;
  }

  private setupNotificationHandler() {
    // Handle notification events when app is in foreground
    notifee.onForegroundEvent(({ type, detail }) => {
      console.log('🔔 [IncomingCall] Foreground event:', type);
      
      if (type === EventType.PRESS && detail.notification?.data?.type === 'incoming_call') {
        console.log('🔔 [IncomingCall] Call notification pressed');
        this.handleIncomingCall(detail.notification.data as any);
      }
    });

    // Listen for incoming call events from background handler
    DeviceEventEmitter.addListener('INCOMING_CALL', (data: IncomingCallData) => {
      console.log('📞 [IncomingCall] Received incoming call event:', data);
      this.handleIncomingCall(data);
    });
  }

  private setupAppStateHandler() {
    // When app comes to foreground, check if there's a pending call
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 [IncomingCall] App state changed to:', nextAppState);
      
      if (nextAppState === 'active' && this.currentCallData) {
        console.log('📞 [IncomingCall] App activated with pending call, showing call screen');
        this.showCallScreen(this.currentCallData);
        this.currentCallData = null; // Clear after showing
      }
    });
  }

  public handleIncomingCall(data: IncomingCallData) {
    console.log('📞 [IncomingCall] Handling incoming call:', data);
    
    this.currentCallData = data;
    
    // If app is already active, show call screen immediately
    if (AppState.currentState === 'active') {
      console.log('📞 [IncomingCall] App is active, showing call screen immediately');
      this.showCallScreen(data);
      this.currentCallData = null;
    } else {
      console.log('📞 [IncomingCall] App is background, call data stored for when app activates');
      // Data is stored, will be handled when app comes to foreground
    }
  }

  private showCallScreen(data: IncomingCallData) {
    try {
      console.log('📞 [IncomingCall] Navigating to call screen with data:', data);
      
      // Navigate to the call screen with the call data
      router.push({
        pathname: '/video-call',
        params: {
          appointmentId: data.appointment_id,
          callType: data.call_type,
          doctorName: data.doctor_name,
          doctorId: data.doctor_id,
          doctorProfilePicture: data.doctor_profile_picture || '',
          isIncoming: 'true'
        }
      });
      
      console.log('✅ [IncomingCall] Successfully navigated to call screen');
    } catch (error) {
      console.error('❌ [IncomingCall] Failed to navigate to call screen:', error);
    }
  }

  public clearCurrentCall() {
    this.currentCallData = null;
    console.log('🧹 [IncomingCall] Cleared current call data');
  }

  public destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    DeviceEventEmitter.removeAllListeners('INCOMING_CALL');
  }
}

export default IncomingCallHandler;
