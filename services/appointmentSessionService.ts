/**
 * Appointment Session Service
 * 
 * Architecture: Session-gated appointment logic
 * - Appointments are read-only scheduling data
 * - Only sessions (text_session/call_session) can drive live features
 * - Frontend never starts/activates appointment sessions
 */

import { apiService } from './apiService';

export interface AppointmentSessionStatus {
  appointment_id: number;
  session_id: number | null;
  status: string;
  session_status?: string | null;
  doctor_response_deadline?: string | null;
  appointment_type?: string;
}

/**
 * Resolve appointment session status
 * Lightweight endpoint to check if appointment has a session
 * 
 * @param appointmentId
 * @returns Session status or null if appointment not found
 */
export async function resolveAppointmentSession(appointmentId: string | number): Promise<AppointmentSessionStatus | null> {
  try {
    const response = await apiService.get(`/appointments/${appointmentId}/session`);
    
    if (response.success && response.data) {
      return {
        appointment_id: Number(appointmentId),
        session_id: response.data.session_id || null,
        status: response.data.status || 'unknown',
        session_status: response.data.session_status ?? null,
        doctor_response_deadline: response.data.doctor_response_deadline ?? null,
        appointment_type: response.data.appointment_type,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ [AppointmentSessionService] Error resolving appointment session:', error);
    return null;
  }
}

/**
 * Get session context from appointment
 * Returns the session identifier if appointment has an active session
 * 
 * @param appointmentId
 * @returns Session context string (e.g., "text_session:123") or null
 */
export async function getSessionContextFromAppointment(appointmentId: string | number): Promise<string | null> {
  const status = await resolveAppointmentSession(appointmentId);
  
  if (!status || !status.session_id) {
    return null;
  }
  
  // Determine session type from appointment type
  const sessionType = status.appointment_type === 'text' ? 'text_session' : 'call_session';
  
  return `${sessionType}:${status.session_id}`;
}

/**
 * Check if appointment is in waiting state (no session yet)
 * 
 * @param appointmentId
 * @returns true if appointment exists but has no session
 */
export async function isAppointmentWaiting(appointmentId: string | number): Promise<boolean> {
  const status = await resolveAppointmentSession(appointmentId);
  return status !== null && status.session_id === null;
}

/**
 * Check if appointment has an active session
 * 
 * @param appointmentId
 * @returns true if appointment has a session_id
 */
export async function hasAppointmentSession(appointmentId: string | number): Promise<boolean> {
  const status = await resolveAppointmentSession(appointmentId);
  return status !== null && status.session_id !== null;
}
