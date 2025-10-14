// Hook to handle conversion of text appointments to text sessions
import { useCallback, useEffect, useRef } from 'react';
import { Appointment, TextSession, textSessionService } from '../services/textSessionService';

interface UseTextAppointmentConverterProps {
  appointments: Appointment[];
  onTextSessionCreated: (textSession: TextSession) => void;
  onAppointmentUpdated: (appointmentId: string | number) => void;
}

export const useTextAppointmentConverter = ({
  appointments,
  onTextSessionCreated,
  onAppointmentUpdated
}: UseTextAppointmentConverterProps) => {
  const conversionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const processedAppointments = useRef<Set<string | number>>(new Set());

  // Function to check and convert text appointments
  const checkAndConvertTextAppointments = useCallback(async () => {
    try {
      console.log('🔄 [TextAppointmentConverter] Checking appointments for conversion...');
      
      for (const appointment of appointments) {
        const appointmentId = appointment.id;
        
        // Skip if already processed
        if (processedAppointments.current.has(appointmentId)) {
          continue;
        }

        // Check if this appointment should be converted
        if (textSessionService.shouldConvertToTextSession(appointment)) {
          console.log('⏰ [TextAppointmentConverter] Appointment ready for conversion:', appointmentId);
          
          // Check if text session already exists
          const hasExistingSession = await textSessionService.hasTextSessionForAppointment(appointmentId);
          if (hasExistingSession) {
            console.log('ℹ️ [TextAppointmentConverter] Text session already exists for appointment:', appointmentId);
            processedAppointments.current.add(appointmentId);
            continue;
          }

          // Create text session
          const textSession = await textSessionService.createTextSessionFromAppointment(appointment);
          if (textSession) {
            console.log('✅ [TextAppointmentConverter] Text session created for appointment:', appointmentId);
            onTextSessionCreated(textSession);
            onAppointmentUpdated(appointmentId);
            processedAppointments.current.add(appointmentId);
          } else {
            console.log('❌ [TextAppointmentConverter] Failed to create text session for appointment:', appointmentId);
          }
        }
      }
    } catch (error) {
      console.error('❌ [TextAppointmentConverter] Error checking appointments:', error);
    }
  }, [appointments, onTextSessionCreated, onAppointmentUpdated]);

  // Start conversion monitoring
  useEffect(() => {
    // Clear any existing interval
    if (conversionCheckInterval.current) {
      clearInterval(conversionCheckInterval.current);
    }

    // Check immediately
    checkAndConvertTextAppointments();

    // Set up interval to check every minute
    conversionCheckInterval.current = setInterval(checkAndConvertTextAppointments, 60000); // 60 seconds

    // Cleanup
    return () => {
      if (conversionCheckInterval.current) {
        clearInterval(conversionCheckInterval.current);
      }
    };
  }, [checkAndConvertTextAppointments]);

  // Reset processed appointments when appointments change
  useEffect(() => {
    processedAppointments.current.clear();
  }, [appointments]);

  // Manual trigger for conversion check
  const triggerConversionCheck = useCallback(() => {
    checkAndConvertTextAppointments();
  }, [checkAndConvertTextAppointments]);

  return {
    triggerConversionCheck
  };
};


