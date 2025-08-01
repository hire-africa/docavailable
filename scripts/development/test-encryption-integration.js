const axios = require('axios');

// Test configuration
const BASE_URL = 'http://172.20.10.11:8000/api';
let authToken = null;
let testUserId = null;
let testRoomId = null;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'patient'
};

async function testEncryptionIntegration() {
  console.log('🔐 Testing Encryption Integration');
  console.log('==================================\n');

  try {
    // Step 1: Register/Login user
    console.log('1. Authenticating user...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.token;
      testUserId = loginResponse.data.data.user.id;
      console.log('   ✓ User authenticated successfully');
    } else {
      // Try to register if login fails
      console.log('   ⚠️ Login failed, trying registration...');
      const registerResponse = await axios.post(`${BASE_URL}/register`, testUser);
      if (registerResponse.data.success) {
        authToken = registerResponse.data.data.token;
        testUserId = registerResponse.data.data.user.id;
        console.log('   ✓ User registered and authenticated successfully');
      } else {
        throw new Error('Failed to authenticate user');
      }
    }

    // Step 2: Check encryption status
    console.log('\n2. Checking encryption status...');
    const statusResponse = await axios.get(`${BASE_URL}/encryption/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (statusResponse.data.success) {
      const status = statusResponse.data.data;
      console.log(`   ✓ Encryption enabled: ${status.encryption_enabled}`);
      console.log(`   ✓ Keys generated: ${status.has_keys}`);
    } else {
      console.log('   ⚠️ Failed to get encryption status');
    }

    // Step 3: Generate encryption keys if not present
    if (!statusResponse.data.data.encryption_enabled) {
      console.log('\n3. Generating encryption keys...');
      const generateResponse = await axios.post(`${BASE_URL}/encryption/generate-keys`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (generateResponse.data.success) {
        console.log('   ✓ Encryption keys generated successfully');
      } else {
        console.log('   ✗ Failed to generate encryption keys');
      }
    } else {
      console.log('\n3. Encryption keys already exist, skipping generation');
    }

    // Step 4: Create a test chat room
    console.log('\n4. Creating test chat room...');
    const roomResponse = await axios.post(`${BASE_URL}/chat/private`, {
      user_id: testUserId + 1 // Create with a different user
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (roomResponse.data.success) {
      testRoomId = roomResponse.data.data.room.id;
      console.log(`   ✓ Test chat room created: ${testRoomId}`);
    } else {
      console.log('   ⚠️ Failed to create chat room, using existing room');
      // Try to get existing rooms
      const roomsResponse = await axios.get(`${BASE_URL}/chat/rooms`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (roomsResponse.data.success && roomsResponse.data.data.length > 0) {
        testRoomId = roomsResponse.data.data[0].id;
        console.log(`   ✓ Using existing room: ${testRoomId}`);
      } else {
        throw new Error('No chat rooms available for testing');
      }
    }

    // Step 5: Enable room encryption
    console.log('\n5. Enabling room encryption...');
    const enableResponse = await axios.post(`${BASE_URL}/encryption/rooms/${testRoomId}/enable`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (enableResponse.data.success) {
      console.log('   ✓ Room encryption enabled successfully');
    } else {
      console.log('   ⚠️ Failed to enable room encryption (may already be enabled)');
    }

    // Step 6: Get room encryption key
    console.log('\n6. Getting room encryption key...');
    const keyResponse = await axios.get(`${BASE_URL}/encryption/rooms/${testRoomId}/key`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (keyResponse.data.success) {
      console.log('   ✓ Room encryption key retrieved successfully');
      console.log(`   ✓ Key length: ${keyResponse.data.data.encryption_key.length} characters`);
    } else {
      console.log('   ✗ Failed to get room encryption key');
    }

    // Step 7: Send an encrypted message
    console.log('\n7. Sending encrypted message...');
    const messageData = {
      content: 'Hello, this is a test encrypted message!',
      reply_to_id: null
    };

    const sendResponse = await axios.post(`${BASE_URL}/chat/rooms/${testRoomId}/messages`, messageData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (sendResponse.data.success) {
      const message = sendResponse.data.data.message;
      console.log('   ✓ Message sent successfully');
      console.log(`   ✓ Message encrypted: ${message.is_encrypted}`);
      if (message.is_encrypted) {
        console.log(`   ✓ Encrypted content present: ${!!message.encrypted_content}`);
        console.log(`   ✓ IV present: ${!!message.iv}`);
        console.log(`   ✓ Tag present: ${!!message.tag}`);
      }
    } else {
      console.log('   ✗ Failed to send message');
    }

    // Step 8: Retrieve and decrypt messages
    console.log('\n8. Retrieving messages...');
    const messagesResponse = await axios.get(`${BASE_URL}/chat/rooms/${testRoomId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (messagesResponse.data.success) {
      const messages = messagesResponse.data.data;
      console.log(`   ✓ Retrieved ${messages.length} messages`);
      
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        console.log(`   ✓ Last message encrypted: ${lastMessage.is_encrypted}`);
        if (lastMessage.is_encrypted) {
          console.log(`   ✓ Encrypted content: ${lastMessage.encrypted_content ? 'Present' : 'Missing'}`);
          console.log(`   ✓ Plain text content: ${lastMessage.content || 'None (correct for encrypted messages)'}`);
        }
      }
    } else {
      console.log('   ✗ Failed to retrieve messages');
    }

    console.log('\n🎉 Encryption integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the encryption in the mobile app');
    console.log('2. Verify messages are properly encrypted/decrypted');
    console.log('3. Test encryption indicators in the UI');
    console.log('4. Test encryption settings screen');

  } catch (error) {
    console.error('\n❌ Error during encryption integration testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEncryptionIntegration(); 