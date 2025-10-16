/**
 * Unified Appointment Time Utilities
 * 
 * This utility provides consistent timezone handling for appointments
 * that matches the backend TimezoneService logic.
 * 
 * IMPORTANT: This only affects scheduled appointments, NOT instant sessions.
 */

export interface AppointmentTimeInfo {
  appointmentDate: string;
  appointmentTime: string;
  userTimezone?: string;
}

export interface TimeValidationResult {
  isTimeReached: boolean;
  timeUntilAppointment: string;
  appointmentDateTime: Date;
  currentTime: Date;
  timeDifference: number; // in milliseconds
  error?: string;
}

/**
 * Get user's timezone from browser or default to UTC
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    console.warn('Could not detect timezone, defaulting to UTC:', error);
    return 'UTC';
  }
};

/**
 * Validate if timezone is valid
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Parse appointment date and time in user's timezone
 * Matches backend TimezoneService.parseAppointmentDateTime logic
 */
export const parseAppointmentDateTime = (
  dateStr: string, 
  timeStr: string, 
  timezone: string = getUserTimezone()
): Date | null => {
  try {
    if (!dateStr || !timeStr) {
      return null;
    }

    // Handle different date formats (matching backend logic)
    if (dateStr.includes('/')) {
      // Format: MM/DD/YYYY
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        const month = parseInt(dateParts[0], 10);
        const day = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        
        // Handle time format (remove AM/PM if present)
        const cleanTimeStr = timeStr.replace(/\s*(AM|PM)/i, '');
        const timeParts = cleanTimeStr.split(':');
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        
        // Create date in user's timezone
        const appointmentDate = new Date(year, month - 1, day, hour, minute, 0);
        
        // Convert to UTC for consistent comparison
        return new Date(appointmentDate.getTime() - (appointmentDate.getTimezoneOffset() * 60000));
      }
    } else {
      // Format: YYYY-MM-DD
      const cleanTimeStr = timeStr.replace(/\s*(AM|PM)/i, '');
      const timeParts = cleanTimeStr.split(':');
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      
      // Parse date and set time
      const appointmentDate = new Date(dateStr);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Convert to UTC for consistent comparison
      return new Date(appointmentDate.getTime() - (appointmentDate.getTimezoneOffset() * 60000));
    }
  } catch (error) {
    console.error('Error parsing appointment date/time:', error);
    return null;
  }
  
  return null;
};

/**
 * Check if appointment time has been reached with buffer
 * Matches backend TimezoneService.isAppointmentTimeReached logic
 */
export const isAppointmentTimeReached = (
  dateStr: string,
  timeStr: string,
  userTimezone: string = getUserTimezone(),
  bufferMinutes: number = 5
): TimeValidationResult => {
  const result: TimeValidationResult = {
    isTimeReached: false,
    timeUntilAppointment: '',
    appointmentDateTime: new Date(),
    currentTime: new Date(),
    timeDifference: 0
  };

  try {
    // Validate input parameters
    if (!dateStr || !timeStr) {
      result.error = 'Appointment date and time are required';
      return result;
    }

    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      console.warn(`Invalid timezone provided: ${userTimezone}, defaulting to UTC`);
      userTimezone = 'UTC';
    }

    // Parse appointment date/time
    const appointmentDateTime = parseAppointmentDateTime(dateStr, timeStr, userTimezone);
    
    if (!appointmentDateTime) {
      result.error = 'Invalid appointment date/time format';
      return result;
    }

    // Validate appointment time is not in the past
    const now = new Date();
    if (appointmentDateTime.getTime() < now.getTime()) {
      result.error = 'Appointment time cannot be in the past';
      return result;
    }

    // Validate appointment time is not too far in the future (more than 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (appointmentDateTime.getTime() > oneYearFromNow.getTime()) {
      result.error = 'Appointment time cannot be more than 1 year in the future';
      return result;
    }

    result.appointmentDateTime = appointmentDateTime;
    result.currentTime = now;
    
    // Calculate time difference
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    result.timeDifference = timeDiff;
    
    // Allow appointments to start up to bufferMinutes before scheduled time
    const earliestStartTime = new Date(now.getTime() - (bufferMinutes * 60 * 1000));
    
    result.isTimeReached = appointmentDateTime.getTime() <= earliestStartTime.getTime();
    
    // Calculate time until appointment
    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        result.timeUntilAppointment = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        result.timeUntilAppointment = `${hours}h ${minutes}m`;
      } else {
        result.timeUntilAppointment = `${minutes}m`;
      }
    } else {
      result.timeUntilAppointment = '';
    }
    
  } catch (error) {
    console.error('Error checking appointment time:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
};

/**
 * Validate appointment time input
 */
export const validateAppointmentTime = (dateStr: string, timeStr: string): { isValid: boolean; error?: string } => {
  if (!dateStr || !timeStr) {
    return { isValid: false, error: 'Date and time are required' };
  }

  // Check if date is in the past
  const appointmentDateTime = parseAppointmentDateTime(dateStr, timeStr);
  if (appointmentDateTime && appointmentDateTime.getTime() < Date.now()) {
    return { isValid: false, error: 'Appointment time cannot be in the past' };
  }

  // Check if date is too far in the future (e.g., more than 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (appointmentDateTime && appointmentDateTime.getTime() > oneYearFromNow.getTime()) {
    return { isValid: false, error: 'Appointment time cannot be more than 1 year in the future' };
  }

  return { isValid: true };
};

/**
 * Format appointment time for display
 */
export const formatAppointmentTime = (dateStr: string, timeStr: string, timezone?: string): string => {
  try {
    const appointmentDateTime = parseAppointmentDateTime(dateStr, timeStr, timezone);
    if (!appointmentDateTime) {
      return `${dateStr} ${timeStr}`;
    }

    // Convert back to user's timezone for display
    const userTimezone = timezone || getUserTimezone();
    const displayDate = new Date(appointmentDateTime.getTime() + (new Date().getTimezoneOffset() * 60000));
    
    return displayDate.toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    return `${dateStr} ${timeStr}`;
  }
};
