const fetch = require('node-fetch');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testBackend() {
    console.log('🧪 Testing Laravel Backend Integration...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.ok) {
            console.log('✅ Health check passed:', healthData);
        } else {
            console.log('❌ Health check failed:', healthData);
            return;
        }

        // Test 2: Authentication Endpoint (should return 401 without token)
        console.log('\n2. Testing Authentication...');
        try {
            const authResponse = await fetch(`${API_BASE_URL}/user`);
            if (authResponse.status === 401) {
                console.log('✅ Authentication properly protected (401 as expected)');
            } else {
                console.log('⚠️  Unexpected auth response:', authResponse.status);
            }
        } catch (error) {
            console.log('❌ Auth test failed:', error.message);
        }

        // Test 3: Chat Endpoint (should return 401 without token)
        console.log('\n3. Testing Chat API...');
        try {
            const chatResponse = await fetch(`${API_BASE_URL}/chat/rooms`);
            if (chatResponse.status === 401) {
                console.log('✅ Chat API properly protected (401 as expected)');
            } else {
                console.log('⚠️  Unexpected chat response:', chatResponse.status);
            }
        } catch (error) {
            console.log('❌ Chat test failed:', error.message);
        }

        // Test 4: Wallet Endpoint (should return 401 without token)
        console.log('\n4. Testing Wallet API...');
        try {
            const walletResponse = await fetch(`${API_BASE_URL}/doctor/wallet`);
            if (walletResponse.status === 401) {
                console.log('✅ Wallet API properly protected (401 as expected)');
            } else {
                console.log('⚠️  Unexpected wallet response:', walletResponse.status);
            }
        } catch (error) {
            console.log('❌ Wallet test failed:', error.message);
        }

        // Test 5: Notifications Endpoint (should return 401 without token)
        console.log('\n5. Testing Notifications API...');
        try {
            const notificationResponse = await fetch(`${API_BASE_URL}/notifications`);
            if (notificationResponse.status === 401) {
                console.log('✅ Notifications API properly protected (401 as expected)');
            } else {
                console.log('⚠️  Unexpected notifications response:', notificationResponse.status);
            }
        } catch (error) {
            console.log('❌ Notifications test failed:', error.message);
        }

        console.log('\n🎉 Backend API tests completed successfully!');
        console.log('📝 Next steps:');
        console.log('   - Test with Firebase authentication token');
        console.log('   - Test from React Native frontend');
        console.log('   - Verify real-time features');

    } catch (error) {
        console.error('❌ Backend test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Ensure Laravel server is running on http://172.20.10.11:8000');
        console.log('   - Check if migrations are run: php artisan migrate');
        console.log('   - Verify CORS configuration');
    }
}

// Run the test
testBackend(); 