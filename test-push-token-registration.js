// Script to test push token registration
const axios = require('axios');

const API_BASE_URL = 'https://docavailable.org';

// Test credentials (replace with actual credentials from database)
const TEST_CREDENTIALS = {
    email: 'YOUR_TEST_EMAIL_HERE',
    password: 'YOUR_TEST_PASSWORD_HERE'
};

async function testPushTokenRegistration() {
    try {
        console.log('🚀 Testing Push Token Registration...\n');
        
        // Step 1: Login to get auth token
        console.log('🔐 Step 1: Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: TEST_CREDENTIALS.email,
            password: TEST_CREDENTIALS.password
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.message);
            return;
        }
        
        const authToken = loginResponse.data.token;
        console.log('✅ Login successful, token received');
        
        // Step 2: Test push token registration
        console.log('\n📱 Step 2: Testing push token registration...');
        const testPushToken = 'test_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const pushTokenResponse = await axios.post(`${API_BASE_URL}/api/notifications/push-token`, {
            push_token: testPushToken,
            provider: 'fcm'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (pushTokenResponse.data.success) {
            console.log('✅ Push token registration successful:', pushTokenResponse.data.message);
        } else {
            console.error('❌ Push token registration failed:', pushTokenResponse.data.message);
        }
        
        // Step 3: Verify token was stored
        console.log('\n🔍 Step 3: Verifying token was stored...');
        const userResponse = await axios.get(`${API_BASE_URL}/api/user`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (userResponse.data.success) {
            const user = userResponse.data.data;
            console.log('✅ User data retrieved successfully');
            console.log(`   Push Token: ${user.push_token ? 'SET' : 'NOT SET'}`);
            console.log(`   Push Notifications Enabled: ${user.push_notifications_enabled ? 'YES' : 'NO'}`);
            
            if (user.push_token === testPushToken) {
                console.log('✅ Push token matches what we sent - registration successful!');
            } else {
                console.log('⚠️ Push token does not match - there might be an issue');
            }
        } else {
            console.error('❌ Failed to retrieve user data:', userResponse.data.message);
        }
        
        // Step 4: Test sending a notification (if possible)
        console.log('\n🔔 Step 4: Testing notification sending...');
        try {
            // This would require a test endpoint that sends notifications
            console.log('ℹ️ Notification sending test requires backend test endpoint');
        } catch (error) {
            console.log('ℹ️ Notification sending test skipped (no test endpoint)');
        }
        
        console.log('\n🎉 Push token registration test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Tip: Check if the test credentials are correct');
        } else if (error.response?.status === 422) {
            console.log('\n💡 Tip: Check if the request data format is correct');
        } else if (error.response?.status === 500) {
            console.log('\n💡 Tip: Check backend logs for server errors');
        }
    }
}

// Run the test
if (TEST_CREDENTIALS.email === 'YOUR_TEST_EMAIL_HERE') {
    console.log('❌ Please update TEST_CREDENTIALS with actual test user credentials first');
    console.log('   Run: node get-test-credentials.js to get test credentials');
} else {
    testPushTokenRegistration().catch(console.error);
}
