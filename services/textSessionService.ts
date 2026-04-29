// Text Session Service for handling appointment-to-session conversion
import { SessionContext, contextToString } from '../types/sessionContext';
import { getTimezoneInfo, isAppointmentTimeReached } from '../utils/timezoneUtils';
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
  /**
   * Unified endpoint: Start session from appointment
   * Architecture: POST /appointments/{id}/start-session
   * Returns context_type and context_id (session identifier)
   */
  startSessionFromAppointment: async (appointmentId: string | number, modality?: 'text' | 'audio' | 'video'): Promise<SessionContext | null> => {
    try {
      // Debug logging disabled to prevent console spam (uncomment if needed for debugging)
      // console.log('🔄 [TextSessionService] Starting session from appointment:', appointmentId, 'modality:', modality);

      // Get user's timezone for backend processing
      const timezoneInfo = getTimezoneInfo();

      const response = await apiService.post(`/appointments/${appointmentId}/start-session`, {
        modality: modality || 'text' // Default to text if not specified
      }, {
        headers: {
          'X-User-Timezone': timezoneInfo.userTimezone
        }
      }) as any; // Use any to handle different response structures

      // Handle different response structures
      // New format: { success: true, context_type, context_id }
      // Legacy format: { success: true, data: { session_id, appointment_id, ... } }
      if (response.success) {
        if (response.context_type && response.context_id) {
          // New format
          const context: SessionContext = {
            context_type: response.context_type,
            context_id: response.context_id
          };
          console.log('✅ [TextSessionService] Session started successfully:', contextToString(context));
          return context;
        } else if (response.data) {
          // Legacy format - extract from data
          const data = response.data;
          if (data.session_id) {
            const context: SessionContext = {
              context_type: 'text_session',
              context_id: Number(data.session_id)
            };
            console.log('✅ [TextSessionService] Session started successfully (legacy format):', contextToString(context));
            return context;
          }
        }
      }

      // Only log error if actually failed
      if (!response.success) {
        console.error('❌ [TextSessionService] Failed to start session:', response);
      } else {
        console.warn('⚠️ [TextSessionService] Unexpected response format:', response);
      }
      return null;
    } catch (error) {
      console.error('❌ [TextSessionService] Error starting session from appointment:', error);
      return null;
    }
  },

  // Create a text session from a text appointment (legacy - use startSessionFromAppointment instead)
  createTextSessionFromAppointment: async (appointment: Appointment): Promise<TextSession | null> => {
    try {
      // Debug logging disabled to prevent console spam (uncomment if needed for debugging)
      // console.log('🔄 [TextSessionService] Creating text session from appointment (legacy):', appointment.id);

      // Try the new unified endpoint first
      const context = await textSessionService.startSessionFromAppointment(appointment.id, 'text');
      if (context && context.context_type === 'text_session') {
        // Fetch the full session details
        const sessionResponse = await apiService.get(`/text-sessions/${context.context_id}`);
        if (sessionResponse.success && sessionResponse.data) {
          return sessionResponse.data;
        }
      }

      // Fallback to legacy endpoint if new one fails
      const timezoneInfo = getTimezoneInfo();
      const response = await apiService.post('/text-sessions/create-from-appointment', {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason
      }, {
        headers: {
          'X-User-Timezone': timezoneInfo.userTimezone
        }
      });

      if (response.success && response.data) {
        console.log('✅ [TextSessionService] Text session created successfully (legacy):', response.data);
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

    // Check if appointment time has been reached using timezone utility
    try {
      const dateStr = appointment.appointment_date;
      const timeStr = appointment.appointment_time;

      if (!dateStr || !timeStr) return false;

      // Use timezone utility for consistent time handling
      const isTimeReached = isAppointmentTimeReached(dateStr, timeStr);

      // Debug logging for frontend time validation (disabled to prevent console spam)
      // Uncomment below if you need to debug time validation issues
      // const timezoneInfo = getTimezoneInfo();
      // console.log('🕐 [TextSessionService] Frontend time validation debug', {
      //   appointment_id: appointment.id,
      //   appointment_date: dateStr,
      //   appointment_time: timeStr,
      //   is_time_reached: isTimeReached,
      //   ...timezoneInfo
      // });

      return isTimeReached;
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
  },

  /**
   * Get history of ended text sessions
   */
  getHistory: async (page: number = 1, perPage: number = 15): Promise<{
    success: boolean;
    data: TextSession[];
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    }
  }> => {
    try {
      const response = await apiService.get('/text-sessions/history', { page, per_page: perPage });
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.data || response.data, // Handle both paginated and direct data
          pagination: response.data.current_page ? {
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total
          } : undefined
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error fetching text session history:', error);
      return { success: false, data: [] };
    }
  }
};


