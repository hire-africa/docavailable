/**
 * Appointment Display Utilities
 * 
 * This utility provides timezone-aware display functions for appointments
 * that can handle both old format (separate date/time) and new format (UTC datetime)
 */

export interface AppointmentDisplayData {
  appointment_date?: string;
  appointment_time?: string;
  appointment_datetime_utc?: string;
  user_timezone?: string;
}

/**
 * Get user's timezone
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect user timezone, defaulting to UTC:', error);
    return 'UTC';
  }
};

/**
 * Format appointment time for display (handles both old and new formats)
 */
export const formatAppointmentTime = (
  appointment: AppointmentDisplayData,
  requestedTimezone?: string
): string => {
  try {
    const timezone = requestedTimezone || appointment.user_timezone || getUserTimezone();
    
    // Use UTC datetime if available (new format)
    if (appointment.appointment_datetime_utc) {
      const utcDate = new Date(appointment.appointment_datetime_utc);
      return utcDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Fallback to old format for backward compatibility
    if (appointment.appointment_time) {
      return appointment.appointment_time;
    }
    
    return 'No time provided';
    
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    return appointment.appointment_time || 'Invalid time';
  }
};

/**
 * Format appointment date for display (handles both old and new formats)
 */
export const formatAppointmentDate = (
  appointment: AppointmentDisplayData,
  requestedTimezone?: string
): string => {
  try {
    const timezone = requestedTimezone || appointment.user_timezone || getUserTimezone();
    
    // Use UTC datetime if available (new format)
    if (appointment.appointment_datetime_utc) {
      const utcDate = new Date(appointment.appointment_datetime_utc);
      return utcDate.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Fallback to old format for backward compatibility
    if (appointment.appointment_date) {
      const date = new Date(appointment.appointment_date + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    return 'No date provided';
    
  } catch (error) {
    console.error('Error formatting appointment date:', error);
    return appointment.appointment_date || 'Invalid date';
  }
};

/**
 * Format appointment datetime for display (handles both old and new formats)
 */
export const formatAppointmentDateTime = (
  appointment: AppointmentDisplayData,
  requestedTimezone?: string,
  options?: {
    dateFormat?: 'short' | 'medium' | 'long';
    timeFormat?: '12h' | '24h';
  }
): string => {
  try {
    const timezone = requestedTimezone || appointment.user_timezone || getUserTimezone();
    const { dateFormat = 'short', timeFormat = '12h' } = options || {};
    
    // Use UTC datetime if available (new format)
    if (appointment.appointment_datetime_utc) {
      const utcDate = new Date(appointment.appointment_datetime_utc);
      
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: timeFormat === '12h'
      };
      
      const formattedDate = utcDate.toLocaleDateString('en-US', dateOptions);
      const formattedTime = utcDate.toLocaleTimeString('en-US', timeOptions);
      
      return `${formattedDate} • ${formattedTime}`;
    }
    
    // Fallback to old format for backward compatibility
    const dateStr = formatAppointmentDate(appointment, timezone);
    const timeStr = formatAppointmentTime(appointment, timezone);
    
    return `${dateStr} • ${timeStr}`;
    
  } catch (error) {
    console.error('Error formatting appointment datetime:', error);
    return `${appointment.appointment_date || 'Invalid date'} • ${appointment.appointment_time || 'Invalid time'}`;
  }
};

/**
 * Check if appointment time has been reached (timezone-aware)
 */
export const isAppointmentTimeReached = (
  appointment: AppointmentDisplayData,
  bufferMinutes: number = 5
): boolean => {
  try {
    // Use UTC datetime if available (new format)
    if (appointment.appointment_datetime_utc) {
      const appointmentUTC = new Date(appointment.appointment_datetime_utc);
      const nowUTC = new Date();
      const earliestStartTime = new Date(nowUTC.getTime() - (bufferMinutes * 60 * 1000));
      
      return appointmentUTC <= earliestStartTime;
    }
    
    // Fallback to old format - this would need backend validation
    // For now, return true to maintain existing behavior
    return true;
    
  } catch (error) {
    console.error('Error checking appointment time reached:', error);
    return true; // Default to allowing access
  }
};

/**
 * Get appointment time remaining until start
 */
export const getTimeUntilAppointment = (
  appointment: AppointmentDisplayData,
  requestedTimezone?: string
): string | null => {
  try {
    const timezone = requestedTimezone || appointment.user_timezone || getUserTimezone();
    
    // Use UTC datetime if available (new format)
    if (appointment.appointment_datetime_utc) {
      const appointmentUTC = new Date(appointment.appointment_datetime_utc);
      const nowUTC = new Date();
      const diffMs = appointmentUTC.getTime() - nowUTC.getTime();
      
      if (diffMs <= 0) {
        return null; // Appointment time has passed
      }
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      } else {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
      }
    }
    
    // Fallback for old format - would need more complex logic
    return null;
    
  } catch (error) {
    console.error('Error calculating time until appointment:', error);
    return null;
  }
};

/**
 * Validate appointment data format
 */
export const validateAppointmentData = (appointment: AppointmentDisplayData): {
  isValid: boolean;
  hasNewFormat: boolean;
  hasOldFormat: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  let hasNewFormat = false;
  let hasOldFormat = false;
  
  // Check for new format
  if (appointment.appointment_datetime_utc) {
    hasNewFormat = true;
    try {
      new Date(appointment.appointment_datetime_utc);
    } catch (error) {
      errors.push('Invalid UTC datetime format');
    }
  }
  
  // Check for old format
  if (appointment.appointment_date || appointment.appointment_time) {
    hasOldFormat = true;
    
    if (appointment.appointment_date) {
      try {
        new Date(appointment.appointment_date + 'T00:00:00');
      } catch (error) {
        errors.push('Invalid date format');
      }
    }
    
    if (appointment.appointment_time) {
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(appointment.appointment_time)) {
        errors.push('Invalid time format');
      }
    }
  }
  
  // Must have at least one format
  if (!hasNewFormat && !hasOldFormat) {
    errors.push('No valid appointment data found');
  }
  
  return {
    isValid: errors.length === 0,
    hasNewFormat,
    hasOldFormat,
    errors
  };
};
