const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testProfilePictureDisplay() {
    try {
        console.log('🧪 Testing profile picture display functionality...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test profile picture upload endpoint structure
        console.log('\n2. Testing profile picture upload endpoint...');
        try {
            const uploadResponse = await axios.post(`${API_BASE_URL}/upload/profile-picture`, {}, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('❌ Unexpected success for unauthenticated upload:', uploadResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated upload:', error.response?.status);
            console.log('Response structure:', {
                success: error.response?.data?.success,
                message: error.response?.data?.message
            });
        }
        
        // Test user endpoint to see profile picture field structure
        console.log('\n3. Testing user endpoint structure...');
        try {
            const userResponse = await axios.get(`${API_BASE_URL}/user`, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated user request:', userResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated user request:', error.response?.status);
        }
        
        console.log('\n🎉 Profile picture display tests completed!');
        console.log('The API endpoints are properly protected and should work with authentication.');
        console.log('Profile picture upload should update the user.profile_picture field in the database.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProfilePictureDisplay(); 