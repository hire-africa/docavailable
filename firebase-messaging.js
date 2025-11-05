import messaging from '@react-native-firebase/messaging';
import callkeepService from './services/callkeepService';
import { storeCallData } from './services/callkeepStorage';
import { NativeModules } from 'react-native';

// ✅ Track displayed calls to prevent duplicates
const displayedCalls = new Set();

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const data = remoteMessage?.data || {};
    console.log('BG FCM handler received:', JSON.stringify(data));

    // Check if this is an incoming call
    if (data.type === 'incoming_call' || data.isIncomingCall === 'true') {
      const appointmentId = data.appointment_id || data.appointmentId || '';
      const sessionId = data.session_id || data.sessionId || '';
      const callIdFromData = data.call_id || data.callId || '';
      const messageId = remoteMessage?.messageId || '';
      const dedupeKey = appointmentId || sessionId || callIdFromData || messageId;

      // ✅ Deduplicate: Skip if we've already displayed this call
      if (dedupeKey && displayedCalls.has(dedupeKey)) {
        console.log('FCM: Already displayed call for', dedupeKey, '- ignoring duplicate FCM');
        return;
      }
      
      const callId = callkeepService.generateCallId();
      const callerName = data.doctor_name || data.doctorName || data.caller || 'Unknown Caller';
      const callType = data.call_type || data.callType || 'audio';

      // Mark this call as displayed
      if (dedupeKey) {
        displayedCalls.add(dedupeKey);
        console.log('FCM: Marked call as displayed:', dedupeKey);
        
        // Auto-clear after 60 seconds to allow new calls
        setTimeout(() => {
          displayedCalls.delete(dedupeKey);
          console.log('FCM: Cleared displayed call:', dedupeKey);
        }, 60000);
      }

      // Store call data for retrieval when answered
      const callData = {
        callId,
        appointmentId,
        callType,
        callerName,
        ...data,
      };

      global.incomingCallData = callData;
      await storeCallData(callData);

      // Try native IncomingCallActivity first (better for lock screen)
      try {
        if (NativeModules.IncomingCallModule) {
          console.log('Using native IncomingCallActivity for lock screen');
          await NativeModules.IncomingCallModule.showIncomingCall({
            sessionId: appointmentId,
            doctorId: data.doctor_id || data.doctorId || '',
            callerName,
            callType,
          });
          
          console.log('Native incoming call displayed:', {
            sessionId: appointmentId,
            callerName,
            callType,
          });
          return; // Success - don't fall back to CallKeep
        }
      } catch (nativeError) {
        console.warn('Native call activity failed, falling back to CallKeep:', nativeError);
      }

      // Fallback to CallKeep if native fails
      await callkeepService.displayIncomingCall(
        callId,
        callerName,
        appointmentId,
        callType
      );

      console.log('CallKeep incoming call displayed:', {
        callId,
        callerName,
        appointmentId,
        callType,
      });
    }
  } catch (e) {
    console.log('Background FCM handler error:', e);
  }
});
