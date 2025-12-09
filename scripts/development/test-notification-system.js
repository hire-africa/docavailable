const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://172.20.10.11:8000/api';
const TEST_APPOINTMENT_ID = 1; // Replace with a real appointment ID
const TEST_MESSAGE = 'Hello! This is a test message for push notifications.';

// Test function
async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Complete Notification System...\n');

    // Step 1: Test notification preferences endpoint
    console.log('1️⃣ Testing notification preferences endpoint...');
    try {
      const preferencesResponse = await axios.get(`${API_BASE_URL}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (preferencesResponse.data.success) {
        console.log('✅ Notification preferences endpoint working');
        console.log('📋 Push notifications enabled:', preferencesResponse.data.data.push_notifications_enabled);
        console.log('📋 Has push token:', preferencesResponse.data.data.has_push_token);
      } else {
        console.log('❌ Notification preferences endpoint failed:', preferencesResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Notification preferences endpoint error:', error.response?.data?.message || error.message);
    }

    // Step 2: Test push token update
    console.log('\n2️⃣ Testing push token update...');
    try {
      const tokenResponse = await axios.post(`${API_BASE_URL}/notifications/push-token`, {
        push_token: 'test_expo_push_token_12345'
      }, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (tokenResponse.data.success) {
        console.log('✅ Push token update working');
      } else {
        console.log('❌ Push token update failed:', tokenResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Push token update error:', error.response?.data?.message || error.message);
    }

    // Step 3: Test chat message sending (this should trigger notification)
    console.log('\n3️⃣ Testing chat message sending...');
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
        console.log('✅ Chat message sent successfully');
        console.log('📱 Push notification should have been sent to the other participant');
        console.log('📋 Message ID:', messageResponse.data.data.id);
      } else {
        console.log('❌ Failed to send message:', messageResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Chat message error:', error.response?.data?.message || error.message);
    }

    // Step 4: Test notification statistics
    console.log('\n4️⃣ Testing notification statistics...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/notifications/stats`, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (statsResponse.data.success) {
        console.log('✅ Notification statistics working');
        console.log('📊 Total notifications:', statsResponse.data.data.total_notifications);
        console.log('📊 Unread notifications:', statsResponse.data.data.unread_notifications);
        console.log('📊 Push enabled:', statsResponse.data.data.preferences.push_enabled);
      } else {
        console.log('❌ Notification statistics failed:', statsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Notification statistics error:', error.response?.data?.message || error.message);
    }

    // Step 5: Test notification preferences update
    console.log('\n5️⃣ Testing notification preferences update...');
    try {
      const updateResponse = await axios.patch(`${API_BASE_URL}/notifications/preferences`, {
        push_notifications_enabled: true,
        email_notifications_enabled: true,
        sms_notifications_enabled: false
      }, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (updateResponse.data.success) {
        console.log('✅ Notification preferences update working');
        console.log('📋 Updated preferences:', updateResponse.data.data);
      } else {
        console.log('❌ Notification preferences update failed:', updateResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Notification preferences update error:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Notification system test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Replace YOUR_TEST_TOKEN_HERE with an actual JWT token');
    console.log('2. Replace TEST_APPOINTMENT_ID with a real appointment ID');
    console.log('3. Configure FCM_SERVER_KEY and FCM_PROJECT_ID in backend .env');
    console.log('4. Configure EXPO_PUBLIC_EXPO_PROJECT_ID in frontend .env');
    console.log('5. Test on a physical device to receive actual push notifications');
    console.log('6. Check the Laravel logs for notification delivery status');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testNotificationSystem(); 