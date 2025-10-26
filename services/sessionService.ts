import { apiService } from './apiService';
import { RealTimeEventService } from './realTimeEventService';

export interface SessionData {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  status: string;
  started_at: string;
  ended_at?: string;
  sessions_used: number;
  sessions_remaining_before_start: number;
  reason?: string;
  type?: string;
}

export const sessionService = {
  /**
   * Start a text session
   */
  startTextSession: async (doctorId: string, reason?: string): Promise<SessionData> => {
    try {
      const response = await apiService.post('/text-sessions/start', {
        doctor_id: doctorId,
        reason: reason
      });

      if (response.success && response.data) {
        const session = response.data;
        
        // Trigger real-time event for session start
        await RealTimeEventService.handleSessionEvent(
          'started',
          session,
          'patient'
        );
        
        return session;
      }
      throw new Error(response.message || 'Failed to start session');
    } catch (error) {
      console.error('Error starting text session:', error);
      throw error;
    }
  },

  /**
   * End a text session
   */
  endTextSession: async (sessionId: string): Promise<void> => {
    try {
      const response = await apiService.post(`/text-sessions/${sessionId}/end`);
      
      if (response.success) {
        // Trigger real-time event for session end
        await RealTimeEventService.handleSessionEvent(
          'ended',
          { id: sessionId, ...response.data },
          'patient'
        );
      } else {
        throw new Error(response.message || 'Failed to end session');
      }
    } catch (error) {
      console.error('Error ending text session:', error);
      throw error;
    }
  },

  /**
   * Start text appointment session
   */
  startTextAppointmentSession: async (appointmentId: string): Promise<SessionData> => {
    try {
      const response = await apiService.post('/text-appointments/start-session', {
        appointment_id: appointmentId
      });

      if (response.success && response.data) {
        const session = response.data;
        
        // Trigger real-time event for appointment session start
        await RealTimeEventService.handleSessionEvent(
          'started',
          { ...session, appointment_id: appointmentId, type: 'appointment' },
          'patient'
        );
        
        return session;
      }
      throw new Error(response.message || 'Failed to start appointment session');
    } catch (error) {
      console.error('Error starting text appointment session:', error);
      throw error;
    }
  },

  /**
   * End text appointment session
   */
  endTextAppointmentSession: async (sessionId: string): Promise<void> => {
    try {
      const response = await apiService.post(`/text-appointments/${sessionId}/end-session`);
      
      if (response.success) {
        // Trigger real-time event for appointment session end
        await RealTimeEventService.handleSessionEvent(
          'ended',
          { id: sessionId, ...response.data, type: 'appointment' },
          'patient'
        );
      } else {
        throw new Error(response.message || 'Failed to end appointment session');
      }
    } catch (error) {
      console.error('Error ending text appointment session:', error);
      throw error;
    }
  },

  /**
   * Get active sessions
   */
  getActiveSessions: async (): Promise<SessionData[]> => {
    try {
      const response = await apiService.get('/text-sessions/active');
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  },

  /**
   * Get session history
   */
  getSessionHistory: async (): Promise<SessionData[]> => {
    try {
      const response = await apiService.get('/text-sessions/history');
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }
};