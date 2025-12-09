const axios = require('axios');

// Configuration
const BASE_URL = 'http://172.20.10.11:8000'; // Update this to your backend URL
const API_URL = `${BASE_URL}/api`;

// Test credentials (update these with real credentials)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testJWTRefresh() {
  console.log('🧪 Testing JWT Refresh Functionality\n');

  try {
    // Step 1: Login to get initial token
    console.log('1️⃣ Logging in to get initial token...');
    const loginResponse = await axios.post(`${API_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    const initialToken = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('📝 Initial token received\n');

    // Step 2: Test protected endpoint with initial token
    console.log('2️⃣ Testing protected endpoint with initial token...');
    const userResponse = await axios.get(`${API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${initialToken}`
      }
    });

    if (userResponse.data.success) {
      console.log('✅ Protected endpoint accessible with initial token');
      console.log(`👤 User: ${userResponse.data.data.display_name}\n`);
    }

    // Step 3: Test token refresh
    console.log('3️⃣ Testing token refresh...');
    const refreshResponse = await axios.post(`${API_URL}/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${initialToken}`
      }
    });

    if (refreshResponse.data.success) {
      const newToken = refreshResponse.data.data.token;
      console.log('✅ Token refresh successful');
      console.log('🔄 New token received\n');

      // Step 4: Test protected endpoint with refreshed token
      console.log('4️⃣ Testing protected endpoint with refreshed token...');
      const refreshedUserResponse = await axios.get(`${API_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${newToken}`
        }
      });

      if (refreshedUserResponse.data.success) {
        console.log('✅ Protected endpoint accessible with refreshed token');
        console.log(`👤 User: ${refreshedUserResponse.data.data.display_name}\n`);
      }

      // Step 5: Verify tokens are different
      if (initialToken !== newToken) {
        console.log('✅ Tokens are different (refresh working correctly)');
      } else {
        console.log('⚠️  Tokens are the same (might be an issue)');
      }

    } else {
      throw new Error('Token refresh failed: ' + refreshResponse.data.message);
    }

    console.log('🎉 All JWT refresh tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
testJWTRefresh(); 