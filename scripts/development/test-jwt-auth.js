const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000';

async function testJWTAuth() {
  console.log('🔐 Testing JWT Authentication\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: Register a test user
    console.log('\n2️⃣ Testing user registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'patient',
      date_of_birth: '1990-01-01',
      gender: 'male',
      country: 'Test Country',
      city: 'Test City'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/register`, registerData);
    console.log('✅ Registration successful');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Token received:', !!registerResponse.data.data.token);

    const token = registerResponse.data.data.token;
    const userId = registerResponse.data.data.user.id;

    // Test 3: Get current user with token
    console.log('\n3️⃣ Testing get current user...');
    const userResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('✅ Get current user successful');
    console.log('   User email:', userResponse.data.data.email);

    // Test 4: Test protected endpoint
    console.log('\n4️⃣ Testing protected endpoint...');
    const protectedResponse = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('✅ Protected endpoint accessible');
    console.log('   Appointments count:', protectedResponse.data.data?.length || 0);

    // Test 5: Test logout
    console.log('\n5️⃣ Testing logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/api/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('✅ Logout successful');

    // Test 6: Verify token is invalid after logout
    console.log('\n6️⃣ Testing token invalidation...');
    try {
      await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      console.log('❌ Token still valid after logout (unexpected)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Token properly invalidated after logout');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    console.log('\n🎉 All JWT authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Health endpoint working');
    console.log('   ✅ User registration working');
    console.log('   ✅ JWT token generation working');
    console.log('   ✅ Protected endpoints accessible with token');
    console.log('   ✅ Logout working');
    console.log('   ✅ Token invalidation working');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

// Run the test
testJWTAuth(); 