const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testUncompressedImages() {
    try {
        console.log('🧪 Testing Doctor Registration with Uncompressed Images...\n');

        console.log('📊 NEW SETTINGS (No Compression):');
        console.log('   - ProfilePicturePicker quality: 1.0 (100% - no compression)');
        console.log('   - ProfilePicturePicker processing: NONE (original image)');
        console.log('   - Document upload quality: 1.0 (100% - no compression)');
        console.log('   - Backend validation: >100 bytes (very low threshold)');
        console.log('   - Expected image size: Original size (1.9MB+)');
        console.log('');

        // Create a large base64 image (simulating your 1.9MB image)
        console.log('🧪 Creating large uncompressed test image...');
        
        let largeImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Create a much larger image to simulate your 1.9MB original
        for (let i = 0; i < 1000; i++) {
            largeImageBase64 += jpegHeader;
        }

        const base64Data = largeImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        
        console.log('Uncompressed image size:', decodedImage.length, 'bytes');
        console.log('Uncompressed image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass 100B validation:', decodedImage.length > 100);
        console.log('Would pass 500B validation:', decodedImage.length > 500);
        console.log('Would pass 1KB validation:', decodedImage.length > 1000);

        // Test registration with uncompressed image
        const formData = new FormData();
        formData.append('first_name', 'Test');
        formData.append('surname', 'Doctor');
        formData.append('email', `test.doctor.${Date.now()}@example.com`);
        formData.append('password', 'password123');
        formData.append('password_confirmation', 'password123');
        formData.append('dob', '1990-01-01');
        formData.append('gender', 'male');
        formData.append('country', 'Test Country');
        formData.append('city', 'Test City');
        formData.append('user_type', 'doctor');
        formData.append('specialization', 'Cardiology');
        formData.append('sub_specialization', 'Interventional Cardiology');
        formData.append('years_of_experience', '5');
        formData.append('bio', 'Experienced cardiologist with expertise in interventional procedures.');
        formData.append('profile_picture', largeImageBase64);
        formData.append('national_id', largeImageBase64);
        formData.append('medical_degree', largeImageBase64);
        formData.append('medical_licence', largeImageBase64);

        console.log('\n🚀 Testing registration with uncompressed image...');
        const response = await axios.post(`${BASE_URL}/register`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
            },
            timeout: 60000 // Increased timeout for large images
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

        console.log('\n🎯 CHANGES MADE:');
        console.log('1. ✅ Removed ALL compression from ProfilePicturePicker');
        console.log('2. ✅ Removed ALL compression from document uploads');
        console.log('3. ✅ Removed image processing/resizing');
        console.log('4. ✅ Reduced validation threshold to 100 bytes');
        console.log('5. ✅ Using original image quality (1.0)');
        console.log('');
        console.log('📈 EXPECTED RESULTS:');
        console.log('- Your 1.9MB images should now be saved at full size');
        console.log('- No compression artifacts or quality loss');
        console.log('- Images should display properly in admin dashboard');
        console.log('- Better image quality overall');
        console.log('');
        console.log('🔄 NEXT STEPS:');
        console.log('1. Test with your actual 1.9MB images in the frontend');
        console.log('2. Check that profile pictures and documents save properly');
        console.log('3. Verify images display correctly in admin dashboard');
        console.log('4. If images still show blank, the issue is likely URL/permissions');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testUncompressedImages(); 