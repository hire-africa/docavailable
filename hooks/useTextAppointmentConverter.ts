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
  const isProcessingRef = useRef<boolean>(false); // Prevent concurrent processing

  // Function to check and convert text appointments
  const checkAndConvertTextAppointments = useCallback(async () => {
    // Prevent concurrent execution
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    try {
      // Debug logging disabled to prevent console spam (uncomment if needed for debugging)
      // console.log('🔄 [TextAppointmentConverter] Checking appointments for conversion...');

      // Optimization: Fetch active sessions once to avoid API calls inside the loop
      const activeSessions = await textSessionService.getActiveTextSessions();
      const activeSessionAppointmentIds = new Set(
        activeSessions
          .filter(s => s.appointment_id)
          .map(s => Number(s.appointment_id))
      );

      for (const appointment of appointments) {
        const appointmentId = appointment.id;

        // Skip if already processed
        if (processedAppointments.current.has(appointmentId)) {
          continue;
        }

        // Check if this appointment should be converted
        if (textSessionService.shouldConvertToTextSession(appointment)) {
          // Check if text session already exists FIRST (before trying to create)
          const hasExistingSession = activeSessionAppointmentIds.has(Number(appointmentId));

          if (hasExistingSession) {
            // Mark as processed immediately to avoid repeated checks
            processedAppointments.current.add(appointmentId);
            continue;
          }

          // Mark as processing BEFORE attempting to create (prevents duplicate attempts)
          processedAppointments.current.add(appointmentId);

          // Create text session
          try {
            const textSession = await textSessionService.createTextSessionFromAppointment(appointment);
            if (textSession) {
              console.log('✅ [TextAppointmentConverter] Text session created for appointment:', appointmentId);
              // Callbacks are fire-and-forget to prevent blocking
              // Use setTimeout to debounce callbacks and prevent immediate re-renders
              setTimeout(() => {
                try {
                  onTextSessionCreated(textSession);
                } catch (e) {
                  console.warn('⚠️ [TextAppointmentConverter] Error in onTextSessionCreated callback:', e);
                }
              }, 100);
              setTimeout(() => {
                try {
                  onAppointmentUpdated(appointmentId);
                } catch (e) {
                  console.warn('⚠️ [TextAppointmentConverter] Error in onAppointmentUpdated callback:', e);
                }
              }, 200);
            } else {
              // If creation failed, check if it's a timeout - if so, keep marked as processed to prevent spam
              // The session might already exist, so don't retry immediately
              // Only log failures if not a timeout (to reduce spam)
              // console.log('❌ [TextAppointmentConverter] Failed to create text session for appointment:', appointmentId);
            }
          } catch (createError: any) {
            // If creation failed due to timeout, keep it marked as processed to prevent spam
            const isTimeout = createError?.message?.includes('timeout') || createError?.message?.includes('Request timeout');
            if (!isTimeout) {
              // Only remove from processed if it's not a timeout (timeouts might mean session already exists)
              processedAppointments.current.delete(appointmentId);
            }
            // Don't log timeout errors to reduce spam
            if (!isTimeout) {
              console.warn('⚠️ [TextAppointmentConverter] Error creating session for appointment:', appointmentId, createError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [TextAppointmentConverter] Error checking appointments:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [appointments, onTextSessionCreated, onAppointmentUpdated]);

  // Start conversion monitoring
  useEffect(() => {
    // Clear any existing interval
    if (conversionCheckInterval.current) {
      clearInterval(conversionCheckInterval.current);
    }

    // Check immediately (but only if we have appointments)
    if (appointments.length > 0) {
      checkAndConvertTextAppointments();
    }

    // Set up interval to check every minute (only if we have appointments)
    if (appointments.length > 0) {
      conversionCheckInterval.current = setInterval(() => {
        checkAndConvertTextAppointments();
      }, 60000); // 60 seconds
    }

    // Cleanup
    return () => {
      if (conversionCheckInterval.current) {
        clearInterval(conversionCheckInterval.current);
      }
    };
  }, [checkAndConvertTextAppointments, appointments.length]); // Only depend on appointments.length, not the full array

  // DON'T clear processed appointments when appointments array reference changes
  // This was causing the infinite loop - when callbacks refresh appointments,
  // the array reference changes but the IDs are the same, so we shouldn't clear processedAppointments
  // Only clear processed appointments for IDs that are no longer in the appointments list
  const appointmentIdsString = appointments.map(a => String(a.id)).sort().join(',');
  const lastAppointmentIdsRef = useRef<string>('');
  
  useEffect(() => {
    // Only update if the actual appointment IDs have changed (not just the array reference)
    if (appointmentIdsString !== lastAppointmentIdsRef.current) {
      const currentIds = new Set(appointments.map(a => String(a.id)));
      const processedIds = Array.from(processedAppointments.current).map(id => String(id));
      
      // Remove processed IDs that are no longer in the appointments list
      for (const processedId of processedIds) {
        if (!currentIds.has(processedId)) {
          processedAppointments.current.delete(processedId);
        }
      }
      
      lastAppointmentIdsRef.current = appointmentIdsString;
    }
  }, [appointmentIdsString]); // Only depend on the IDs string, not the full array

  // Manual trigger for conversion check
  const triggerConversionCheck = useCallback(() => {
    checkAndConvertTextAppointments();
  }, [checkAndConvertTextAppointments]);

  return {
    triggerConversionCheck
  };
};


