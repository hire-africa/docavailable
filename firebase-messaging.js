import messaging from '@react-native-firebase/messaging';
import callkeepService from './services/callkeepService';
import { storeCallData } from './services/callkeepStorage';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const data = remoteMessage?.data || {};
    console.log('BG FCM handler received:', JSON.stringify(data));

    // Check if this is an incoming call
    if (data.type === 'incoming_call' || data.isIncomingCall === 'true') {
      const callId = callkeepService.generateCallId();
      const callerName = data.doctor_name || data.doctorName || data.caller || 'Unknown Caller';
      const appointmentId = data.appointment_id || data.appointmentId || '';
      const callType = data.call_type || data.callType || 'audio';

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
