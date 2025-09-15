// Placeholder appointment service
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
  // Placeholder methods
  getAppointments: async (): Promise<Appointment[]> => {
    return [];
  },
  
  createAppointment: async (appointmentData: any): Promise<Appointment> => {
    return {
      id: '1',
      doctorId: appointmentData.doctorId,
      patientId: appointmentData.patientId,
      date: appointmentData.date,
      time: appointmentData.time,
      status: APPOINTMENT_STATUS.PENDING,
      type: appointmentData.type,
      notes: appointmentData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },
  
  updateAppointment: async (id: string, data: any): Promise<Appointment> => {
    return {
      id,
      doctorId: data.doctorId,
      patientId: data.patientId,
      date: data.date,
      time: data.time,
      status: data.status,
      type: data.type,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },
  
  cancelAppointment: async (id: string): Promise<void> => {
    // Placeholder implementation
  },
  
  getAppointmentById: async (id: string): Promise<Appointment | null> => {
    return null;
  }
}; 