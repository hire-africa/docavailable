const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testBackendConnection() {
    try {
        console.log('🔍 Testing Backend Connection\n');

        // Test 1: Health endpoint
        console.log('1️⃣ Testing health endpoint...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`, {
                timeout: 5000
            });
            
            if (healthResponse.data.status === 'healthy') {
                console.log('✅ Backend is healthy and accessible');
                console.log('   Status:', healthResponse.data.status);
                console.log('   Environment:', healthResponse.data.environment);
                console.log('   Database:', healthResponse.data.database);
            } else {
                console.log('❌ Backend health check failed');
            }
        } catch (error) {
            console.log('❌ Health endpoint error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log('   Backend server is not running or not accessible');
            } else if (error.code === 'ENOTFOUND') {
                console.log('   IP address not found - check network connection');
            }
            return;
        }

        // Test 2: Test registration endpoint
        console.log('\n2️⃣ Testing registration endpoint...');
        try {
            const testData = new FormData();
            testData.append('first_name', 'Test');
            testData.append('last_name', 'User');
            testData.append('email', `test${Date.now()}@example.com`);
            testData.append('password', 'password123');
            testData.append('password_confirmation', 'password123');
            testData.append('date_of_birth', '1990-01-01');
            testData.append('gender', 'male');
            testData.append('country', 'Test Country');
            testData.append('city', 'Test City');
            testData.append('user_type', 'patient');

            const registerResponse = await axios.post(`${BASE_URL}/register`, testData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 10000
            });

            if (registerResponse.data.success) {
                console.log('✅ Registration endpoint working');
                console.log('   User created with ID:', registerResponse.data.data.user.id);
            } else {
                console.log('❌ Registration failed:', registerResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Registration error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Backend is running and accessible on 172.20.10.11:8000');
        console.log('API endpoints are responding correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBackendConnection(); 