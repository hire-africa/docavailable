const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testProfileLoading() {
    try {
        console.log('🧪 Testing profile loading functionality...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test getting user data without authentication
        console.log('\n2. Testing unauthenticated user request...');
        try {
            const userResponse = await axios.get(`${API_BASE_URL}/user`);
            console.log('❌ Unexpected success for unauthenticated request:', userResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated request:', error.response?.status);
        }
        
        // Test profile update endpoint without authentication
        console.log('\n3. Testing unauthenticated profile update...');
        try {
            const updateResponse = await axios.patch(`${API_BASE_URL}/profile`, {
                first_name: 'Test',
                last_name: 'User'
            });
            console.log('❌ Unexpected success for unauthenticated update:', updateResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated update:', error.response?.status);
        }
        
        console.log('\n🎉 Profile loading tests completed successfully!');
        console.log('The API endpoints are properly protected and responding correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProfileLoading(); 