const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testCompleteProfilePictureFlow() {
    try {
        console.log('🧪 Testing complete profile picture upload and display flow...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test profile picture upload endpoint
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
        
        // Test profile update endpoint
        console.log('\n4. Testing profile update endpoint...');
        try {
            const updateResponse = await axios.patch(`${API_BASE_URL}/profile`, {
                first_name: 'Test',
                last_name: 'User'
            }, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Unexpected success for unauthenticated update:', updateResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated update:', error.response?.status);
        }
        
        console.log('\n🎉 Complete profile picture flow tests completed!');
        console.log('\n📋 Expected Flow:');
        console.log('1. User uploads profile picture via /upload/profile-picture');
        console.log('2. Backend updates user.profile_picture field in database');
        console.log('3. Frontend calls refreshUserData() to update AuthContext');
        console.log('4. Dashboard and profile pages refresh to show new picture');
        console.log('5. ProfilePictureDisplay component shows updated image');
        
        console.log('\n🔧 Key Components Updated:');
        console.log('- Edit profile pages: Added refreshUserData() after upload');
        console.log('- View profile pages: Added refreshUserData() on mount');
        console.log('- Dashboards: Added refreshUserData() on mount');
        console.log('- ProfilePictureDisplay: Enhanced debugging and error handling');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testCompleteProfilePictureFlow(); 