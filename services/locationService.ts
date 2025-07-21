export interface LocationBasedPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  textSessions: number;
  voiceCalls: number;
  videoCalls: number;
  features: string[];
  popular?: boolean;
}

export interface LocationPricing {
  basic: { price: number; currency: string };
  executive: { price: number; currency: string };
  premium: { price: number; currency: string };
}

export interface LocationInfo {
  country: string;
  currency: string;
  isMalawi: boolean;
  source: 'gps' | 'registration' | 'default';
}

// Pricing configuration for different locations
const LOCATION_PRICING: Record<string, LocationPricing> = {
  'Malawi': {
    basic: { price: 20000, currency: 'MWK' },
    executive: { price: 50000, currency: 'MWK' },
    premium: { price: 200000, currency: 'MWK' }
  },
  // All other countries use USD pricing
  'default': {
    basic: { price: 20, currency: 'USD' },
    executive: { price: 50, currency: 'USD' },
    premium: { price: 200, currency: 'USD' }
  }
};

// Plan features configuration
const PLAN_FEATURES = {
  basic: [
    '3 Text Sessions',
    '1 Voice Call'
  ],
  executive: [
    '10 Text Sessions',
    '2 Voice Calls',
    '1 Video Call'
  ],
  premium: [
    '50 Text Sessions',
    '15 Voice Calls',
    '5 Video Calls'
  ]
};

export class LocationService {
  /**
   * Get pricing configuration based on user's country
   */
  static getPricingForCountry(country: string): LocationPricing {
    return LOCATION_PRICING[country] || LOCATION_PRICING['default'];
  }

  /**
   * Check if user is in Malawi
   */
  static isInMalawi(country: string): boolean {
    return country === 'Malawi';
  }

  /**
   * Get currency for a specific country
   */
  static getCurrencyForCountry(country: string): string {
    return this.isInMalawi(country) ? 'MWK' : 'USD';
  }

  /**
   * Get location information with source tracking
   */
  static getLocationInfo(
    registrationCountry?: string,
    gpsCountry?: string
  ): LocationInfo {
    // Priority: GPS > Registration > Default
    if (gpsCountry) {
      return {
        country: gpsCountry,
        currency: this.getCurrencyForCountry(gpsCountry),
        isMalawi: this.isInMalawi(gpsCountry),
        source: 'gps'
      };
    }
    
    if (registrationCountry) {
      return {
        country: registrationCountry,
        currency: this.getCurrencyForCountry(registrationCountry),
        isMalawi: this.isInMalawi(registrationCountry),
        source: 'registration'
      };
    }
    
    // Default to Malawi
    return {
      country: 'Malawi',
      currency: 'MWK',
      isMalawi: true,
      source: 'default'
    };
  }

  /**
   * Get location-based subscription plans with GPS support
   */
  static getLocationBasedPlans(
    registrationCountry?: string,
    gpsCountry?: string
  ): LocationBasedPlan[] {
    const locationInfo = this.getLocationInfo(registrationCountry, gpsCountry);
    const pricing = this.getPricingForCountry(locationInfo.country);
    
    return [
      {
        id: 'basic',
        name: 'Basic Life',
        price: pricing.basic.price,
        currency: pricing.basic.currency,
        textSessions: 3,
        voiceCalls: 1,
        videoCalls: 0,
        features: PLAN_FEATURES.basic
      },
      {
        id: 'executive',
        name: 'Executive Life',
        price: pricing.executive.price,
        currency: pricing.executive.currency,
        textSessions: 10,
        voiceCalls: 2,
        videoCalls: 1,
        features: PLAN_FEATURES.executive,
        popular: true
      },
      {
        id: 'premium',
        name: 'Premium Life',
        price: pricing.premium.price,
        currency: pricing.premium.currency,
        textSessions: 50,
        voiceCalls: 15,
        videoCalls: 5,
        features: PLAN_FEATURES.premium
      }
    ];
  }

  /**
   * Format currency based on location
   */
  static formatCurrency(amount: number, currency: string): string {
    if (currency === 'MWK') {
      return `mk ${amount.toLocaleString()}`;
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString()}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  }

  /**
   * Get currency symbol
   */
  static getCurrencySymbol(currency: string): string {
    switch (currency) {
      case 'MWK':
        return 'mk';
      case 'USD':
        return '$';
      default:
        return currency;
    }
  }

  /**
   * Get location source description
   */
  static getLocationSourceDescription(source: 'gps' | 'registration' | 'default'): string {
    switch (source) {
      case 'gps':
        return 'Based on your current location';
      case 'registration':
        return 'Based on your registered location';
      case 'default':
        return 'Default location (Malawi)';
      default:
        return 'Unknown source';
    }
  }

  /**
   * Check if location has changed (for notifications)
   */
  static hasLocationChanged(
    oldLocation: LocationInfo,
    newLocation: LocationInfo
  ): boolean {
    return oldLocation.country !== newLocation.country || 
           oldLocation.currency !== newLocation.currency;
  }
} 