// Google OAuth Configuration for DocAvailable
// This file contains Google OAuth settings and error handling

import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const GOOGLE_OAUTH_CONFIG = {
  // Google OAuth Client ID (Web application)
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || Constants.expoConfig?.extra?.googleClientId || '449082896435-ge0pijdnl6j3e0c9jjclnl7tglmh45ml.apps.googleusercontent.com',
  
  // Google OAuth Client Secret (for server-side token exchange)
  clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || Constants.expoConfig?.extra?.googleClientSecret || '',
  
  // Dynamic redirect URI for OAuth flow (production-ready)
  get redirectUri() {
    // Use custom URL scheme for mobile apps to stay within the app
    if (Platform.OS === 'web') {
      // For web platform, use the web domain
      return 'https://docavailable-3vbdv.ondigitalocean.app/api/oauth/callback';
    } else {
      // For mobile platforms, use custom scheme to stay in app
      return AuthSession.makeRedirectUri({
        scheme: Platform.OS === 'ios' ? 'com.docavailable.minimal' : 'com.docavailable.app',
        path: 'oauth2redirect'
      });
    }
  },
  
  // Scopes for Google OAuth
  scopes: [
    'openid',
    'profile',
    'email'
  ],
  
  // Additional parameters
  additionalParameters: {},
  
  // Custom URL schemes for both platforms
  customUrlScheme: Platform.OS === 'ios' ? 'com.docavailable.minimal' : 'com.docavailable.app'
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
  USER_INFO_FAILED: 'Failed to fetch user information from Google',
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
    clientSecret: GOOGLE_OAUTH_CONFIG.clientSecret,
    redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
    scopes: GOOGLE_OAUTH_CONFIG.scopes,
    additionalParameters: GOOGLE_OAUTH_CONFIG.additionalParameters,
    customUrlScheme: GOOGLE_OAUTH_CONFIG.customUrlScheme
  };
};

// Helper function to get discovery configuration for AuthSession
export const getGoogleOAuthDiscovery = () => {
  return {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
  };
};

export default {
  GOOGLE_OAUTH_CONFIG,
  GOOGLE_API_ENDPOINTS,
  GOOGLE_AUTH_ERRORS,
  isGoogleOAuthConfigured,
  getGoogleOAuthConfig
};