import authService from '../services/authService';

export type IncomingCallData = {
  type?: string;
  appointment_id?: string;
  appointmentId?: string;
  call_type?: 'audio' | 'video' | string;
  callType?: 'audio' | 'video' | string;
  doctor_name?: string;
  doctorName?: string;
  doctor_profile_picture?: string;
  doctorProfilePicture?: string;
  caller_name?: string;
  callerName?: string;
  answeredFromNative?: boolean;
  answeredFromCallKeep?: boolean;
};

// Track processed calls to prevent duplicate navigation
const processedCalls = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedCalls.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      processedCalls.delete(key);
    }
  }
}, 10000);

export function routeIncomingCall(router: any, data: IncomingCallData) {
  try {
    console.log('📞 [CallRouter] routeIncomingCall called with:', { data, router: !!router });

    // Check if user is authenticated before routing
    const currentUser = authService.getCurrentUserSync();
    if (!currentUser) {
      console.warn('⚠️ [CallRouter] User not authenticated, ignoring incoming call');
      return;
    }

    if (!data || (data.type !== 'incoming_call' && (data as any).event !== 'incoming_call')) {
      console.log('📞 [CallRouter] Invalid data or type, returning');
      return;
    }

    const appointmentId = data.appointment_id || (data as any).appointmentId;
    const rawType = (data.call_type || (data as any).callType || 'audio') as string;
    const callType = rawType.toLowerCase() === 'video' ? 'video' : 'audio';

    console.log('📞 [CallRouter] Parsed data:', { appointmentId, callType });

    if (!appointmentId) {
      console.warn('[CallRouter] Missing appointment_id in incoming_call payload');
      return;
    }

    // CRITICAL: Block incoming calls when another call is already active or connecting
    const g: any = global as any;
    if (g.activeAudioCall || g.activeVideoCall || g.currentCallType) {
      console.warn(`🚫 [CallRouter] Incoming call BLOCKED — another call is active`, {
        appointmentId,
        callType,
        activeAudioCall: !!g.activeAudioCall,
        activeVideoCall: !!g.activeVideoCall,
        currentCallType: g.currentCallType,
      });
      return;
    }

    // CRITICAL: Prevent duplicate navigation for the same call
    const callKey = `${appointmentId}-${callType}`;
    const now = Date.now();
    const lastProcessed = processedCalls.get(callKey);

    if (lastProcessed && (now - lastProcessed) < DEDUP_WINDOW_MS) {
      console.log(`⚠️ [CallRouter] Duplicate call detected, ignoring: ${callKey} (last processed ${now - lastProcessed}ms ago)`);
      return;
    }

    // Mark this call as processed
    processedCalls.set(callKey, now);
    console.log(`✅ [CallRouter] Processing new call: ${callKey}`);

    const doctorName = (data as any).doctor_name || (data as any).doctorName || (data as any).caller_name || (data as any).callerName || '';
    const doctorAvatar = (data as any).doctor_profile_picture || (data as any).doctorProfilePicture || '';

    const routeParams = {
      sessionId: String(appointmentId),
      callType,
      isIncomingCall: 'true',
      doctorName,
      doctorProfilePicture: doctorAvatar,
      source: 'native_service',
      answeredFromCallKeep: (data.answeredFromNative === true || (data as any).answeredFromCallKeep === true) ? 'true' : 'false'
    };

    console.log('📞 [CallRouter] Navigating to call screen with params:', routeParams);

    router.push({
      pathname: '/call',
      params: routeParams
    });

    console.log('📞 [CallRouter] Navigation completed for call:', callKey);
  } catch (e) {
    console.error('[CallRouter] Failed to route incoming call:', e);
  }
}