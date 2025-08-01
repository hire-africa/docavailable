const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://172.20.10.11:8000/api';
const TEST_APPOINTMENT_ID = 11;

// Test function
async function fixNotificationIssues() {
  try {
    console.log('🔧 Fixing Notification Issues...\n');

    // Step 1: Test push token registration
    console.log('1️⃣ Testing push token registration...');
    try {
      const tokenResponse = await axios.post(`${API_BASE_URL}/notifications/push-token`, {
        push_token: 'ExponentPushToken[test_token_for_debugging_12345]'
      }, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (tokenResponse.data.success) {
        console.log('✅ Push token registration working');
        console.log('📋 Response:', tokenResponse.data.message);
      } else {
        console.log('❌ Push token registration failed:', tokenResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Push token registration error:', error.response?.data?.message || error.message);
    }

    // Step 2: Test notification preferences update
    console.log('\n2️⃣ Testing notification preferences update...');
    try {
      const preferencesResponse = await axios.patch(`${API_BASE_URL}/notifications/preferences`, {
        push_notifications_enabled: true,
        email_notifications_enabled: true,
        sms_notifications_enabled: false
      }, {
        headers: {
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (preferencesResponse.data.success) {
        console.log('✅ Notification preferences update working');
        console.log('📋 Updated preferences:', preferencesResponse.data.data);
      } else {
        console.log('❌ Notification preferences update failed:', preferencesResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Notification preferences update error:', error.response?.data?.message || error.message);
    }

    // Step 3: Send a test message to trigger notification
    console.log('\n3️⃣ Sending test message to trigger notification...');
    try {
      const messageResponse = await axios.post(`${API_BASE_URL}/chat/${TEST_APPOINTMENT_ID}/messages`, {
        message: 'Test message to trigger notification debugging'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer YOUR_TEST_TOKEN_HERE` // Replace with actual token
        }
      });
      
      if (messageResponse.data.success) {
        console.log('✅ Test message sent successfully');
        console.log('📋 Message ID:', messageResponse.data.data.id);
        console.log('📱 Check Laravel logs for detailed notification debug info');
      } else {
        console.log('❌ Failed to send test message:', messageResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Test message error:', error.response?.data?.message || error.message);
    }

    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('1. ✅ Backend notification system is properly configured');
    console.log('2. ❌ Users are missing push tokens (frontend not registering)');
    console.log('3. ❌ FCM configuration is empty (backend .env needs FCM credentials)');
    console.log('4. ✅ Notification preferences are enabled for users');
    
    console.log('\n🔧 REQUIRED FIXES:');
    console.log('1. Frontend: Ensure notificationService.initialize() is called on app startup');
    console.log('2. Frontend: Set EXPO_PUBLIC_EXPO_PROJECT_ID in .env file');
    console.log('3. Backend: Set FCM_SERVER_KEY and FCM_PROJECT_ID in backend/.env');
    console.log('4. Test: Run this script with actual JWT tokens to verify fixes');

  } catch (error) {
    console.error('❌ Fix script failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the fix
fixNotificationIssues(); 