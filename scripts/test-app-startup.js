const axios = require('axios');

// Environment configuration for testing
const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000',
  LARAVEL_API_URL: process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'http://172.20.10.11:8000',
};

async function testAppStartup() {
  console.log('🚀 Testing app startup components...\n');

  // Test 1: Environment Configuration
  console.log('1️⃣ Testing environment configuration...');
  console.log('API_BASE_URL:', API_CONFIG.BASE_URL);
  console.log('LARAVEL_API_URL:', API_CONFIG.LARAVEL_API_URL);
  
  if (!API_CONFIG.BASE_URL) {
    console.log('❌ Environment variables not loaded properly');
    return false;
  }
  console.log('✅ Environment configuration OK');

  // Test 2: Backend Connectivity
  console.log('\n2️⃣ Testing backend connectivity...');
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/api/health`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log('✅ Backend is responding:', response.data);
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return false;
  }

  // Test 3: Authentication Endpoint
  console.log('\n3️⃣ Testing authentication endpoint...');
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/api/user`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log('✅ Authentication endpoint accessible');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Authentication endpoint working (401 expected without token)');
    } else {
      console.log('❌ Authentication endpoint failed:', error.message);
      return false;
    }
  }

  // Test 4: Database Connectivity (via health check)
  console.log('\n4️⃣ Testing database connectivity...');
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/api/health`, {
      timeout: 5000,
    });
    if (response.data.status === 'ok') {
      console.log('✅ Database connectivity OK');
    } else {
      console.log('❌ Database connectivity failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Database connectivity test failed:', error.message);
    return false;
  }

  console.log('\n🎉 All startup tests passed! App should load successfully.');
  return true;
}

// Run the test
testAppStartup().then(success => {
  if (success) {
    console.log('\n✅ App startup test completed successfully');
    process.exit(0);
  } else {
    console.log('\n❌ App startup test failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Startup test error:', error);
  process.exit(1);
}); 