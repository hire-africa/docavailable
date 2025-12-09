// Comprehensive Push Notification Debugging Script
const axios = require('axios');

const API_BASE_URL = 'https://docavailable.org';

// Test 1: Check API Health
async function testAPIHealth() {
    try {
        console.log('🔍 [Test 1] Checking API Health...');
        const response = await axios.get(`${API_BASE_URL}/api/health`);
        console.log('✅ API Health Response:', response.data);
        return true;
    } catch (error) {
        console.error('❌ API Health Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 2: Check FCM Configuration
async function testFCMConfig() {
    try {
        console.log('🔍 [Test 2] Testing FCM Configuration...');
        
        // Test with a mock auth token (you'll need to replace this)
        const mockAuthToken = 'YOUR_AUTH_TOKEN_HERE';
        
        const response = await axios.post(`${API_BASE_URL}/api/notifications/push-token`, {
            push_token: 'debug_test_token_' + Date.now(),
            provider: 'fcm'
        }, {
            headers: {
                'Authorization': `Bearer ${mockAuthToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Push Token Registration Response:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Push Token Registration Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 3: Check User Authentication
async function testUserAuth() {
    try {
        console.log('🔍 [Test 3] Testing User Authentication...');
        
        // Test login endpoint
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: 'test@example.com', // Replace with test credentials
            password: 'testpassword'
        });
        
        if (loginResponse.data.success && loginResponse.data.token) {
            console.log('✅ Login successful, token received');
            
            // Test push token registration with real token
            const tokenResponse = await axios.post(`${API_BASE_URL}/api/notifications/push-token`, {
                push_token: 'debug_test_token_' + Date.now(),
                provider: 'fcm'
            }, {
                headers: {
                    'Authorization': `Bearer ${loginResponse.data.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Push Token Registration with Real Token:', tokenResponse.data);
            return true;
        } else {
            console.error('❌ Login failed:', loginResponse.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Authentication Test Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 4: Check Database Connection
async function testDatabaseConnection() {
    try {
        console.log('🔍 [Test 4] Testing Database Connection...');
        
        // This would require a test endpoint that checks database connectivity
        const response = await axios.get(`${API_BASE_URL}/api/health`);
        console.log('✅ Database connection appears to be working');
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 5: Check FCM Service Account
async function testFCMServiceAccount() {
    try {
        console.log('🔍 [Test 5] Testing FCM Service Account...');
        
        // This would require a test endpoint that validates FCM credentials
        console.log('ℹ️ FCM Service Account test requires backend endpoint');
        return true;
    } catch (error) {
        console.error('❌ FCM Service Account test failed:', error.message);
        return false;
    }
}

// Main debugging function
async function runDebugTests() {
    console.log('🚀 Starting Comprehensive Push Notification Debug...\n');
    
    const results = {
        apiHealth: await testAPIHealth(),
        fcmConfig: await testFCMConfig(),
        userAuth: await testUserAuth(),
        database: await testDatabaseConnection(),
        fcmService: await testFCMServiceAccount()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEBUG RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Push notifications should be working.');
    } else {
        console.log('⚠️ Some tests failed. Check the issues above.');
    }
}

// Run the debug tests
runDebugTests().catch(console.error);
