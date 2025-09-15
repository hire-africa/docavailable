const axios = require('axios');

// Debug configuration
const API_BASE_URL = 'http://172.20.10.11:8000/api';
const TEST_APPOINTMENT_ID = 1; // Replace with a real appointment ID

// Test function
async function debugNotifications() {
  try {
    console.log('🔍 Debugging Notification System...\n');

    // Step 1: Check if OneSignal is configured
    console.log('1️⃣ Checking OneSignal configuration...');
    
    // You can add a test endpoint to check OneSignal config
    // For now, we'll just log what we expect
    console.log('Expected OneSignal config:');
    console.log('- App ID: Should be configured in .env');
    console.log('- REST API Key: Should be configured in .env');
    console.log('- Channel: OneSignalChannel should be registered');

    // Step 2: Test notification preferences endpoint
    console.log('\n2️⃣ Testing notification preferences endpoint...');
    
    // This would require a valid token, so we'll just show the expected structure
    console.log('Expected endpoint: GET /api/notifications/preferences');
    console.log('Expected response structure:');
    console.log({
      success: true,
      data: {
        push_notifications_enabled: true,
        email_notifications_enabled: true,
        sms_notifications_enabled: false,
        notification_preferences: {}
      }
    });

    // Step 3: Test push token endpoint
    console.log('\n3️⃣ Testing push token endpoint...');
    console.log('Expected endpoint: POST /api/notifications/push-token');
    console.log('Expected payload: { push_token: "expo_push_token_here" }');

    // Step 4: Test chat message sending (this triggers notifications)
    console.log('\n4️⃣ Testing chat message sending...');
    console.log('Expected endpoint: POST /api/chat/{appointmentId}/messages');
    console.log('Expected payload: { message: "Test message", message_type: "text" }');
    console.log('This should trigger a push notification to the other participant');

    // Step 5: Common issues to check
    console.log('\n5️⃣ Common issues to check:');
    console.log('✅ Backend:');
    console.log('  - OneSignal app_id and rest_api_key in .env');
    console.log('  - OneSignalChannel registered in AppServiceProvider');
    console.log('  - ChatMessageNotification includes click_action');
    console.log('  - User has push_token and push_notifications_enabled = true');
    
    console.log('✅ Frontend:');
    console.log('  - Notification permissions granted');
    console.log('  - Push token generated and sent to backend');
    console.log('  - Notification listeners set up');
    console.log('  - App not in foreground (notifications may not show when app is open)');

    console.log('\n6️⃣ Testing steps:');
    console.log('1. Send a message from one user to another');
    console.log('2. Check backend logs for notification sending');
    console.log('3. Check if recipient receives notification');
    console.log('4. Test notification tap to navigate to chat');

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

// Run the debug function
debugNotifications(); 