// App Auth Configuration for DocAvailable
// This file contains react-native-app-auth settings for in-app OAuth

import { Platform } from 'react-native';

export const APP_AUTH_CONFIG = {
  // Google OAuth configuration for react-native-app-auth
  issuer: 'https://accounts.google.com',
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com',
  redirectUrl: Platform.OS === 'ios' 
    ? 'com.docavailable.minimal://oauth2redirect' 
    : 'com.docavailable.app://oauth2redirect',
  scopes: ['openid', 'profile', 'email'],
  additionalParameters: {},
  customUrlScheme: Platform.OS === 'ios' ? 'com.docavailable.minimal' : 'com.docavailable.app',
};

// Helper function to check if app auth is properly configured
export const isAppAuthConfigured = (): boolean => {
  return !!(APP_AUTH_CONFIG.clientId && APP_AUTH_CONFIG.redirectUrl);
};

export default {
  APP_AUTH_CONFIG,
  isAppAuthConfigured
};
