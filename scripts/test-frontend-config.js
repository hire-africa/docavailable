const axios = require('axios');

// Test the same configuration logic as the frontend
const getEnvVar = (key, fallback) => {
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

const environment = {
  // API Configuration
  BASE_URL: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://docavailable-1.onrender.com'),
  LARAVEL_API_URL: getEnvVar('EXPO_PUBLIC_LARAVEL_API_URL', 'https://docavailable-1.onrender.com'),
};

console.log('🔍 Testing Frontend Configuration...\n');

console.log('Environment Variables:');
console.log('EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL || 'NOT SET');
console.log('EXPO_PUBLIC_LARAVEL_API_URL:', process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'NOT SET');

console.log('\nResolved Configuration:');
console.log('BASE_URL:', environment.BASE_URL);
console.log('LARAVEL_API_URL:', environment.LARAVEL_API_URL);

// Test the same URL construction logic as the frontend
const rawBaseURL = environment.BASE_URL;
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;
const apiURL = `${baseURL}/api`;

console.log('\nURL Construction:');
console.log('rawBaseURL:', rawBaseURL);
console.log('baseURL:', baseURL);
console.log('apiURL:', apiURL);

// Test the endpoints
const endpoints = [
  '/health',
  '/login',
  '/user'
];

console.log('\n🔍 Testing Endpoints...\n');

async function testEndpoints() {
  for (const endpoint of endpoints) {
    const url = `${apiURL}${endpoint}`;
    console.log(`Testing: ${endpoint}`);
    console.log(`URL: ${url}`);
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📋 Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`📄 Content-Type: ${error.response.headers['content-type']}`);
        console.log(`📋 Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('---\n');
  }

  // Test login endpoint specifically
  console.log('🔍 Testing Login Endpoint...\n');
  try {
    const loginResponse = await axios.post(`${apiURL}/login`, {
      email: 'test@test.com',
      password: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Login Success:', loginResponse.status);
    console.log('📋 Response:', JSON.stringify(loginResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Login Error:', error.message);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📋 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testEndpoints().catch(console.error); 