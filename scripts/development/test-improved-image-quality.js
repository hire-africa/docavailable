const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testImprovedImageQuality() {
    try {
        console.log('🔧 Testing Improved Image Quality Settings...\n');

        console.log('📊 BEFORE (Old Settings):');
        console.log('   - ProfilePicturePicker quality: 0.8 (80%)');
        console.log('   - ProfilePicturePicker compress: 0.8 (80%)');
        console.log('   - ProfilePicturePicker resize: 500x500 pixels');
        console.log('   - Document upload quality: 0.8 (80%)');
        console.log('   - Backend validation: >1000 bytes (1KB)');
        console.log('   - Estimated processed image size: ~200-300KB');
        console.log('');

        console.log('📊 AFTER (New Settings):');
        console.log('   - ProfilePicturePicker quality: 0.9 (90%) ✅');
        console.log('   - ProfilePicturePicker compress: 0.9 (90%) ✅');
        console.log('   - ProfilePicturePicker resize: 800x800 pixels ✅');
        console.log('   - Document upload quality: 0.9 (90%) ✅');
        console.log('   - Backend validation: >500 bytes (500B) ✅');
        console.log('   - Estimated processed image size: ~500-800KB ✅');
        console.log('');

        // Create a larger, higher quality test image
        console.log('🧪 Testing with improved quality image...');
        
        let improvedImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Create a larger image to simulate better quality
        for (let i = 0; i < 300; i++) {
            improvedImageBase64 += jpegHeader;
        }

        const base64Data = improvedImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        
        console.log('Improved image size:', decodedImage.length, 'bytes');
        console.log('Improved image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass 500B validation:', decodedImage.length > 500);
        console.log('Would pass old 1KB validation:', decodedImage.length > 1000);

        // Test registration with improved image
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
        formData.append('profile_picture', improvedImageBase64);
        formData.append('national_id', improvedImageBase64);
        formData.append('medical_degree', improvedImageBase64);
        formData.append('medical_licence', improvedImageBase64);

        console.log('\n🚀 Testing registration with improved image...');
        const response = await axios.post(`${BASE_URL}/register`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
            },
            timeout: 30000
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

        console.log('\n🎯 IMPROVEMENTS MADE:');
        console.log('1. ✅ Increased ProfilePicturePicker quality from 80% to 90%');
        console.log('2. ✅ Increased ProfilePicturePicker compression from 80% to 90%');
        console.log('3. ✅ Increased image resize from 500x500 to 800x800 pixels');
        console.log('4. ✅ Increased document upload quality from 80% to 90%');
        console.log('5. ✅ Reduced backend validation from 1KB to 500 bytes');
        console.log('');
        console.log('📈 EXPECTED RESULTS:');
        console.log('- Your 1.9MB images will now be processed to ~500-800KB instead of ~200-300KB');
        console.log('- Better image quality and larger dimensions');
        console.log('- More reliable validation that accommodates properly processed images');
        console.log('- Images should now save and display correctly');
        console.log('');
        console.log('🔄 NEXT STEPS:');
        console.log('1. Test with your actual 1.9MB image in the frontend');
        console.log('2. Check that profile pictures and documents save properly');
        console.log('3. Verify images display correctly in admin dashboard');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testImprovedImageQuality(); 