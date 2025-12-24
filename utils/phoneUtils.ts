/**
 * Phone number utilities for E.164 format normalization
 */

export interface CountryCode {
  code: string;
  country: string;
  dialCode: string;
}

// Common country codes with dial codes
export const COUNTRY_CODES: CountryCode[] = [
  { code: 'US', country: 'United States', dialCode: '+1' },
  { code: 'GB', country: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', country: 'Canada', dialCode: '+1' },
  { code: 'AU', country: 'Australia', dialCode: '+61' },
  { code: 'DE', country: 'Germany', dialCode: '+49' },
  { code: 'FR', country: 'France', dialCode: '+33' },
  { code: 'IT', country: 'Italy', dialCode: '+39' },
  { code: 'ES', country: 'Spain', dialCode: '+34' },
  { code: 'NL', country: 'Netherlands', dialCode: '+31' },
  { code: 'BE', country: 'Belgium', dialCode: '+32' },
  { code: 'CH', country: 'Switzerland', dialCode: '+41' },
  { code: 'AT', country: 'Austria', dialCode: '+43' },
  { code: 'SE', country: 'Sweden', dialCode: '+46' },
  { code: 'NO', country: 'Norway', dialCode: '+47' },
  { code: 'DK', country: 'Denmark', dialCode: '+45' },
  { code: 'FI', country: 'Finland', dialCode: '+358' },
  { code: 'PL', country: 'Poland', dialCode: '+48' },
  { code: 'PT', country: 'Portugal', dialCode: '+351' },
  { code: 'GR', country: 'Greece', dialCode: '+30' },
  { code: 'IE', country: 'Ireland', dialCode: '+353' },
  { code: 'NZ', country: 'New Zealand', dialCode: '+64' },
  { code: 'ZA', country: 'South Africa', dialCode: '+27' },
  { code: 'BR', country: 'Brazil', dialCode: '+55' },
  { code: 'MX', country: 'Mexico', dialCode: '+52' },
  { code: 'AR', country: 'Argentina', dialCode: '+54' },
  { code: 'CL', country: 'Chile', dialCode: '+56' },
  { code: 'CO', country: 'Colombia', dialCode: '+57' },
  { code: 'PE', country: 'Peru', dialCode: '+51' },
  { code: 'VE', country: 'Venezuela', dialCode: '+58' },
  { code: 'IN', country: 'India', dialCode: '+91' },
  { code: 'CN', country: 'China', dialCode: '+86' },
  { code: 'JP', country: 'Japan', dialCode: '+81' },
  { code: 'KR', country: 'South Korea', dialCode: '+82' },
  { code: 'SG', country: 'Singapore', dialCode: '+65' },
  { code: 'MY', country: 'Malaysia', dialCode: '+60' },
  { code: 'TH', country: 'Thailand', dialCode: '+66' },
  { code: 'ID', country: 'Indonesia', dialCode: '+62' },
  { code: 'PH', country: 'Philippines', dialCode: '+63' },
  { code: 'VN', country: 'Vietnam', dialCode: '+84' },
  { code: 'AE', country: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SA', country: 'Saudi Arabia', dialCode: '+966' },
  { code: 'IL', country: 'Israel', dialCode: '+972' },
  { code: 'TR', country: 'Turkey', dialCode: '+90' },
  { code: 'EG', country: 'Egypt', dialCode: '+20' },
  { code: 'NG', country: 'Nigeria', dialCode: '+234' },
  { code: 'KE', country: 'Kenya', dialCode: '+254' },
  { code: 'GH', country: 'Ghana', dialCode: '+233' },
  { code: 'TZ', country: 'Tanzania', dialCode: '+255' },
  { code: 'UG', country: 'Uganda', dialCode: '+256' },
  { code: 'ET', country: 'Ethiopia', dialCode: '+251' },
  { code: 'MW', country: 'Malawi', dialCode: '+265' },
  { code: 'ZM', country: 'Zambia', dialCode: '+260' },
  { code: 'ZW', country: 'Zimbabwe', dialCode: '+263' },
  { code: 'BW', country: 'Botswana', dialCode: '+267' },
  { code: 'MZ', country: 'Mozambique', dialCode: '+258' },
  { code: 'AO', country: 'Angola', dialCode: '+244' },
  { code: 'RU', country: 'Russia', dialCode: '+7' },
  { code: 'UA', country: 'Ukraine', dialCode: '+380' },
  { code: 'PK', country: 'Pakistan', dialCode: '+92' },
  { code: 'BD', country: 'Bangladesh', dialCode: '+880' },
  { code: 'LK', country: 'Sri Lanka', dialCode: '+94' },
  { code: 'NP', country: 'Nepal', dialCode: '+977' },
];

/**
 * Get default country code based on user's locale or return US as default
 */
export function getDefaultCountryCode(): CountryCode {
  // Try to detect user's country from locale (if available)
  // For now, default to US
  return COUNTRY_CODES.find(c => c.code === 'MW') || COUNTRY_CODES[0];
}

/**
 * Normalize phone number to E.164 format
 * E.164 format: +[country code][number] (e.g., +1234567890)
 * 
 * @param phoneNumber - The phone number to normalize
 * @param countryCode - The country code object with dialCode
 * @returns Normalized phone number in E.164 format
 */
export function normalizePhoneToE164(phoneNumber: string, countryCode: CountryCode): string {
  if (!phoneNumber) {
    return '';
  }

  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it already starts with +, check if it has country code
  if (cleaned.startsWith('+')) {
    // Already in E.164 format or has country code
    return cleaned;
  }

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');

  // Add country code if not present
  const dialCode = countryCode.dialCode.replace('+', '');
  if (!cleaned.startsWith(dialCode)) {
    cleaned = dialCode + cleaned;
  }

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validate phone number format (basic validation)
 * 
 * @param phoneNumber - The phone number to validate
 * @returns true if phone number appears valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) {
    return false;
  }

  // E.164 format: + followed by 1-15 digits
  const e164Pattern = /^\+[1-9]\d{1,14}$/;
  return e164Pattern.test(phoneNumber);
}

/**
 * Format phone number for display (adds spaces for readability)
 * 
 * @param phoneNumber - The phone number in E.164 format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) {
    return '';
  }

  // Remove + for display formatting
  const digits = phoneNumber.replace(/[^\d]/g, '');

  // Format based on length (basic formatting)
  if (digits.length <= 3) {
    return '+' + digits;
  } else if (digits.length <= 6) {
    return '+' + digits.slice(0, 3) + ' ' + digits.slice(3);
  } else if (digits.length <= 10) {
    return '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
  } else {
    return '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6, 10) + ' ' + digits.slice(10);
  }
}

