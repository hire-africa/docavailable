import { apiService } from './apiService';
import { RealTimeEventService } from './realTimeEventService';
import { SessionNotificationService } from './sessionNotificationService';

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
        
        // Send session started notifications
        try {
          // Get doctor info for notification (you may need to fetch this)
          const doctorName = session.doctor_name || 'Doctor';
          
          // Notify patient
          await SessionNotificationService.sendSessionStartedNotification(
            {
              sessionId: session.id,
              sessionType: 'text',
              doctorName: doctorName,
              reason: reason
            },
            'patient',
            session.patient_id
          );
          
          // Notify doctor
          await SessionNotificationService.sendSessionStartedNotification(
            {
              sessionId: session.id,
              sessionType: 'text',
              patientName: session.patient_name || 'Patient',
              reason: reason
            },
            'doctor',
            session.doctor_id
          );
        } catch (notificationError) {
          console.warn('⚠️ Failed to send session started notifications:', notificationError);
        }
        
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
        
        // Send session ended notifications
        try {
          const sessionData = response.data || {};
          const doctorName = sessionData.doctor_name || 'Doctor';
          const patientName = sessionData.patient_name || 'Patient';
          const duration = sessionData.duration || undefined;
          
          // Notify patient
          await SessionNotificationService.sendSessionEndedNotification(
            {
              sessionId: sessionId,
              sessionType: 'text',
              doctorName: doctorName
            },
            'patient',
            sessionData.patient_id,
            duration
          );
          
          // Notify doctor
          await SessionNotificationService.sendSessionEndedNotification(
            {
              sessionId: sessionId,
              sessionType: 'text',
              patientName: patientName
            },
            'doctor',
            sessionData.doctor_id,
            duration
          );
        } catch (notificationError) {
          console.warn('⚠️ Failed to send session ended notifications:', notificationError);
        }
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
        
        // Send appointment session started notifications
        try {
          const doctorName = session.doctor_name || 'Doctor';
          
          // Notify patient
          await SessionNotificationService.sendSessionStartedNotification(
            {
              sessionId: session.id,
              sessionType: 'text',
              doctorName: doctorName,
              appointmentId: appointmentId
            },
            'patient',
            session.patient_id
          );
          
          // Notify doctor
          await SessionNotificationService.sendSessionStartedNotification(
            {
              sessionId: session.id,
              sessionType: 'text',
              patientName: session.patient_name || 'Patient',
              appointmentId: appointmentId
            },
            'doctor',
            session.doctor_id
          );
        } catch (notificationError) {
          console.warn('⚠️ Failed to send appointment session started notifications:', notificationError);
        }
        
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
        
        // Send appointment session ended notifications
        try {
          const sessionData = response.data || {};
          const doctorName = sessionData.doctor_name || 'Doctor';
          const patientName = sessionData.patient_name || 'Patient';
          const duration = sessionData.duration || undefined;
          const appointmentId = sessionData.appointment_id;
          
          // Notify patient
          await SessionNotificationService.sendSessionEndedNotification(
            {
              sessionId: sessionId,
              sessionType: 'text',
              doctorName: doctorName,
              appointmentId: appointmentId
            },
            'patient',
            sessionData.patient_id,
            duration
          );
          
          // Notify doctor
          await SessionNotificationService.sendSessionEndedNotification(
            {
              sessionId: sessionId,
              sessionType: 'text',
              patientName: patientName,
              appointmentId: appointmentId
            },
            'doctor',
            sessionData.doctor_id,
            duration
          );
        } catch (notificationError) {
          console.warn('⚠️ Failed to send appointment session ended notifications:', notificationError);
        }
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