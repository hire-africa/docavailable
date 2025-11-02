import messaging from '@react-native-firebase/messaging';
import callkeepService from './services/callkeepService';
import { storeCallData } from './services/callkeepStorage';

// ✅ Track displayed calls to prevent duplicates
const displayedCalls = new Set();

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const data = remoteMessage?.data || {};
    console.log('BG FCM handler received:', JSON.stringify(data));

    // Check if this is an incoming call
    if (data.type === 'incoming_call' || data.isIncomingCall === 'true') {
      const appointmentId = data.appointment_id || data.appointmentId || '';
      
      // ✅ Deduplicate: Skip if we've already displayed this call
      if (appointmentId && displayedCalls.has(appointmentId)) {
        console.log('FCM: Already displayed call for', appointmentId, '- ignoring duplicate FCM');
        return;
      }
      
      const callId = callkeepService.generateCallId();
      const callerName = data.doctor_name || data.doctorName || data.caller || 'Unknown Caller';
      const callType = data.call_type || data.callType || 'audio';

      // Mark this call as displayed
      if (appointmentId) {
        displayedCalls.add(appointmentId);
        console.log('FCM: Marked call as displayed:', appointmentId);
        
        // Auto-clear after 60 seconds to allow new calls
        setTimeout(() => {
          displayedCalls.delete(appointmentId);
          console.log('FCM: Cleared displayed call:', appointmentId);
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

      // Display native incoming call screen via CallKeep
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
