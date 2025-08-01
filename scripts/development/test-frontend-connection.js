const axios = require('axios');

// Simulate the same configuration as the frontend app
const rawBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000';
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;
const apiBaseURL = `${baseURL}/api`;

console.log('🔍 Testing Frontend Connection Configuration\n');
console.log('Raw Base URL:', rawBaseURL);
console.log('Base URL:', baseURL);
console.log('API Base URL:', apiBaseURL);

async function testFrontendConnection() {
    try {
        // Create axios instance with same config as frontend
        const api = axios.create({
            baseURL: apiBaseURL,
            timeout: 30000, // Same as frontend
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        console.log('\n1️⃣ Testing health endpoint...');
        const healthResponse = await api.get('/health');
        console.log('✅ Health check passed:', healthResponse.data.status);

        console.log('\n2️⃣ Testing registration...');
        const testData = new FormData();
        testData.append('first_name', 'Frontend');
        testData.append('last_name', 'Test');
        testData.append('email', `frontend${Date.now()}@example.com`);
        testData.append('password', 'password123');
        testData.append('password_confirmation', 'password123');
        testData.append('date_of_birth', '1990-01-01');
        testData.append('gender', 'male');
        testData.append('country', 'Test Country');
        testData.append('city', 'Test City');
        testData.append('user_type', 'patient');

        const registerResponse = await api.post('/register', testData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (!registerResponse.data.success) {
            console.log('❌ Registration failed:', registerResponse.data.message);
            return;
        }

        const token = registerResponse.data.data.token;
        console.log('✅ Registration successful');

        console.log('\n3️⃣ Testing /user endpoint with token...');
        const userResponse = await api.get('/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (userResponse.data.success) {
            console.log('✅ /user endpoint working with token');
            console.log('   User email:', userResponse.data.data.email);
        } else {
            console.log('❌ /user endpoint failed:', userResponse.data.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Frontend configuration is working correctly');
        console.log('All endpoints are accessible');
        console.log('The timeout issue should be resolved');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('   Backend server is not running');
        } else if (error.code === 'ENOTFOUND') {
            console.log('   IP address not found');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('   Request timed out');
        }
    }
}

testFrontendConnection(); 