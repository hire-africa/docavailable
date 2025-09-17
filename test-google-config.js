// Test Google OAuth Configuration
require('dotenv').config();

console.log('=== Google OAuth Configuration Test ===');
console.log('Environment Variables:');
console.log('EXPO_PUBLIC_GOOGLE_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
console.log('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET);

console.log('\n=== App Config Test ===');
const appConfig = require('./app.config.js');
console.log('App Config Extra:');
console.log('GOOGLE_CLIENT_ID:', appConfig.default.expo.extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', appConfig.default.expo.extra.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET);

console.log('\n=== Expected Values ===');
console.log('Expected Client ID: 584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com');
console.log('Expected Client Secret: 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');
