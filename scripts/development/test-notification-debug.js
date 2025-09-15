const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://172.20.10.11:8000/api';
const TEST_APPOINTMENT_ID = 11; // Use the appointment ID from your logs
const TEST_MESSAGE = 'Debug test message for notifications';

// Test function
async function testNotificationDebug() {
  try {
    console.log('🔍 Testing Notification Debug...\n');

    // Step 1: Check user notification preferences
    console.log('1️⃣ Checking user notification preferences...');
    try {
      const preferencesResponse = await axios.get(`${API_BASE_URL}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (preferencesResponse.data.success) {
        console.log('✅ Notification preferences retrieved');
        console.log('📋 Data:', JSON.stringify(preferencesResponse.data.data, null, 2));
      } else {
        console.log('❌ Failed to get preferences:', preferencesResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Preferences error:', error.response?.data?.message || error.message);
    }

    // Step 2: Send a test message
    console.log('\n2️⃣ Sending test message...');
    try {
      const messageResponse = await axios.post(`${API_BASE_URL}/chat/${TEST_APPOINTMENT_ID}/messages`, {
        message: TEST_MESSAGE
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (messageResponse.data.success) {
        console.log('✅ Message sent successfully');
        console.log('📋 Message ID:', messageResponse.data.data.id);
        console.log('📱 Check Laravel logs for notification debug info');
      } else {
        console.log('❌ Failed to send message:', messageResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Message error:', error.response?.data?.message || error.message);
    }

    console.log('\n📝 Next steps:');
    console.log('1. Replace YOUR_TEST_TOKEN_HERE with an actual JWT token');
    console.log('2. Check the Laravel logs for detailed notification debug info');
    console.log('3. Look for emoji-prefixed log entries (🔔, 📤, 👤, 🚀, ✅, ❌)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testNotificationDebug(); 