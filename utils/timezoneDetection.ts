/**
 * Enhanced Timezone Detection Utilities
 * 
 * Provides multiple methods for detecting user timezone with fallbacks
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

/**
 * Get user's timezone using multiple detection methods
 */
export const detectUserTimezone = async (): Promise<string> => {
  // Method 1: Try location-based detection
  try {
    const locationTimezone = await getTimezoneFromLocation();
    if (locationTimezone) {
      console.log('🌍 Timezone detected from location:', locationTimezone);
      return locationTimezone;
    }
  } catch (error) {
    console.warn('⚠️ Location-based timezone detection failed:', error);
  }

  // Method 2: Try device timezone detection
  try {
    const deviceTimezone = getDeviceTimezone();
    if (deviceTimezone && deviceTimezone !== 'UTC') {
      console.log('📱 Timezone detected from device:', deviceTimezone);
      return deviceTimezone;
    }
  } catch (error) {
    console.warn('⚠️ Device timezone detection failed:', error);
  }

  // Method 3: Try IP-based detection (if available)
  try {
    const ipTimezone = await getTimezoneFromIP();
    if (ipTimezone) {
      console.log('🌐 Timezone detected from IP:', ipTimezone);
      return ipTimezone;
    }
  } catch (error) {
    console.warn('⚠️ IP-based timezone detection failed:', error);
  }

  // Fallback to UTC
  console.warn('⚠️ All timezone detection methods failed, using UTC');
  return 'UTC';
};

/**
 * Get timezone from user's location using geolocation
 */
const getTimezoneFromLocation = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const timezone = await getTimezoneFromCoordinates(latitude, longitude);
          resolve(timezone);
        } catch (error) {
          console.error('Error getting timezone from coordinates:', error);
          resolve(null);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

/**
 * Get timezone from coordinates using a timezone API
 */
const getTimezoneFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
  try {
    // Using a free timezone API
    const response = await fetch(
      `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lng}`
    );
    
    if (!response.ok) {
      throw new Error('Timezone API request failed');
    }
    
    const data = await response.json();
    return data.zoneName || null;
  } catch (error) {
    console.error('Error fetching timezone from coordinates:', error);
    return null;
  }
};

/**
 * Get timezone from device/browser
 */
const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting device timezone:', error);
    return 'UTC';
  }
};

/**
 * Get timezone from IP address (requires backend API)
 */
const getTimezoneFromIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/user/timezone-from-ip', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('IP timezone API request failed');
    }
    
    const data = await response.json();
    return data.timezone || null;
  } catch (error) {
    console.error('Error getting timezone from IP:', error);
    return null;
  }
};

/**
 * Get common timezone options for manual selection
 */
export const getCommonTimezones = (): TimezoneOption[] => {
  return [
    // Americas
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: 'UTC-5/-4' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: 'UTC-6/-5' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: 'UTC-7/-6' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: 'UTC-8/-7' },
    { value: 'America/Toronto', label: 'Toronto', offset: 'UTC-5/-4' },
    { value: 'America/Sao_Paulo', label: 'São Paulo', offset: 'UTC-3' },
    
    // Europe
    { value: 'Europe/London', label: 'London', offset: 'UTC+0/+1' },
    { value: 'Europe/Paris', label: 'Paris', offset: 'UTC+1/+2' },
    { value: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+1/+2' },
    { value: 'Europe/Rome', label: 'Rome', offset: 'UTC+1/+2' },
    { value: 'Europe/Madrid', label: 'Madrid', offset: 'UTC+1/+2' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: 'UTC+1/+2' },
    
    // Asia
    { value: 'Asia/Kolkata', label: 'India Standard Time', offset: 'UTC+5:30' },
    { value: 'Asia/Shanghai', label: 'China Standard Time', offset: 'UTC+8' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time', offset: 'UTC+9' },
    { value: 'Asia/Seoul', label: 'Korea Standard Time', offset: 'UTC+9' },
    { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8' },
    { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
    
    // Africa
    { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2' },
    { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1' },
    { value: 'Africa/Blantyre', label: 'Malawi', offset: 'UTC+2' },
    { value: 'Africa/Nairobi', label: 'Nairobi', offset: 'UTC+3' },
    
    // Australia/Oceania
    { value: 'Australia/Sydney', label: 'Sydney', offset: 'UTC+10/+11' },
    { value: 'Australia/Melbourne', label: 'Melbourne', offset: 'UTC+10/+11' },
    { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+8' },
    { value: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+12/+13' },
    
    // UTC
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'UTC+0' }
  ];
};

/**
 * Validate timezone string
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
 * Get timezone offset for display
 */
export const getTimezoneOffset = (timezone: string): string => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const local = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (local.getTime() - utc.getTime()) / (1000 * 60);
    
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    return `UTC${sign}${hours}${minutes ? ':' + minutes.toString().padStart(2, '0') : ''}`;
  } catch (error) {
    return 'UTC+0';
  }
};
