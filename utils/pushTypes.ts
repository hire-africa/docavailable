export type UserRole = 'patient' | 'doctor' | 'admin' | 'unknown';

// Canonical event types used in FCM data.type
export type PushEventType =
  // Appointment Management
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'appointment_starting_soon'
  | 'new_appointment_request'
  | 'appointment_cancelled_by_patient'
  | 'appointment_reschedule_request'
  // Real-time Communication
  | 'chat_message'
  | 'incoming_call'
  | 'voice_call_incoming'
  | 'video_call_incoming'
  | 'call_missed'
  | 'call_ended'
  // Instant Session
  | 'doctor_available'
  | 'session_started'
  | 'session_ending_soon'
  | 'session_expired'
  | 'new_instant_session_request'
  | 'patient_joined_session'
  // Payment & Subscription
  | 'payment_successful'
  | 'payment_failed'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'session_deducted'
  | 'payment_received'
  | 'withdrawal_requested'
  | 'withdrawal_processed'
  // Account & Security
  | 'account_approved'
  | 'profile_verification_complete'
  | 'password_changed'
  | 'login_from_new_device'
  | 'account_suspended';

export type PushPayload = {
  // canonical fields
  type?: PushEventType | string;
  role?: UserRole;
  user_role?: UserRole; // backend may send this key
  // Common identifiers
  appointment_id?: string | number;
  appointmentId?: string | number;
  session_id?: string | number;
  sessionId?: string | number;
  // Call-specific
  call_type?: 'audio' | 'video' | string;
  callType?: 'audio' | 'video' | string;
  // Names / context
  doctor_name?: string;
  patient_name?: string;
  sender_name?: string;
  name?: string;
  // Optional deep link hints
  screen?: string;
  // Anything else from backend should pass through
  [key: string]: any;
};

export function getRole(data: PushPayload): UserRole {
  const r = (data.role || data.user_role || 'unknown') as UserRole;
  if (r === 'patient' || r === 'doctor' || r === 'admin') return r;
  return 'unknown';
}

export function getAppointmentId(data: PushPayload): string | null {
  const id = data.appointment_id ?? data.appointmentId ?? data.session_id ?? data.sessionId;
  return id != null ? String(id) : null;
}

export function getCallType(data: PushPayload): 'audio' | 'video' {
  const raw = (data.call_type || data.callType || '').toString().toLowerCase();
  return raw === 'video' ? 'video' : 'audio';
}