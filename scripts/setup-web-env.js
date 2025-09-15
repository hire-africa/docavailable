#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🌐 DocAvailable Web Environment Setup');
console.log('=====================================');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file found');
  
  // Read current .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if it's using local IP
  if (envContent.includes('172.20.10.11:8000')) {
    console.log('⚠️  Current configuration uses local IP (172.20.10.11:8000)');
    console.log('   This will not work for web deployment.');
    console.log('');
    console.log('🔧 To fix web login issues, update your .env file:');
    console.log('');
    console.log('For localhost web development:');
    console.log('EXPO_PUBLIC_API_BASE_URL=http://localhost:8000');
    console.log('EXPO_PUBLIC_LARAVEL_API_URL=http://localhost:8000');
    console.log('');
    console.log('For production web deployment:');
    console.log('EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com');
    console.log('EXPO_PUBLIC_LARAVEL_API_URL=https://your-backend-domain.com');
    console.log('');
    console.log('📝 Make sure your backend is accessible from the web browser!');
  } else {
    console.log('✅ Environment appears to be configured for web access');
  }
} else {
  console.log('❌ No .env file found');
  console.log('');
  console.log('📝 Create a .env file in the root directory with:');
  console.log('');
  console.log('For localhost web development:');
  console.log('EXPO_PUBLIC_API_BASE_URL=http://localhost:8000');
  console.log('EXPO_PUBLIC_LARAVEL_API_URL=http://localhost:8000');
  console.log('');
  console.log('For production web deployment:');
  console.log('EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com');
  console.log('EXPO_PUBLIC_LARAVEL_API_URL=https://your-backend-domain.com');
}

console.log('');
console.log('🚀 Quick fixes for web login issues:');
console.log('1. Make sure your backend is running on a publicly accessible URL');
console.log('2. Update .env file with the correct backend URL');
console.log('3. Restart your development server');
console.log('4. Clear browser cache and try logging in again');
console.log('');
console.log('💡 For local development, you can use:');
console.log('   - localhost:8000 (if backend is on same machine)');
console.log('   - ngrok (to expose local backend to web)');
console.log('   - Your actual domain (for production)'); 