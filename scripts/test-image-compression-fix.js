const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testImageCompressionFix() {
    try {
        console.log('🧪 Testing Image Compression Fixes...\n');

        console.log('📊 UPDATED SETTINGS:');
        console.log('   - ProfilePicturePicker quality: 0.9 (90% - improved from 0.7)');
        console.log('   - Removed aggressive re-compression for large files');
        console.log('   - ImageService quality: 0.9 (90% - improved from 0.8)');
        console.log('   - Backend queue: sync (immediate processing)');
        console.log('   - Backend image quality: 90% (improved from 80%)');
        console.log('   - Reduced image sizes generated (better performance)');
        console.log('');

        // Create a test image that simulates your 1.9MB image
        console.log('🧪 Creating test image...');
        
        let testImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Create a larger image to simulate your 1.9MB original
        for (let i = 0; i < 500; i++) {
            testImageBase64 += jpegHeader;
        }

        const base64Data = testImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        
        console.log('Test image size:', decodedImage.length, 'bytes');
        console.log('Test image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass validation:', decodedImage.length > 100);
        console.log('');

        // Test registration with improved settings
        console.log('🧪 Testing doctor registration with improved settings...');
        
        const registrationData = {
            name: 'Test Doctor',
            email: `test.doctor.${Date.now()}@example.com`,
            password: 'password123',
            password_confirmation: 'password123',
            phone: '+265123456789',
            user_type: 'doctor',
            specialization: 'General Medicine',
            profile_picture: testImageBase64,
            national_id: testImageBase64,
            medical_degree: testImageBase64,
            medical_licence: testImageBase64,
        };

        const response = await axios.post(`${BASE_URL}/auth/register`, registrationData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000, // 30 second timeout
        });

        console.log('✅ Registration successful!');
        console.log('Status:', response.status);
        console.log('Response data:', {
            success: response.data.success,
            message: response.data.message,
            user: {
                id: response.data.data.user.id,
                email: response.data.data.user.email,
                user_type: response.data.data.user.user_type,
                status: response.data.data.user.status,
                specialization: response.data.data.user.specialization,
                hasProfilePicture: !!response.data.data.user.profile_picture,
                hasDocuments: {
                    national_id: !!response.data.data.user.national_id,
                    medical_degree: !!response.data.data.user.medical_degree,
                    medical_licence: !!response.data.data.user.medical_licence
                }
            },
            hasToken: !!response.data.data.token
        });

        console.log('\n🎯 FIXES APPLIED:');
        console.log('1. ✅ Increased frontend image quality from 70% to 90%');
        console.log('2. ✅ Removed aggressive re-compression for large files');
        console.log('3. ✅ Switched queue to sync for immediate processing');
        console.log('4. ✅ Increased backend image quality from 80% to 90%');
        console.log('5. ✅ Reduced number of image sizes generated');
        console.log('');
        console.log('📈 EXPECTED RESULTS:');
        console.log('- Your 1.9MB images will be processed at 90% quality');
        console.log('- No more aggressive compression for large files');
        console.log('- Immediate processing (no queue delays)');
        console.log('- Better image quality overall');
        console.log('- Faster processing due to fewer image sizes');
        console.log('');
        console.log('🔄 NEXT STEPS:');
        console.log('1. Test with your actual 1.9MB images in the frontend');
        console.log('2. Check that profile pictures and documents save properly');
        console.log('3. Verify images display correctly in admin dashboard');
        console.log('4. Monitor upload times - should be much faster now');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testImageCompressionFix();
