// Profile completion utilities for onboarding flow

export interface MissingField {
  key: string;
  label: string;
}

// Default values that should be considered as "missing" for onboarding
// Note: We're being more conservative here to avoid false positives
// Only treat values as defaults if they're clearly placeholder values
const DEFAULT_VALUES = {
  country: [], // Don't treat any country as default - user might actually be from Malawi
  city: [], // Don't treat any city as default - user might actually be from Lilongwe
  date_of_birth: ['1990-01-01', '1990/01/01'], // Only treat specific default dates as missing
  gender: ['other', 'Other'], // Only treat 'other' as default gender
  specialization: ['General Medicine', 'general medicine'],
  years_of_experience: [1, '1', 0, '0']
};

// Helper function to check if a value is a default placeholder value
const isDefaultValue = (field: string, value: any): boolean => {
  return DEFAULT_VALUES[field] && DEFAULT_VALUES[field].includes(value);
};

export const getMissingFields = (userData: any): string[] => {
  if (!userData) return ['All profile information'];
  
  // Debug logging to see what userData contains
  console.log('🔍 [ProfileUtils] Checking userData:', {
    userType: userData.user_type,
    country: userData.country,
    city: userData.city,
    date_of_birth: userData.date_of_birth,
    gender: userData.gender,
    specialization: userData.specialization,
    specializations: userData.specializations,
    years_of_experience: userData.years_of_experience,
    bio: userData.bio,
    professional_bio: userData.professional_bio,
    languages_spoken: userData.languages_spoken,
    fullUserData: userData
  });
  
  const requiredFields = {
    patient: [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'bio', label: 'Bio' }
    ],
    doctor: [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'specializations', label: 'Specializations' },
      { key: 'years_of_experience', label: 'Years of Experience' },
      { key: 'bio', label: 'Professional Bio' },
      { key: 'languages_spoken', label: 'Languages Spoken' }
    ],
    admin: [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' }
    ]
  };
  
  const userType = userData.user_type || 'patient';
  const fields = requiredFields[userType] || requiredFields.patient;
  
  const missingFields = fields
    .filter(field => {
      const value = userData[field.key];
      let isEmpty = !value || value === '';
      let isDefault = isDefaultValue(field.key, value);
      
      // Special handling for array fields
      if (field.key === 'specializations') {
        // Check both new array format and old single field format
        const hasSpecializations = Array.isArray(value) && value.length > 0;
        const hasOldSpecialization = userData.specialization && userData.specialization.trim() !== '';
        isEmpty = !hasSpecializations && !hasOldSpecialization;
        isDefault = false; // Don't treat arrays as defaults
      } else if (field.key === 'languages_spoken') {
        // Handle case where languages_spoken might be null, undefined, or not present
        const hasLanguages = Array.isArray(value) && value.length > 0;
        const hasLanguagesString = typeof value === 'string' && value.trim() !== '';
        isEmpty = !hasLanguages && !hasLanguagesString;
        isDefault = false; // Don't treat arrays as defaults
      }
      
      const isMissing = isEmpty || isDefault;
      
      console.log(`🔍 [ProfileUtils] Field ${field.key}:`, {
        value,
        isEmpty,
        isDefault,
        isMissing
      });
      
      return isMissing;
    })
    .map(field => field.label);
    
  console.log('🔍 [ProfileUtils] Missing fields:', missingFields);
  
  return missingFields;
};

export const isProfileComplete = (userData: any): boolean => {
  return getMissingFields(userData).length === 0;
};

export const getProfileCompletionPercentage = (userData: any): number => {
  if (!userData) return 0;
  
  const requiredFields = {
    patient: ['first_name', 'last_name', 'country', 'city', 'date_of_birth', 'gender', 'bio'],
    doctor: ['first_name', 'last_name', 'country', 'city', 'date_of_birth', 'gender', 'specializations', 'years_of_experience', 'bio', 'languages_spoken'],
    admin: ['first_name', 'last_name', 'country', 'city']
  };
  
  const userType = userData.user_type || 'patient';
  const fields = requiredFields[userType] || requiredFields.patient;
  
  const completedFields = fields.filter(field => {
    const value = userData[field];
    
    // Special handling for array fields
    if (field === 'specializations') {
      // Check both new array format and old single field format
      const hasSpecializations = Array.isArray(value) && value.length > 0;
      const hasOldSpecialization = userData.specialization && userData.specialization.trim() !== '';
      return hasSpecializations || hasOldSpecialization;
    } else if (field === 'languages_spoken') {
      // Handle case where languages_spoken might be null, undefined, or not present
      const hasLanguages = Array.isArray(value) && value.length > 0;
      const hasLanguagesString = typeof value === 'string' && value.trim() !== '';
      return hasLanguages || hasLanguagesString;
    }
    
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

export const getDoctorActivationMessage = (): string => {
  return "Activate your account by uploading your medical documents to start receiving patient requests.";
};
