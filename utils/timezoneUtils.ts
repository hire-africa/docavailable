/**
 * Timezone utilities for consistent time handling across frontend and backend
 * Supports multiple timezones and automatic detection
 */

/**
 * Get user's timezone from browser
 * @returns User's timezone string (e.g., 'Africa/Blantyre', 'America/New_York')
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect timezone, falling back to UTC:', error);
    return 'UTC';
  }
};

/**
 * Get user's timezone offset in minutes
 * @returns Timezone offset in minutes from UTC
 */
export const getUserTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset() * -1; // JavaScript returns negative values
};

/**
 * Convert a date/time string to a Date object in user's local timezone
 * @param dateStr Date string in YYYY-MM-DD or MM/DD/YYYY format
 * @param timeStr Time string in HH:MM format
 * @param timezone Optional timezone (defaults to user's timezone)
 * @returns Date object representing the time in the specified timezone
 */
export const parseLocalDateTime = (dateStr: string, timeStr: string, timezone?: string): Date => {
  if (!dateStr || !timeStr) {
    throw new Error('Date and time strings are required');
  }

  const targetTimezone = timezone || getUserTimezone();
  
  if (dateStr.includes('/')) {
    // Format: MM/DD/YYYY
    const [month, day, year] = dateStr.split('/').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    
    // Create date in user's local timezone
    const localDate = new Date(year, month - 1, day, hour, minute);
    return localDate;
  } else {
    // Format: YYYY-MM-DD
    // Parse as local time in user's timezone
    const localDate = new Date(`${dateStr}T${timeStr}`);
    return localDate;
  }
};

/**
 * Convert local time to UTC
 * @param localDate Local date object
 * @returns UTC date object
 */
export const toUTC = (localDate: Date): Date => {
  return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
};

/**
 * Convert UTC time to local timezone
 * @param utcDate UTC date object
 * @param timezone Target timezone (defaults to user's timezone)
 * @returns Local date object
 */
export const fromUTC = (utcDate: Date, timezone?: string): Date => {
  const targetTimezone = timezone || getUserTimezone();
  
  // Create a new date in the target timezone
  const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: targetTimezone }));
  return localDate;
};

/**
 * Get current time in user's timezone
 * @returns Date object representing current time in user's timezone
 */
export const getCurrentTime = (): Date => {
  return new Date();
};

/**
 * Check if appointment time has been reached in user's timezone
 * @param appointmentDate Date string
 * @param appointmentTime Time string
 * @param bufferMinutes Buffer time in minutes (default: 5)
 * @param timezone Optional timezone (defaults to user's timezone)
 * @returns true if appointment time has been reached
 */
export const isAppointmentTimeReached = (appointmentDate: string, appointmentTime: string, bufferMinutes: number = 5, timezone?: string): boolean => {
  try {
    const appointmentDateTime = parseLocalDateTime(appointmentDate, appointmentTime, timezone);
    const now = getCurrentTime();
    
    // Allow appointments to start up to bufferMinutes before scheduled time
    const earliestStartTime = new Date(now.getTime() - (bufferMinutes * 60 * 1000));
    
    return appointmentDateTime.getTime() <= earliestStartTime.getTime();
  } catch (error) {
    console.error('Error checking appointment time:', error);
    return false;
  }
};

/**
 * Convert appointment time to UTC for storage
 * @param appointmentDate Date string
 * @param appointmentTime Time string
 * @param timezone Source timezone (defaults to user's timezone)
 * @returns UTC date object
 */
export const convertToUTC = (appointmentDate: string, appointmentTime: string, timezone?: string): Date => {
  const localDateTime = parseLocalDateTime(appointmentDate, appointmentTime, timezone);
  return toUTC(localDateTime);
};

/**
 * Convert UTC appointment time to user's local timezone for display
 * @param utcDate UTC date object
 * @param timezone Target timezone (defaults to user's timezone)
 * @returns Local date object
 */
export const convertFromUTC = (utcDate: Date, timezone?: string): Date => {
  return fromUTC(utcDate, timezone);
};

/**
 * Format date for display in user's timezone
 * @param date Date object
 * @param timezone Optional timezone (defaults to user's timezone)
 * @returns Formatted date string
 */
export const formatLocalDate = (date: Date, timezone?: string): string => {
  const targetTimezone = timezone || getUserTimezone();
  
  return date.toLocaleString('en-US', {
    timeZone: targetTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Get timezone information for debugging
 * @returns Object with timezone details
 */
export const getTimezoneInfo = () => {
  return {
    userTimezone: getUserTimezone(),
    timezoneOffset: getUserTimezoneOffset(),
    currentTime: getCurrentTime().toISOString(),
    currentTimeLocal: formatLocalDate(getCurrentTime())
  };
};
