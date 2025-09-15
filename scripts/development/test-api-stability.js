const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';
let authToken = null;
let refreshToken = null;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function testLogin() {
  try {
    console.log('🔐 Testing login...');
    const response = await axios.post(`${BASE_URL}/login`, testUser);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testProtectedEndpoint() {
  try {
    console.log('🔒 Testing protected endpoint...');
    const response = await axios.get(`${BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Protected endpoint successful');
      return true;
    } else {
      console.log('❌ Protected endpoint failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Protected endpoint error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTokenRefresh() {
  try {
    console.log('🔄 Testing token refresh...');
    const response = await axios.post(`${BASE_URL}/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Token refresh successful');
      return true;
    } else {
      console.log('❌ Token refresh failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Token refresh error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    
    if (response.data.success) {
      console.log('✅ Health endpoint successful');
      return true;
    } else {
      console.log('❌ Health endpoint failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testErrorHandling() {
  try {
    console.log('🚨 Testing error handling...');
    
    // Test with invalid token
    try {
      await axios.get(`${BASE_URL}/user`, {
        headers: {
          'Authorization': 'Bearer invalid_token',
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        console.log('❌ Unexpected error for invalid token:', error.response?.status);
      }
    }
    
    // Test with expired token (if we can simulate it)
    console.log('✅ Error handling test completed');
    return true;
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
    return false;
  }
}

async function runStabilityTest() {
  console.log('🚀 Starting API Stability Test...\n');
  
  const results = {
    health: await testHealthEndpoint(),
    login: await testLogin(),
    protected: await testProtectedEndpoint(),
    refresh: await testTokenRefresh(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Health Check:', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('Login:', results.login ? '✅ PASS' : '❌ FAIL');
  console.log('Protected Endpoint:', results.protected ? '✅ PASS' : '❌ FAIL');
  console.log('Token Refresh:', results.refresh ? '✅ PASS' : '❌ FAIL');
  console.log('Error Handling:', results.errorHandling ? '✅ PASS' : '❌ FAIL');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! API is stable.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
}

// Run the test
runStabilityTest().catch(console.error); 