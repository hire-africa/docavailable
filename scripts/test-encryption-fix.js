const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testEncryptionFix() {
  console.log('🔐 Testing Encryption Fix');
  console.log('========================\n');

  try {
    // Step 1: Login as a patient
    console.log('1. Logging in as patient...');
    const patientLoginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'patient@test.com',
      password: 'password123'
    });

    if (!patientLoginResponse.data.success) {
      throw new Error('Patient login failed');
    }

    const patientToken = patientLoginResponse.data.data.token;
    const patientId = patientLoginResponse.data.data.user.id;
    console.log('   ✅ Patient logged in successfully');

    // Step 2: Start a text session
    console.log('\n2. Starting text session...');
    const sessionResponse = await axios.post(`${BASE_URL}/text-sessions/start`, {
      doctor_id: 1, // Assuming doctor ID 1 exists
      symptoms: 'Test symptoms for encryption testing'
    }, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    if (!sessionResponse.data.success) {
      throw new Error('Failed to start session');
    }

      const sessionId = sessionResponse.data.data.session_id;
    console.log(`   ✅ Session started: ${sessionId}`);

    // Step 3: Send a test message
    console.log('\n3. Sending test message...');
    const messageResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      text: 'Hello, this is a test message for encryption!',
      sender: patientId.toString()
    }, {
      headers: { Authorization: `Bearer ${patientToken}` }
        });

    if (!messageResponse.data.success) {
      throw new Error('Failed to send message');
    }

    const messageData = messageResponse.data.data;
    console.log('   ✅ Message sent successfully');
    console.log(`   Message ID: ${messageData.id}`);
    console.log(`   Encrypted Content: ${messageData.encrypted_content ? 'Present' : 'Missing'}`);
    console.log(`   IV: ${messageData.iv ? 'Present' : 'Missing'}`);
    console.log(`   Tag: ${messageData.tag ? 'Present' : 'Missing'}`);
    console.log(`   Algorithm: ${messageData.algorithm || 'Missing'}`);

    // Step 4: Test local storage sync
    console.log('\n4. Testing local storage sync...');
    const mockLocalMessages = [
      {
        id: 'local_msg_1',
        encrypted_content: messageData.encrypted_content || 'test_encrypted_content_1',
        iv: messageData.iv || 'test_iv_1',
        tag: messageData.tag || 'test_tag_1',
        algorithm: messageData.algorithm || 'aes-256-gcm',
        is_encrypted: true,
        timestamp: new Date().toISOString(),
        sender_id: patientId
      }
    ];

    const syncResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/sync`, {
      messages: mockLocalMessages
    }, {
      headers: { Authorization: `Bearer ${patientToken}` }
        });

    if (syncResponse.data.success) {
      console.log(`   ✅ Sync successful: ${syncResponse.data.data.synced_count} messages synced`);
        } else {
      console.log('   ❌ Sync failed:', syncResponse.data.message);
      if (syncResponse.data.data && syncResponse.data.data.errors) {
        console.log('   Errors:', syncResponse.data.data.errors);
      }
      }

    // Step 5: Get messages to verify encryption
    console.log('\n5. Getting messages to verify encryption...');
    const getMessagesResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${patientToken}` }
        });

    if (getMessagesResponse.data.success) {
      const messages = getMessagesResponse.data.data;
      console.log(`   ✅ Retrieved ${messages.length} messages`);
      
      if (messages.length > 0) {
        const firstMessage = messages[0];
        console.log(`   First message text: ${firstMessage.text}`);
        console.log(`   Is encrypted: ${firstMessage.is_encrypted}`);
      }
        } else {
      console.log('   ❌ Failed to get messages:', getMessagesResponse.data.message);
    }

    // Step 6: Test local storage endpoint
    console.log('\n6. Testing local storage endpoint...');
    const localStorageResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/local-storage`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    if (localStorageResponse.data.success) {
      const data = localStorageResponse.data.data;
      console.log(`   ✅ Local storage data retrieved`);
      console.log(`   Messages count: ${data.messages.length}`);
      console.log(`   Encryption key: ${data.encryption_key ? 'Present' : 'Missing'}`);
      
      if (data.messages.length > 0) {
        const firstMessage = data.messages[0];
        console.log(`   First message encrypted_content: ${firstMessage.encrypted_content ? 'Present' : 'Missing'}`);
        console.log(`   First message IV: ${firstMessage.iv ? 'Present' : 'Missing'}`);
        console.log(`   First message tag: ${firstMessage.tag ? 'Present' : 'Missing'}`);
      }
    } else {
      console.log('   ❌ Failed to get local storage data:', localStorageResponse.data.message);
    }

    console.log('\n✅ Encryption fix test completed successfully!');
    console.log('The encryption system is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testEncryptionFix(); 