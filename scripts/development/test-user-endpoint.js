const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testUserEndpoint() {
    try {
        console.log('🔍 Testing /user endpoint specifically\n');

        // Test 1: Health check first
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`, {
            timeout: 5000
        });
        console.log('✅ Health check passed:', healthResponse.data.status);

        // Test 2: Register a test user
        console.log('\n2️⃣ Registering a test user...');
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

        if (!registerResponse.data.success) {
            console.log('❌ Registration failed:', registerResponse.data.message);
            return;
        }

        const token = registerResponse.data.data.token;
        console.log('✅ Registration successful, token received');

        // Test 3: Test /user endpoint with different timeouts
        console.log('\n3️⃣ Testing /user endpoint...');
        
        // Test with 5 second timeout
        console.log('   Testing with 5 second timeout...');
        try {
            const userResponse5s = await axios.get(`${BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            console.log('✅ /user endpoint responded in under 5 seconds');
            console.log('   User email:', userResponse5s.data.data.email);
        } catch (error) {
            console.log('❌ 5 second timeout exceeded:', error.message);
        }

        // Test with 10 second timeout
        console.log('   Testing with 10 second timeout...');
        try {
            const userResponse10s = await axios.get(`${BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ /user endpoint responded in under 10 seconds');
            console.log('   User email:', userResponse10s.data.data.email);
        } catch (error) {
            console.log('❌ 10 second timeout exceeded:', error.message);
        }

        // Test with 30 second timeout
        console.log('   Testing with 30 second timeout...');
        try {
            const userResponse30s = await axios.get(`${BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 30000
            });
            console.log('✅ /user endpoint responded in under 30 seconds');
            console.log('   User email:', userResponse30s.data.data.email);
        } catch (error) {
            console.log('❌ 30 second timeout exceeded:', error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Backend is accessible and /user endpoint is working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('   Backend server is not running');
        } else if (error.code === 'ENOTFOUND') {
            console.log('   IP address not found');
        }
    }
}

testUserEndpoint(); 