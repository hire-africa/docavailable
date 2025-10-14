// Text Session Service for handling appointment-to-session conversion
import { apiService } from './apiService';

export interface TextSession {
  id: number;
  doctor_id: number;
  patient_id: number;
  appointment_id?: number;
  started_at: string;
  status: string;
  remaining_time_minutes?: number;
  last_activity_at?: string;
  doctor?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_picture_url?: string;
  };
  patient?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_picture_url?: string;
  };
}

export interface Appointment {
  id: string | number;
  doctor_id: number;
  patient_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string | number;
  appointment_type: string;
  reason?: string;
  doctorName?: string;
  patientName?: string;
}

export const textSessionService = {
  // Create a text session from a text appointment
  createTextSessionFromAppointment: async (appointment: Appointment): Promise<TextSession | null> => {
    try {
      console.log('🔄 [TextSessionService] Creating text session from appointment:', appointment.id);
      
      const response = await apiService.post('/text-sessions/create-from-appointment', {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason
      });

      if (response.success && response.data) {
        console.log('✅ [TextSessionService] Text session created successfully:', response.data);
        return response.data;
      } else {
        console.error('❌ [TextSessionService] Failed to create text session:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ [TextSessionService] Error creating text session:', error);
      return null;
    }
  },

  // Check if appointment should be converted to text session
  shouldConvertToTextSession: (appointment: Appointment): boolean => {
    // Only convert text appointments that are confirmed and ready
    const isTextAppointment = appointment.appointment_type === 'text';
    const isConfirmed = appointment.status === 'confirmed' || appointment.status === 1;
    
    if (!isTextAppointment || !isConfirmed) {
      return false;
    }

    // Check if appointment time has been reached
    try {
      const dateStr = appointment.appointment_date;
      const timeStr = appointment.appointment_time;
      
      if (!dateStr || !timeStr) return false;

      let appointmentDateTime;
      if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY
        const [month, day, year] = dateStr.split('/').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        appointmentDateTime = new Date(year, month - 1, day, hour, minute);
      } else {
        // Format: YYYY-MM-DD
        appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
      }
      
      const now = new Date();
      return appointmentDateTime.getTime() <= now.getTime();
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
  },

  // Get active text sessions
  getActiveTextSessions: async (): Promise<TextSession[]> => {
    try {
      const response = await apiService.get('/text-sessions/active-sessions');
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching active text sessions:', error);
      return [];
    }
  },

  // Check if text session already exists for appointment
  hasTextSessionForAppointment: async (appointmentId: string | number): Promise<boolean> => {
    try {
      const activeSessions = await textSessionService.getActiveTextSessions();
      return activeSessions.some(session => 
        session.appointment_id === appointmentId || 
        session.appointment_id === Number(appointmentId)
      );
    } catch (error) {
      console.error('Error checking text session for appointment:', error);
      return false;
    }
  }
};
