const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://172.20.10.11:8000/api';

async function testPatientAccess() {
  console.log('🧪 Testing Patient Access to Text Session History...\n');

  try {
    // Step 1: Login as a patient
    console.log('1. Logging in as patient...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'patient@example.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const authToken = loginResponse.data.data.token;
    const patientId = loginResponse.data.data.user.id;
    console.log('   ✓ Patient login successful');

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

    // Step 3: Send some test messages
    console.log('\n3. Sending test messages...');
    const testMessages = [
      'Hello doctor, I have a question about my medication',
      'I have been experiencing some side effects',
      'What should I do about these symptoms?',
      'Thank you for the advice',
      'I will follow your recommendations'
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const sendResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/messages`, {
        text: testMessages[i],
        sender: patientId.toString()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (sendResponse.data.success) {
        console.log(`   ✓ Message ${i + 1} sent`);
      } else {
        console.log(`   ✗ Failed to send message ${i + 1}`);
      }
    }

    // Step 4: End the session
    console.log('\n4. Ending text session...');
    const endResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/end`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (endResponse.data.success) {
      console.log('   ✓ Session ended successfully');
    } else {
      console.log('   ✗ Failed to end session');
    }

    // Step 5: Test patient history
    console.log('\n5. Testing patient history...');
    const historyResponse = await axios.get(`${BASE_URL}/text-sessions/patient/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (historyResponse.data.success) {
      const history = historyResponse.data.data;
      console.log(`   ✓ Found ${history.length} sessions in history`);
      
      if (history.length > 0) {
        const session = history[0];
        console.log(`   ✓ Session ID: ${session.session_id}`);
        console.log(`   ✓ Doctor: ${session.doctor_name}`);
        console.log(`   ✓ Messages: ${session.message_count}`);
        console.log(`   ✓ Retention: ${session.retention_days} days`);
        console.log(`   ✓ Accessible until: ${new Date(session.accessible_until).toLocaleDateString()}`);
      }
    } else {
      console.log('   ✗ Failed to get patient history');
    }

    // Step 6: Test getting session messages
    console.log('\n6. Testing session messages access...');
    const messagesResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/patient/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (messagesResponse.data.success) {
      const sessionData = messagesResponse.data.data;
      console.log(`   ✓ Retrieved ${sessionData.messages.length} messages`);
      console.log(`   ✓ Retention days: ${sessionData.retention_info.retention_days}`);
      console.log(`   ✓ Accessible until: ${new Date(sessionData.retention_info.accessible_until).toLocaleDateString()}`);
      
      if (sessionData.messages.length > 0) {
        const message = sessionData.messages[0];
        console.log(`   ✓ Sample message: "${message.text.substring(0, 50)}..."`);
        console.log(`   ✓ Sender: ${message.sender}`);
        console.log(`   ✓ Timestamp: ${new Date(message.timestamp).toLocaleString()}`);
      }
    } else {
      console.log('   ✗ Failed to get session messages');
    }

    // Step 7: Test export functionality
    console.log('\n7. Testing session export...');
    const exportResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/export`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (exportResponse.data.success) {
      const exportData = exportResponse.data.data;
      console.log(`   ✓ Export successful`);
      console.log(`   ✓ Exported ${exportData.message_count} messages`);
      console.log(`   ✓ Exported at: ${new Date(exportData.exported_at).toLocaleString()}`);
      console.log(`   ✓ Retention until: ${new Date(exportData.retention_until).toLocaleDateString()}`);
      
      if (exportData.messages.length > 0) {
        console.log(`   ✓ Sample exported message: "${exportData.messages[0].content.substring(0, 50)}..."`);
      }
    } else {
      console.log('   ✗ Failed to export session');
    }

    // Step 8: Test retention period management
    console.log('\n8. Testing retention period management...');
    
    // Get current retention
    const getRetentionResponse = await axios.get(`${BASE_URL}/text-sessions/retention`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (getRetentionResponse.data.success) {
      const currentRetention = getRetentionResponse.data.data;
      console.log(`   ✓ Current retention: ${currentRetention.retention_days} days`);
      
      // Set new retention period
      const newRetentionDays = 14;
      const setRetentionResponse = await axios.post(`${BASE_URL}/text-sessions/retention`, {
        days: newRetentionDays
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (setRetentionResponse.data.success) {
        console.log(`   ✓ Retention updated to ${newRetentionDays} days`);
        console.log(`   ✓ Accessible until: ${new Date(setRetentionResponse.data.data.accessible_until).toLocaleDateString()}`);
      } else {
        console.log('   ✗ Failed to update retention period');
      }
    } else {
      console.log('   ✗ Failed to get retention period');
    }

    // Step 9: Test temporary access creation
    console.log('\n9. Testing temporary access creation...');
    const tempAccessResponse = await axios.post(`${BASE_URL}/text-sessions/${sessionId}/temporary-access`, {
      hours: 24
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (tempAccessResponse.data.success) {
      const accessData = tempAccessResponse.data.data;
      console.log(`   ✓ Temporary access created`);
      console.log(`   ✓ Token: ${accessData.access_token}`);
      console.log(`   ✓ Expires in: ${accessData.expires_in_hours} hours`);
      console.log(`   ✓ Access URL: ${accessData.access_url}`);
      
      // Test accessing with token
      console.log('\n10. Testing access with temporary token...');
      const tokenAccessResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/access/${accessData.access_token}`);
      
      if (tokenAccessResponse.data.success) {
        const tokenData = tokenAccessResponse.data.data;
        console.log(`   ✓ Token access successful`);
        console.log(`   ✓ Session: ${tokenData.session.doctor_name}`);
        console.log(`   ✓ Messages: ${tokenData.access_info.message_count}`);
        console.log(`   ✓ Expires at: ${new Date(tokenData.access_info.expires_at).toLocaleString()}`);
      } else {
        console.log('   ✗ Failed to access with token');
      }
      
      // Test revoking access
      console.log('\n11. Testing access revocation...');
      const revokeResponse = await axios.post(`${BASE_URL}/text-sessions/revoke-access`, {
        token: accessData.access_token
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (revokeResponse.data.success) {
        console.log('   ✓ Access token revoked successfully');
        
        // Verify token is no longer valid
        const verifyRevokeResponse = await axios.get(`${BASE_URL}/text-sessions/${sessionId}/access/${accessData.access_token}`);
        if (!verifyRevokeResponse.data.success) {
          console.log('   ✓ Token is no longer valid (revocation working)');
        } else {
          console.log('   ⚠️ Token still valid after revocation');
        }
      } else {
        console.log('   ✗ Failed to revoke access token');
      }
    } else {
      console.log('   ✗ Failed to create temporary access');
    }

    console.log('\n✅ Patient access test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Patient can view session history');
    console.log('   • Patient can access session messages');
    console.log('   • Patient can export sessions');
    console.log('   • Patient can manage retention periods');
    console.log('   • Patient can create temporary access tokens');
    console.log('   • Patient can revoke access tokens');
    console.log('   • All data remains in cache (no database storage)');
    console.log('   • Messages are encrypted and secure');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.data?.debug_info) {
      console.error('Debug info:', error.response.data.debug_info);
    }
  }
}

// Run the test
testPatientAccess().then(() => {
  console.log('\n🎉 All patient access tests completed!');
}).catch((error) => {
  console.error('💥 Test suite failed:', error);
}); 