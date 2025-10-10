// Debug script to check push token registration
const axios = require('axios');

const API_BASE_URL = 'https://docavailable.org';

async function checkPushTokens() {
    try {
        console.log('🔍 Checking push token registration...');
        
        // Test the push token endpoint
        const response = await axios.post(`${API_BASE_URL}/api/notifications/push-token`, {
            push_token: 'test_token_debug',
            provider: 'fcm'
        }, {
            headers: {
                'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE', // Replace with actual token
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Push token endpoint response:', response.data);
        
    } catch (error) {
        console.error('❌ Error testing push token endpoint:', error.response?.data || error.message);
    }
}

// Test FCM configuration
async function testFCMConfig() {
    try {
        console.log('🔍 Testing FCM configuration...');
        
        // Check if we can get project info
        const response = await axios.get(`${API_BASE_URL}/api/health`);
        console.log('✅ API Health:', response.data);
        
    } catch (error) {
        console.error('❌ Error testing API:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting push notification debug...');
    await testFCMConfig();
    console.log('\n' + '='.repeat(50) + '\n');
    await checkPushTokens();
}

runTests();
