// Debug Google OAuth Configuration
console.log('=== Debug Google OAuth ===');

// Simulate the configuration loading
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id_here',
  clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: 'auto',
};

console.log('Configuration:', GOOGLE_OAUTH_CONFIG);

// Test redirect URI logic
const Platform = { OS: 'web' };
const redirectUri = Platform.OS === 'web' 
    ? `http://localhost:3000`  // Simulate window.location.origin
    : 'docavailable://auth';

console.log('Platform:', Platform.OS);
console.log('Redirect URI:', redirectUri);

// Test the OAuth request configuration
const AuthRequestConfig = {
    clientId: GOOGLE_OAUTH_CONFIG.clientId,
    scopes: GOOGLE_OAUTH_CONFIG.scopes,
    redirectUri,
    responseType: 'code',
    extraParams: {
        access_type: 'offline',
    },
};

console.log('Auth Request Config:', AuthRequestConfig);
