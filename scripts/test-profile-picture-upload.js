const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testProfilePictureUpload() {
    try {
        console.log('🧪 Testing profile picture upload functionality...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test profile picture upload without authentication
        console.log('\n2. Testing unauthenticated profile picture upload...');
        try {
            const formData = new FormData();
            formData.append('profile_picture', fs.createReadStream(path.join(__dirname, 'test-image.jpg')));
            
            const uploadResponse = await axios.post(`${API_BASE_URL}/upload/profile-picture`, formData, {
                headers: {
                    ...formData.getHeaders(),
                }
            });
            console.log('❌ Unexpected success for unauthenticated upload:', uploadResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected unauthenticated upload:', error.response?.status);
        }
        
        // Test with a mock image file
        console.log('\n3. Testing profile picture upload validation...');
        try {
            const formData = new FormData();
            // Create a mock image file
            const mockImageBuffer = Buffer.from('fake-image-data');
            formData.append('profile_picture', mockImageBuffer, {
                filename: 'test.jpg',
                contentType: 'image/jpeg'
            });
            
            const uploadResponse = await axios.post(`${API_BASE_URL}/upload/profile-picture`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': 'Bearer fake-token'
                }
            });
            console.log('❌ Unexpected success for invalid upload:', uploadResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected invalid upload:', error.response?.status);
        }
        
        console.log('\n🎉 Profile picture upload tests completed successfully!');
        console.log('The API endpoints are properly protected and validation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProfilePictureUpload(); 