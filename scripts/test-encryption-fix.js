const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://172.20.10.11:8000/api';

async function testEncryptionFix() {
  console.log('🧪 Testing Encryption Fix for Text Sessions...\n');

  try {
    // Step 1: Login as a test user
    console.log('1. Logging in as test user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const authToken = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log('   ✓ Login successful');

    // Step 2: Check encryption status
    console.log('\n2. Checking encryption status...');
    const statusResponse = await axios.get(`${BASE_URL}/encryption/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (statusResponse.data.success) {
      console.log('   ✓ Encryption status retrieved');
    } else {
      console.log('   ⚠️ Failed to get encryption status');
    }

    // Step 3: Create a test text session
    console.log('\n3. Creating test text session...');
    const sessionResponse = await axios.post(`${BASE_URL}/text-sessions/start`, {
      doctor_id: 2 // Assuming doctor ID 2 exists
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (sessionResponse.data.success) {
      const sessionId = sessionResponse.data.data.session_id;
      console.log(`   ✓ Text session created: ${sessionId}`);

      // Step 4: Test encryption status with session ID
      console.log('\n4. Testing encryption status with session ID...');
      try {
        const encryptionStatusResponse = await axios.get(`${BASE_URL}/encryption/rooms/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (encryptionStatusResponse.data.success) {
          console.log('   ✓ Encryption status retrieved successfully');
          console.log(`   ✓ Room ID: ${encryptionStatusResponse.data.data.room_id}`);
          console.log(`   ✓ Encryption enabled: ${encryptionStatusResponse.data.data.encryption_enabled}`);
        } else {
          console.log('   ✗ Failed to get encryption status');
        }
      } catch (error) {
        console.log('   ✗ Error getting encryption status:', error.response?.data?.message || error.message);
      }

      // Step 5: Test getting room key
      console.log('\n5. Testing room key retrieval...');
      try {
        const keyResponse = await axios.get(`${BASE_URL}/encryption/rooms/${sessionId}/key`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (keyResponse.data.success) {
          console.log('   ✓ Room key retrieved successfully');
          console.log(`   ✓ Room ID: ${keyResponse.data.data.room_id}`);
          console.log(`   ✓ Key length: ${keyResponse.data.data.encryption_key.length} characters`);
        } else {
          console.log('   ✗ Failed to get room key');
        }
      } catch (error) {
        console.log('   ✗ Error getting room key:', error.response?.data?.message || error.message);
      }

      // Step 6: Test enabling encryption
      console.log('\n6. Testing enable encryption...');
      try {
        const enableResponse = await axios.post(`${BASE_URL}/encryption/rooms/${sessionId}/enable`, {}, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (enableResponse.data.success) {
          console.log('   ✓ Room encryption enabled successfully');
          console.log(`   ✓ Room ID: ${enableResponse.data.data.room_id}`);
        } else {
          console.log('   ✗ Failed to enable room encryption');
        }
      } catch (error) {
        console.log('   ✗ Error enabling encryption:', error.response?.data?.message || error.message);
      }

    } else {
      console.log('   ✗ Failed to create text session');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testEncryptionFix().then(() => {
  console.log('\n✅ Test completed');
}).catch((error) => {
  console.error('❌ Test failed:', error);
}); 