const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://172.20.10.11:8000/api';
const TEST_APPOINTMENT_ID = 1; // Replace with a real appointment ID
const TEST_MESSAGE = 'Hello! This is a test message for push notifications.';

// Test function
async function testChatNotifications() {
  try {
    console.log('🧪 Testing Chat Push Notifications...\n');

    // Step 1: Test sending a message (this should trigger a notification)
    console.log('1️⃣ Sending test message...');
    
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
      console.log('📱 Push notification should have been sent to the other participant');
      console.log('📋 Message ID:', messageResponse.data.data.id);
    } else {
      console.log('❌ Failed to send message:', messageResponse.data.message);
    }

    // Step 2: Test notification preferences
    console.log('\n2️⃣ Testing notification preferences...');
    
    const preferencesResponse = await axios.get(`${API_BASE_URL}/notifications/preferences`, {
      headers: {
        'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
      }
    });

    if (preferencesResponse.data.success) {
      console.log('✅ Notification preferences retrieved');
      console.log('📋 Push notifications enabled:', preferencesResponse.data.data.push_notifications_enabled);
    } else {
      console.log('❌ Failed to get notification preferences');
    }

    // Step 3: Test push token update
    console.log('\n3️⃣ Testing push token update...');
    
    const tokenResponse = await axios.post(`${API_BASE_URL}/notifications/push-token`, {
      push_token: 'test_expo_push_token_12345'
    }, {
      headers: {
        'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
      }
    });

    if (tokenResponse.data.success) {
      console.log('✅ Push token updated successfully');
    } else {
      console.log('❌ Failed to update push token');
    }

    console.log('\n🎉 Chat notification test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Replace YOUR_TEST_TOKEN_HERE with an actual JWT token');
    console.log('2. Replace TEST_APPOINTMENT_ID with a real appointment ID');
    console.log('3. Test on a physical device to receive actual push notifications');
    console.log('4. Check the Laravel logs for notification delivery status');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testChatNotifications(); 