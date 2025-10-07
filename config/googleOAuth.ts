// Google OAuth Configuration for DocAvailable
// This file contains Google OAuth settings and error handling

export const GOOGLE_OAUTH_CONFIG = {
  // Google OAuth Client ID
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  
  // Redirect URI for OAuth flow
  redirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'https://auth.expo.io/@your-expo-username/docavailable',
  
  // Scopes for Google OAuth
  scopes: [
    'openid',
    'profile',
    'email'
  ],
  
  // Additional parameters
  additionalParameters: {},
  
  // Custom URL scheme
  customUrlScheme: 'com.docavailable.app'
};

export const GOOGLE_API_ENDPOINTS = {
  // Google OAuth endpoints
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
  
  // Revoke token endpoint
  revoke: 'https://oauth2.googleapis.com/revoke'
};

export const GOOGLE_AUTH_ERRORS = {
  // Common OAuth error codes
  ACCESS_DENIED: 'access_denied',
  INVALID_REQUEST: 'invalid_request',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  INVALID_SCOPE: 'invalid_scope',
  
  // Custom error messages
  USER_CANCELLED: 'User cancelled the authentication flow',
  NETWORK_ERROR: 'Network error occurred during authentication',
  CONFIGURATION_ERROR: 'OAuth configuration is missing or invalid',
  TOKEN_EXPIRED: 'Authentication token has expired',
  UNKNOWN_ERROR: 'An unknown error occurred during authentication'
};

// Helper function to check if OAuth is properly configured
export const isGoogleOAuthConfigured = (): boolean => {
  return !!(GOOGLE_OAUTH_CONFIG.clientId && GOOGLE_OAUTH_CONFIG.redirectUri);
};

// Helper function to get OAuth configuration for AuthSession
export const getGoogleOAuthConfig = () => {
  if (!isGoogleOAuthConfigured()) {
    throw new Error(GOOGLE_AUTH_ERRORS.CONFIGURATION_ERROR);
  }
  
  return {
    clientId: GOOGLE_OAUTH_CONFIG.clientId,
    redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
    scopes: GOOGLE_OAUTH_CONFIG.scopes,
    additionalParameters: GOOGLE_OAUTH_CONFIG.additionalParameters,
    customUrlScheme: GOOGLE_OAUTH_CONFIG.customUrlScheme
  };
};

export default {
  GOOGLE_OAUTH_CONFIG,
  GOOGLE_API_ENDPOINTS,
  GOOGLE_AUTH_ERRORS,
  isGoogleOAuthConfigured,
  getGoogleOAuthConfig
};