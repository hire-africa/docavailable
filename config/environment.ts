// Environment configuration for DocAvailable
// This file centralizes all environment variable access

const getEnvVar = (key: string, fallback: string): string => {
  // Check for Expo environment variables first
  const expoVar = process.env[key];
  if (expoVar) {
    return expoVar;
  }

  // Check for React Native environment variables
  const rnVar = process.env[key.replace('EXPO_PUBLIC_', '')];
  if (rnVar) {
    return rnVar;
  }

  // Return fallback
  return fallback;
};

export const environment = {
  // API Configuration
  BASE_URL: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://docavailable-5.onrender.com'),
  LARAVEL_API_URL: getEnvVar('EXPO_PUBLIC_LARAVEL_API_URL', 'https://docavailable-5.onrender.com'),
  
  // App Configuration
  APP_NAME: getEnvVar('EXPO_PUBLIC_APP_NAME', 'DocAvailable'),
  APP_VERSION: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
  
  // Feature Flags
  USE_BACKEND_CHAT: getEnvVar('EXPO_PUBLIC_USE_BACKEND_CHAT', 'true') === 'true',
  USE_BACKEND_WALLET: getEnvVar('EXPO_PUBLIC_USE_BACKEND_WALLET', 'true') === 'true',
  USE_BACKEND_NOTIFICATIONS: getEnvVar('EXPO_PUBLIC_USE_BACKEND_NOTIFICATIONS', 'true') === 'true',
  USE_BACKEND_APPOINTMENTS: getEnvVar('EXPO_PUBLIC_USE_BACKEND_APPOINTMENTS', 'true') === 'true',
  BACKEND_ENABLED: getEnvVar('EXPO_PUBLIC_BACKEND_ENABLED', 'true') === 'true',
  
  // Payment Gateway Configuration
  PAYCHANGU_API_KEY: getEnvVar('PAYCHANGU_API_KEY', ''),
  PAYCHANGU_SECRET_KEY: getEnvVar('PAYCHANGU_SECRET_KEY', ''),
  PAYCHANGU_MERCHANT_ID: getEnvVar('PAYCHANGU_MERCHANT_ID', ''),
  PAYCHANGU_WEBHOOK_SECRET: getEnvVar('PAYCHANGU_WEBHOOK_SECRET', ''),
  PAYCHANGU_ENVIRONMENT: getEnvVar('PAYCHANGU_ENVIRONMENT', 'sandbox'),
  PAYCHANGU_PUBLIC_KEY: getEnvVar('EXPO_PUBLIC_PAYCHANGU_PUBLIC_KEY', ''),
  
  // Other API Keys
  PAYMENT_API_KEY: getEnvVar('PAYMENT_API_KEY', ''),
  SMS_API_KEY: getEnvVar('SMS_API_KEY', ''),
  EMAIL_API_KEY: getEnvVar('EMAIL_API_KEY', ''),
  
  // AI Service Configuration
  DEEPSEEK_API_KEY: getEnvVar('DEEPSEEK_API_KEY', 'sk-3c2cb2ac7a554039a0e8d378fb09ef36'),
};

export default environment; 