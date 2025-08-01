// Placeholder location service
export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

export const LocationService = {
  // Placeholder methods
  getCurrentLocation: async (): Promise<LocationInfo> => {
    return {
      latitude: 0,
      longitude: 0,
      address: '',
      city: '',
      country: ''
    };
  },
  
  requestLocationPermission: async (): Promise<boolean> => {
    return true;
  },
  
  getLocationPermissionStatus: async (): Promise<string> => {
    return 'granted';
  },

  // Add missing methods for plan filtering
  getLocationInfo: (country: string) => {
    const locationData: { [key: string]: any } = {
      'Malawi': {
        country: 'Malawi',
        currency: 'MWK',
        timezone: 'Africa/Blantyre'
      },
      'Zambia': {
        country: 'Zambia', 
        currency: 'ZMW',
        timezone: 'Africa/Lusaka'
      },
      'Zimbabwe': {
        country: 'Zimbabwe',
        currency: 'USD',
        timezone: 'Africa/Harare'
      },
      'Tanzania': {
        country: 'Tanzania',
        currency: 'TZS', 
        timezone: 'Africa/Dar_es_Salaam'
      },
      'Kenya': {
        country: 'Kenya',
        currency: 'KES',
        timezone: 'Africa/Nairobi'
      },
      'Uganda': {
        country: 'Uganda',
        currency: 'UGX',
        timezone: 'Africa/Kampala'
      },
      'Ghana': {
        country: 'Ghana',
        currency: 'GHS',
        timezone: 'Africa/Accra'
      },
      'Nigeria': {
        country: 'Nigeria',
        currency: 'NGN',
        timezone: 'Africa/Lagos'
      },
      'South Africa': {
        country: 'South Africa',
        currency: 'ZAR',
        timezone: 'Africa/Johannesburg'
      },
      'Botswana': {
        country: 'Botswana',
        currency: 'BWP',
        timezone: 'Africa/Gaborone'
      },
      'Namibia': {
        country: 'Namibia',
        currency: 'NAD',
        timezone: 'Africa/Windhoek'
      },
      'Mozambique': {
        country: 'Mozambique',
        currency: 'MZN',
        timezone: 'Africa/Maputo'
      },
      'Zambia': {
        country: 'Zambia',
        currency: 'ZMW',
        timezone: 'Africa/Lusaka'
      }
    };
    
    return locationData[country] || locationData['Malawi'];
  },

  getCurrencyForCountry: (country: string) => {
    const locationInfo = LocationService.getLocationInfo(country);
    return locationInfo.currency;
  },

  formatCurrency: (amount: number, currency: string) => {
    const formatters: { [key: string]: Intl.NumberFormat } = {
      'MWK': new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK' }),
      'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'ZMW': new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }),
      'TZS': new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }),
      'KES': new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }),
      'UGX': new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' }),
      'GHS': new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }),
      'NGN': new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }),
      'ZAR': new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }),
      'BWP': new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP' }),
      'NAD': new Intl.NumberFormat('en-NA', { style: 'currency', currency: 'NAD' }),
      'MZN': new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
    };

    const formatter = formatters[currency];
    if (formatter) {
      return formatter.format(amount);
    }
    
    // Fallback for unsupported currencies
    return `${currency} ${amount.toLocaleString()}`;
  },

  // Add missing method that the app is calling
  getLocationSourceDescription: () => {
    return 'Registration Location';
  },

  // Add missing getCurrencySymbol method
  getCurrencySymbol: (currency: string) => {
    switch (currency) {
      case 'MWK':
        return 'mk';
      case 'USD':
        return '$';
      case 'ZMW':
        return 'ZK';
      case 'TZS':
        return 'TSh';
      case 'KES':
        return 'KSh';
      case 'UGX':
        return 'USh';
      case 'GHS':
        return 'GH₵';
      case 'NGN':
        return '₦';
      case 'ZAR':
        return 'R';
      case 'BWP':
        return 'P';
      case 'NAD':
        return 'N$';
      case 'MZN':
        return 'MT';
      default:
        return currency;
    }
  }
}; 