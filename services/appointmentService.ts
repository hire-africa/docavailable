// Real appointment service
import { apiService } from './apiService';
import { RealTimeEventService } from './realTimeEventService';

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress'
};

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  status: string;
  type: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const appointmentService = {
  // Real API methods
  getAppointments: async (): Promise<Appointment[]> => {
    try {
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        // Handle paginated response - appointments are in response.data.data
        const appointments = (response.data as any).data || response.data;
        return Array.isArray(appointments) ? appointments : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  },
  
  createAppointment: async (appointmentData: any): Promise<Appointment> => {
    try {
      const response = await apiService.post('/appointments', appointmentData);
      if (response.success && response.data) {
        const appointment = response.data;
        
        // Trigger real-time event for appointment creation
        await RealTimeEventService.handleAppointmentEvent(
          'created',
          appointment,
          'patient'
        );
        
        return appointment;
      }
      throw new Error(response.message || 'Failed to create appointment');
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },
  
  updateAppointment: async (id: string, data: any): Promise<Appointment> => {
    try {
      const response = await apiService.put(`/appointments/${id}`, data);
      if (response.success && response.data) {
        const appointment = response.data;
        
        // Trigger real-time event for appointment status changes
        if (data.status) {
          const action = data.status === 'confirmed' ? 'confirmed' : 
                       data.status === 'cancelled' ? 'cancelled' : 
                       data.status === 'completed' ? 'completed' : 'created';
          
          await RealTimeEventService.handleAppointmentEvent(
            action,
            appointment,
            'patient' // This would need to be determined based on user context
          );
        }
        
        return appointment;
      }
      throw new Error(response.message || 'Failed to update appointment');
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },
  
  cancelAppointment: async (id: string): Promise<void> => {
    try {
      const response = await apiService.delete(`/appointments/${id}/cancel`);
      if (response.success) {
        // Trigger real-time event for appointment cancellation
        await RealTimeEventService.handleAppointmentEvent(
          'cancelled',
          { id, ...response.data },
          'patient' // This would need to be determined based on user context
        );
      } else {
        throw new Error(response.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  },
  
  getAppointmentById: async (id: string): Promise<Appointment | null> => {
    return null;
  }
}; 