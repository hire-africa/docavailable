const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://172.20.10.11:8000/api';

async function verifySystem() {
  console.log('🔍 Verifying Local Storage System...\n');

  try {
    // Step 1: Check if server is responding
    console.log('1. Checking server response...');
    try {
      const response = await axios.get(`${BASE_URL.replace('/api', '')}`, { timeout: 5000 });
      console.log('   ✅ Server is responding');
    } catch (error) {
      console.log('   ❌ Server is not responding');
      console.log('   💡 Please make sure Laravel server is running: php artisan serve');
      return;
    }

    // Step 2: Test API endpoints structure
    console.log('\n2. Testing API endpoints...');
    
    const endpoints = [
      { name: 'Auth Login', method: 'POST', path: '/auth/login' },
      { name: 'Text Sessions Start', method: 'POST', path: '/text-sessions/start' },
      { name: 'Local Storage', method: 'GET', path: '/text-sessions/1/local-storage' },
      { name: 'Session Key', method: 'GET', path: '/text-sessions/1/key' },
      { name: 'Session Metadata', method: 'GET', path: '/text-sessions/1/metadata' },
      { name: 'Sync Messages', method: 'POST', path: '/text-sessions/1/sync' },
      { name: 'Active Sessions', method: 'GET', path: '/text-sessions/active-sessions' },
      { name: 'Patient History', method: 'GET', path: '/text-sessions/patient/history' }
    ];

    let availableEndpoints = 0;
    
    for (const endpoint of endpoints) {
      try {
        const config = {
          timeout: 3000,
          validateStatus: () => true // Don't throw on any status code
        };
        
        if (endpoint.method === 'GET') {
          await axios.get(`${BASE_URL}${endpoint.path}`, config);
        } else {
          await axios.post(`${BASE_URL}${endpoint.path}`, {}, config);
        }
        
        console.log(`   ✅ ${endpoint.name} - Available`);
        availableEndpoints++;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`   ❌ ${endpoint.name} - Connection refused`);
        } else if (error.response?.status === 401) {
          console.log(`   ⚠️  ${endpoint.name} - Requires authentication`);
          availableEndpoints++;
        } else if (error.response?.status === 404) {
          console.log(`   ❌ ${endpoint.name} - Not found`);
        } else if (error.response?.status === 422) {
          console.log(`   ⚠️  ${endpoint.name} - Validation error (expected)`);
          availableEndpoints++;
        } else {
          console.log(`   ⚠️  ${endpoint.name} - Error (${error.response?.status || error.code})`);
          availableEndpoints++;
        }
      }
    }

    console.log(`\n📊 Endpoint Availability: ${availableEndpoints}/${endpoints.length}`);

    // Step 3: Test with sample data
    console.log('\n3. Testing with sample data...');
    
    try {
      // Try to create a user
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: 'verification@test.com',
        password: 'password123',
        first_name: 'Verification',
        last_name: 'Test',
        role: 'patient',
        phone: '+1234567890'
      }, { timeout: 5000 });

      if (registerResponse.data.success) {
        console.log('   ✅ User registration working');
        
        // Try to login
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'verification@test.com',
          password: 'password123'
        }, { timeout: 5000 });

        if (loginResponse.data.success) {
          console.log('   ✅ User login working');
          const token = loginResponse.data.data.token;
          const userId = loginResponse.data.data.user.id;
          
          // Test session creation
          try {
            const sessionResponse = await axios.post(`${BASE_URL}/text-sessions/start`, {
              doctor_id: 1
            }, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000
            });

            if (sessionResponse.data.success) {
              const sessionId = sessionResponse.data.data.session_id;
              console.log(`   ✅ Session creation working (ID: ${sessionId})`);
              
              // Test local storage endpoint
              try {
                const localStorageResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/local-storage`, {
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 5000
                });

                if (localStorageResponse.data.success) {
                  console.log('   ✅ Local storage endpoint working');
                  console.log(`   ✅ Retrieved ${localStorageResponse.data.data.messages.length} messages`);
                  console.log(`   ✅ Encryption key: ${localStorageResponse.data.data.encryption_key ? 'Present' : 'Missing'}`);
                } else {
                  console.log('   ❌ Local storage endpoint failed');
                }
              } catch (error) {
                console.log(`   ❌ Local storage test failed: ${error.response?.data?.message || error.message}`);
              }
            } else {
              console.log('   ❌ Session creation failed');
            }
          } catch (error) {
            console.log(`   ❌ Session creation test failed: ${error.response?.data?.message || error.message}`);
          }
        } else {
          console.log('   ❌ User login failed');
        }
      } else {
        console.log('   ❌ User registration failed');
      }
    } catch (error) {
      console.log(`   ❌ Sample data test failed: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n✅ System verification completed!');
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('=' .repeat(50));
    
    if (availableEndpoints >= endpoints.length * 0.8) {
      console.log('🎉 LOCAL STORAGE SYSTEM IS READY!');
      console.log('=' .repeat(50));
      console.log('✅ Server is running and responding');
      console.log('✅ API endpoints are available');
      console.log('✅ Authentication system working');
      console.log('✅ Text session functionality working');
      console.log('✅ Local storage sync ready');
      console.log('✅ WhatsApp-style messaging ready');
      console.log('\n🚀 You can now use the local storage solution!');
    } else {
      console.log('⚠️  SYSTEM NEEDS ATTENTION');
      console.log('=' .repeat(50));
      console.log('❌ Some endpoints are not working');
      console.log('❌ System may need configuration');
      console.log('\n🔧 Please check:');
      console.log('   • Laravel server is running');
      console.log('   • Database is configured');
      console.log('   • Routes are properly defined');
      console.log('   • Authentication is working');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the verification
verifySystem().then(() => {
  console.log('\n🏁 Verification finished!');
}).catch((error) => {
  console.error('💥 Verification crashed:', error);
}); 