import Constants from 'expo-constants';

// Google OAuth Configuration
export const GOOGLE_OAUTH_CONFIG = {
  clientId: Constants.expoConfig?.extra?.googleClientId || 'YOUR_GOOGLE_CLIENT_ID',
  clientSecret: Constants.expoConfig?.extra?.googleClientSecret || 'YOUR_GOOGLE_CLIENT_SECRET',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: 'docavailable://',
  discovery: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  },
};

// Google API endpoints
export const GOOGLE_API_ENDPOINTS = {
  userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
  tokenInfo: 'https://oauth2.googleapis.com/tokeninfo',
};

// Error messages
export const GOOGLE_AUTH_ERRORS = {
  CONFIG_MISSING: 'Google OAuth configuration is missing. Please check your environment variables.',
  CLIENT_ID_MISSING: 'Google Client ID is not configured. Please add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your environment.',
  AUTH_CANCELLED: 'Google sign-in was cancelled by the user.',
  NETWORK_ERROR: 'Network error during Google authentication. Please check your internet connection.',
  TOKEN_EXCHANGE_FAILED: 'Failed to exchange authorization code for access token.',
  USER_INFO_FAILED: 'Failed to fetch user information from Google.',
  INVALID_RESPONSE: 'Invalid response from Google authentication.',
}; 