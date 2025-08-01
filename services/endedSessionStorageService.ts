// Placeholder ended session storage service
export interface EndedSessionMetadata {
  appointmentId: number;
  sessionData: any;
  timestamp: string;
}

export const endedSessionStorageService = {
  // Placeholder methods
  saveEndedSession: async (appointmentId: number, sessionData: any): Promise<void> => {
    // Placeholder implementation
  },
  
  getEndedSessions: async (): Promise<EndedSessionMetadata[]> => {
    return [];
  },
  
  getEndedSessionsByPatient: async (patientId: number): Promise<EndedSessionMetadata[]> => {
    // Placeholder implementation - return empty array for now
    return [];
  },
  
  deleteEndedSession: async (appointmentId: number): Promise<void> => {
    // Placeholder implementation
  },
  
  exportEndedSession: async (appointmentId: number): Promise<string> => {
    return '';
  }
}; 