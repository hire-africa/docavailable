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
};

export function routeIncomingCall(router: any, data: IncomingCallData) {
  try {
    if (!data || (data.type !== 'incoming_call' && (data as any).event !== 'incoming_call')) return;

    const appointmentId = data.appointment_id || (data as any).appointmentId;
    const rawType = (data.call_type || (data as any).callType || 'audio') as string;
    const callType = rawType.toLowerCase() === 'video' ? 'video' : 'audio';

    if (!appointmentId) {
      console.warn('[CallRouter] Missing appointment_id in incoming_call payload');
      return;
    }

    router.push({
      pathname: '/call',
      params: {
        sessionId: String(appointmentId),
        callType,
        isIncomingCall: 'true',
        doctorName: (data as any).doctor_name || (data as any).doctorName || '',
        doctorProfilePicture: (data as any).doctor_profile_picture || (data as any).doctorProfilePicture || ''
      }
    });
  } catch (e) {
    console.error('[CallRouter] Failed to route incoming call:', e);
  }
}