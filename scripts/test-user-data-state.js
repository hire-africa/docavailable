const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testUserDataState() {
    try {
        console.log('🧪 Testing user data state...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        try {
            const healthResponse = await axios.get(`${API_BASE_URL}/health`);
            console.log('✅ API health check:', healthResponse.data);
        } catch (error) {
            console.log('❌ API health check failed:', error.message);
            console.log('This might explain why user data disappears - API is not accessible');
        }
        
        // Test if we can access the user endpoint with a fake token
        console.log('\n2. Testing user endpoint with fake token...');
        try {
            const userResponse = await axios.get(`${API_BASE_URL}/user`, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success with fake token:', userResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected fake token:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        console.log('\n🎉 User data state tests completed!');
        console.log('If the API is down, the edit profile pages should still work with cached data.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUserDataState(); 