import { getAppointmentId, getCallType, getRole, PushPayload } from './pushTypes';
import { routeIncomingCall } from './callRouter';

export type RouteSource = 'foreground' | 'opened' | 'initial';

// Centralized navigation for push events.
// In foreground we keep behavior conservative: only auto-route for incoming_call.
// For opened/initial (user tapped OS notification), route to the most relevant screen.
export function routePushEvent(router: any, data: PushPayload, source: RouteSource) {
  if (!data || typeof data !== 'object') return;
  const type = (data.type || data.event || '').toString();
  if (!type) return;

  // Normalize common ids
  const appointmentId = getAppointmentId(data);

  // Incoming call routing (foreground + background)
  if (type === 'incoming_call' || type === 'voice_call_incoming' || type === 'video_call_incoming') {
    // Delegate to existing call router
    const mapped = { ...data, call_type: getCallType(data) } as any;
    routeIncomingCall(router, mapped);
    return;
  }

  // Foreground: avoid surprise navigations except for calls
  if (source === 'foreground') {
    return;
  }

  // From here: user tapped a notification (opened/cold start)
  switch (type) {
    // Chat
    case 'chat_message': {
      if (appointmentId) {
        router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId } });
      }
      return;
    }
    case 'call_missed':
    case 'call_ended': {
      if (appointmentId) {
        // Prefer ended-session page if available; otherwise fall back to chat
        router.push({ pathname: '/ended-session/[appointmentId]', params: { appointmentId } });
      }
      return;
    }

    // Appointment events (both patient and doctor contexts)
    case 'appointment_booked':
    case 'appointment_confirmed':
    case 'appointment_cancelled':
    case 'appointment_rescheduled':
    case 'appointment_reminder':
    case 'appointment_starting_soon':
    case 'new_appointment_request':
    case 'appointment_cancelled_by_patient':
    case 'appointment_reschedule_request': {
      if (appointmentId) {
        router.push({ pathname: '/appointment-details/[id]', params: { id: appointmentId } });
      } else {
        // Fallback
        const role = getRole(data);
        router.push({ pathname: role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard' });
      }
      return;
    }

    // Instant session events
    case 'doctor_available':
    case 'session_started':
    case 'session_ending_soon':
    case 'session_expired':
    case 'new_instant_session_request':
    case 'patient_joined_session': {
      // If appointment/session id is provided, route to chat
      if (appointmentId) {
        router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId } });
      } else {
        const role = getRole(data);
        router.push({ pathname: role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard' });
      }
      return;
    }

    // Payments & subscription
    case 'payment_successful':
    case 'payment_failed':
    case 'subscription_expiring':
    case 'subscription_expired':
    case 'session_deducted':
    case 'payment_received':
    case 'withdrawal_requested':
    case 'withdrawal_processed': {
      // For now, route to dashboards; you can refine to a billing screen if/when added
      const role = getRole(data);
      router.push({ pathname: role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard' });
      return;
    }

    // Account & security
    case 'account_approved':
    case 'profile_verification_complete':
    case 'password_changed':
    case 'login_from_new_device':
    case 'account_suspended': {
      const role = getRole(data);
      router.push({ pathname: role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard' });
      return;
    }

    default: {
      // No-op for unknown events; could route to a generic notifications screen in the future
      return;
    }
  }
}