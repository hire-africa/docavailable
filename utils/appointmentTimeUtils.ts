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

    const dateParts = extractDateParts(dateStr);
    const timeParts = extractTimeParts(timeStr);

    if (!dateParts || !timeParts) {
      return null;
    }

    const { year, month, day } = dateParts;
    const { hour, minute, second } = timeParts;

    const utcAssumed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = getTimezoneOffsetMs(utcAssumed, timezone);

    return new Date(utcAssumed.getTime() - offset);
  } catch (error) {
    console.error('Error parsing appointment date/time:', error);
    return null;
  }
};

const extractDateParts = (dateStr: string): { year: number; month: number; day: number } | null => {
  try {
    const trimmed = dateStr.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.includes('/')) {
      // Format: MM/DD/YYYY
      const segments = trimmed.split('/');
      if (segments.length === 3) {
        const [monthRaw, dayRaw, yearRaw] = segments;
        const month = parseInt(monthRaw, 10);
        const day = parseInt(dayRaw, 10);
        const year = parseInt(yearRaw, 10);

        if ([month, day, year].some(Number.isNaN)) {
          return null;
        }

        return { year, month, day };
      }
      return null;
    }

    // Assume ISO-like format: YYYY-MM-DD
    const normalized = trimmed.split('T')[0];
    const isoSegments = normalized.split('-');
    if (isoSegments.length < 3) {
      return null;
    }

    const [yearRaw, monthRaw, dayRaw] = isoSegments;
    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);

    if ([year, month, day].some(Number.isNaN)) {
      return null;
    }

    return { year, month, day };
  } catch (error) {
    console.error('Error extracting date parts:', error);
    return null;
  }
};

const extractTimeParts = (timeStr: string): { hour: number; minute: number; second: number } | null => {
  try {
    const trimmed = timeStr.trim();
    if (!trimmed) {
      return null;
    }

    // Handle 12-hour formats with AM/PM
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (twelveHourMatch) {
      let hour = parseInt(twelveHourMatch[1], 10);
      const minute = parseInt(twelveHourMatch[2], 10);
      const second = twelveHourMatch[3] ? parseInt(twelveHourMatch[3], 10) : 0;
      const period = twelveHourMatch[4].toUpperCase();

      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }

      if ([hour, minute, second].some(Number.isNaN)) {
        return null;
      }

      return { hour, minute, second };
    }

    // Handle 24-hour formats
    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (twentyFourHourMatch) {
      const hour = parseInt(twentyFourHourMatch[1], 10);
      const minute = parseInt(twentyFourHourMatch[2], 10);
      const second = twentyFourHourMatch[3] ? parseInt(twentyFourHourMatch[3], 10) : 0;

      if (hour > 23 || minute > 59 || second > 59) {
        return null;
      }

      return { hour, minute, second };
    }

    return null;
  } catch (error) {
    console.error('Error extracting time parts:', error);
    return null;
  }
};

const getTimezoneOffsetMs = (utcDate: Date, timezone: string): number => {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const parts = dtf.formatToParts(utcDate);
    const map: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        map[part.type] = part.value;
      }
    }

    const asUTC = Date.UTC(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      parseInt(map.hour, 10),
      parseInt(map.minute, 10),
      parseInt(map.second, 10)
    );

    return asUTC - utcDate.getTime();
  } catch (error) {
    console.error('Error calculating timezone offset:', error);
    return 0;
  }
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
    return appointmentDateTime.toLocaleString('en-US', {
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
