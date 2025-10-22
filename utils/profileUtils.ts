// Profile completion utilities for onboarding flow

export interface MissingField {
  key: string;
  label: string;
}

// Default values that should be considered as "missing" for onboarding
const DEFAULT_VALUES = {
  country: ['Malawi', 'malawi'],
  city: ['Lilongwe', 'lilongwe'],
  date_of_birth: ['1990-01-01', '1990/01/01'],
  gender: ['other', 'Other'],
  specialization: ['General Medicine', 'general medicine'],
  years_of_experience: [1, '1', 0, '0']
};

// Helper function to check if a value is a default placeholder value
const isDefaultValue = (field: string, value: any): boolean => {
  return DEFAULT_VALUES[field] && DEFAULT_VALUES[field].includes(value);
};

export const getMissingFields = (userData: any): string[] => {
  if (!userData) return ['All profile information'];
  
  const requiredFields = {
    patient: [
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' }
    ],
    doctor: [
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'years_of_experience', label: 'Years of Experience' }
    ],
    admin: [
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' }
    ]
  };
  
  const userType = userData.user_type || 'patient';
  const fields = requiredFields[userType] || requiredFields.patient;
  
  return fields
    .filter(field => {
      const value = userData[field.key];
      // Check if field is empty or has a default value
      return !value || 
             value === '' || 
             isDefaultValue(field.key, value);
    })
    .map(field => field.label);
};

export const isProfileComplete = (userData: any): boolean => {
  return getMissingFields(userData).length === 0;
};

export const getProfileCompletionPercentage = (userData: any): number => {
  if (!userData) return 0;
  
  const requiredFields = {
    patient: ['country', 'city', 'date_of_birth', 'gender'],
    doctor: ['country', 'city', 'specialization', 'years_of_experience'],
    admin: ['country', 'city']
  };
  
  const userType = userData.user_type || 'patient';
  const fields = requiredFields[userType] || requiredFields.patient;
  
  const completedFields = fields.filter(field => {
    const value = userData[field];
    // Check if field has a real value (not empty and not default)
    return value && 
           value !== '' && 
           !isDefaultValue(field, value);
  }).length;
  
  return Math.round((completedFields / fields.length) * 100);
};

export const getOnboardingMessage = (userType: string): string => {
  switch (userType) {
    case 'doctor':
      return "Complete your profile to start receiving patient requests and become visible in the discover page.";
    case 'patient':
      return "Complete your profile to access subscription plans and book appointments.";
    case 'admin':
      return "Complete your profile to access all admin features.";
    default:
      return "Complete your profile to access all features.";
  }
};
