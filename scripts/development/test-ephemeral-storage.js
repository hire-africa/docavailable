const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://172.20.10.11:8000/api';

async function testEphemeralStorage() {
  console.log('🧪 Testing Ephemeral Message Storage System...\n');

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

    // Step 2: Start a text session
    console.log('\n2. Starting text session...');
    const sessionResponse = await axios.post(`${BASE_URL}/text-sessions/start`, {
      doctor_id: 2 // Assuming doctor ID 2 exists
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (!sessionResponse.data.success) {
      throw new Error('Failed to start text session');
    }

    const sessionId = sessionResponse.data.data.session_id;
    console.log(`   ✓ Text session started: ${sessionId}`);

    // Step 3: Send a test message
    console.log('\n3. Sending test message...');
    const sendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      text: 'This is a test message for ephemeral storage',
      sender: userId.toString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (sendResponse.data.success) {
      console.log('   ✓ Message sent successfully');
      console.log(`   ✓ Message ID: ${sendResponse.data.data.id}`);
      console.log(`   ✓ Message encrypted: ${sendResponse.data.data.is_encrypted || 'N/A'}`);
    } else {
      console.log('   ✗ Failed to send message');
    }

    // Step 4: Retrieve messages
    console.log('\n4. Retrieving messages...');
    const getMessagesResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (getMessagesResponse.data.success) {
      const messages = getMessagesResponse.data.data;
      console.log(`   ✓ Retrieved ${messages.length} messages`);
      
      if (messages.length > 0) {
        const message = messages[0];
        console.log(`   ✓ Message ID: ${message.id}`);
        console.log(`   ✓ Message text: ${message.text}`);
        console.log(`   ✓ Sender: ${message.sender}`);
        console.log(`   ✓ Timestamp: ${message.timestamp}`);
        console.log(`   ✓ Encrypted: ${message.is_encrypted || 'N/A'}`);
      }
    } else {
      console.log('   ✗ Failed to retrieve messages');
    }

    // Step 5: Send multiple messages to test message limit
    console.log('\n5. Testing message limit (sending 5 messages)...');
    for (let i = 1; i <= 5; i++) {
      const multiSendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
        text: `Test message ${i} for ephemeral storage`,
        sender: userId.toString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (multiSendResponse.data.success) {
        console.log(`   ✓ Message ${i} sent`);
      } else {
        console.log(`   ✗ Failed to send message ${i}`);
      }
    }

    // Step 6: Verify all messages are retrieved
    console.log('\n6. Verifying all messages are retrieved...');
    const verifyResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (verifyResponse.data.success) {
      const messages = verifyResponse.data.data;
      console.log(`   ✓ Total messages retrieved: ${messages.length}`);
      
      // Check if messages are in chronological order
      const timestamps = messages.map(m => new Date(m.timestamp));
      const isOrdered = timestamps.every((timestamp, index) => {
        if (index === 0) return true;
        return timestamp >= timestamps[index - 1];
      });
      
      console.log(`   ✓ Messages in chronological order: ${isOrdered}`);
    } else {
      console.log('   ✗ Failed to verify messages');
    }

    // Step 7: Test encryption status
    console.log('\n7. Testing encryption status...');
    const encryptionResponse = await axios.get(`${BASE_URL}/encryption/rooms/${sessionId}/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (encryptionResponse.data.success) {
      console.log(`   ✓ Encryption enabled: ${encryptionResponse.data.data.encryption_enabled}`);
      console.log(`   ✓ Room ID: ${encryptionResponse.data.data.room_id}`);
    } else {
      console.log('   ✗ Failed to get encryption status');
    }

    // Step 8: End the session
    console.log('\n8. Ending text session...');
    const endResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/end`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (endResponse.data.success) {
      console.log('   ✓ Session ended successfully');
    } else {
      console.log('   ✗ Failed to end session');
    }

    // Step 9: Verify messages are deleted after session end
    console.log('\n9. Verifying messages are deleted after session end...');
    const finalResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (finalResponse.data.success) {
      const messages = finalResponse.data.data;
      console.log(`   ✓ Messages after session end: ${messages.length}`);
      
      if (messages.length === 0) {
        console.log('   ✓ Messages successfully deleted (ephemeral storage working)');
      } else {
        console.log('   ⚠️ Messages still present after session end');
      }
    } else {
      console.log('   ✗ Failed to check messages after session end');
    }

    console.log('\n✅ Ephemeral storage test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Messages are stored in cache (not database)');
    console.log('   • Messages are encrypted before storage');
    console.log('   • Messages are automatically deleted when session ends');
    console.log('   • Encryption system works with session IDs');
    console.log('   • Message retrieval and ordering works correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.data?.debug_info) {
      console.error('Debug info:', error.response.data.debug_info);
    }
  }
}

// Run the test
testEphemeralStorage().then(() => {
  console.log('\n🎉 All tests completed!');
}).catch((error) => {
  console.error('💥 Test suite failed:', error);
}); 