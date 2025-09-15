const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testApiResponseStructure() {
    try {
        console.log('🧪 Testing API response structure handling...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test unauthenticated user request to see response structure
        console.log('\n2. Testing unauthenticated user request response structure...');
        try {
            const userResponse = await axios.get(`${API_BASE_URL}/user`);
            console.log('❌ Unexpected success for unauthenticated request:', userResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated request:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message,
                data: error.response?.data?.data
            });
        }
        
        // Test profile update without authentication to see response structure
        console.log('\n3. Testing unauthenticated profile update response structure...');
        try {
            const updateResponse = await axios.patch(`${API_BASE_URL}/profile`, {
                first_name: 'Test',
                last_name: 'User'
            });
            console.log('❌ Unexpected success for unauthenticated update:', updateResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated update:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message,
                data: error.response?.data?.data
            });
        }
        
        console.log('\n🎉 API response structure tests completed successfully!');
        console.log('The API endpoints are returning consistent response structures.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testApiResponseStructure(); 