// Environment configuration for React Native app
import Constants from 'expo-constants';

// Get environment variables from Expo Constants
const getEnvVar = (key: string, fallback?: string): string => {
  // Try multiple sources for environment variables
  const value = 
    Constants.expoConfig?.extra?.[key] ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_?.[key] ||
    process.env[key] ||
    fallback;
  
  console.log(`🔧 Environment: ${key} = ${value}`);
  return value || '';
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://172.20.10.11:8000'),
  LARAVEL_API_URL: getEnvVar('EXPO_PUBLIC_LARAVEL_API_URL', 'http://172.20.10.11:8000'),
};

// App Configuration
export const APP_CONFIG = {
  NAME: getEnvVar('EXPO_PUBLIC_APP_NAME', 'DocAvailable'),
  VERSION: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
  EXPO_PROJECT_ID: getEnvVar('EXPO_PUBLIC_EXPO_PROJECT_ID', ''),
};

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  PUSHER_KEY: getEnvVar('EXPO_PUBLIC_PUSHER_KEY', '8e5b63f52953aeb1fbc5'),
  PUSHER_CLUSTER: getEnvVar('EXPO_PUBLIC_PUSHER_CLUSTER', 'ap2'),
};

// Feature Flags
export const FEATURE_FLAGS = {
  USE_BACKEND_CHAT: getEnvVar('EXPO_PUBLIC_USE_BACKEND_CHAT', 'true') === 'true',
  USE_BACKEND_WALLET: getEnvVar('EXPO_PUBLIC_USE_BACKEND_WALLET', 'true') === 'true',
  USE_BACKEND_NOTIFICATIONS: getEnvVar('EXPO_PUBLIC_USE_BACKEND_NOTIFICATIONS', 'true') === 'true',
  USE_BACKEND_APPOINTMENTS: getEnvVar('EXPO_PUBLIC_USE_BACKEND_APPOINTMENTS', 'true') === 'true',
  BACKEND_ENABLED: getEnvVar('EXPO_PUBLIC_BACKEND_ENABLED', 'true') === 'true',
};

// API Keys
export const API_KEYS = {
  PAYMENT_API_KEY: getEnvVar('PAYMENT_API_KEY', ''),
  SMS_API_KEY: getEnvVar('SMS_API_KEY', ''),
  EMAIL_API_KEY: getEnvVar('EMAIL_API_KEY', ''),
};

// Debug logging
console.log('🔧 Environment Configuration Loaded:', {
  API_CONFIG,
  APP_CONFIG,
  WEBSOCKET_CONFIG,
  FEATURE_FLAGS,
}); 