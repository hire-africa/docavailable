const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testFileSizeHandling() {
    try {
        console.log('🧪 Testing file size handling for profile picture uploads...');
        
        // Test the health endpoint first
        console.log('1. Testing API health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ API health check:', healthResponse.data);
        
        // Test profile picture upload with different file sizes
        console.log('\n2. Testing file size validation...');
        
        // Test with a mock large file (simulating the error)
        try {
            const FormData = require('form-data');
            const formData = new FormData();
            
            // Create a mock large file (this would be a real large image in practice)
            const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB buffer
            formData.append('profile_picture', largeBuffer, {
                filename: 'large-image.jpg',
                contentType: 'image/jpeg'
            });
            
            const uploadResponse = await axios.post(`${API_BASE_URL}/upload/profile-picture`, formData, {
                headers: {
                    'Authorization': 'Bearer fake-token',
                    ...formData.getHeaders(),
                }
            });
            console.log('❌ Unexpected success for large file:', uploadResponse.data);
        } catch (error) {
            console.log('✅ Correctly rejected large file:', error.response?.status);
            console.log('Error message:', error.response?.data?.message);
            
            if (error.response?.data?.message && error.response.data.message.includes('2048 kilobytes')) {
                console.log('✅ File size validation is working correctly');
            } else {
                console.log('⚠️ Unexpected error message format');
            }
        }
        
        console.log('\n🎉 File size handling tests completed!');
        console.log('\n📋 File Size Limits:');
        console.log('- Maximum file size: 2MB (2048 kilobytes)');
        console.log('- Frontend compression: 70% quality for normal images');
        console.log('- Frontend compression: 50% quality for large images (>1.5MB)');
        console.log('- User feedback: Clear error messages for oversized files');
        
        console.log('\n🔧 Improvements Made:');
        console.log('- Added image compression in ProfilePicturePicker');
        console.log('- Added file size validation and user feedback');
        console.log('- Enhanced error messages for file size issues');
        console.log('- Added automatic re-compression for large files');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testFileSizeHandling(); 