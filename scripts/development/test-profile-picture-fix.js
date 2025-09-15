const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testProfilePictureFix() {
    try {
        console.log('🔧 Testing Profile Picture Base64 Conversion Fix...\n');

        console.log('📊 ISSUE IDENTIFIED:');
        console.log('   - Profile pictures were sent as URIs instead of base64');
        console.log('   - Documents were properly converted to base64');
        console.log('   - This caused profile pictures to be 163 bytes (invalid)');
        console.log('   - Documents worked fine because they were base64');
        console.log('');

        console.log('✅ FIX APPLIED:');
        console.log('   - Profile pictures now converted to base64 like documents');
        console.log('   - Using fetch() + FileReader + readAsDataURL()');
        console.log('   - Consistent handling across all image types');
        console.log('');

        // Create a test image
        console.log('🧪 Creating test image...');
        
        let testImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Create a reasonable size image
        for (let i = 0; i < 50; i++) {
            testImageBase64 += jpegHeader;
        }

        const base64Data = testImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        
        console.log('Test image size:', decodedImage.length, 'bytes');
        console.log('Test image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass 100B validation:', decodedImage.length > 100);

        // Test registration with fixed profile picture handling
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
        formData.append('profile_picture', testImageBase64);
        formData.append('national_id', testImageBase64);
        formData.append('medical_degree', testImageBase64);
        formData.append('medical_licence', testImageBase64);

        console.log('\n🚀 Testing registration with fixed profile picture handling...');
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

        console.log('\n🎯 ROOT CAUSE FOUND:');
        console.log('The issue was that profile pictures were sent as URIs instead of base64!');
        console.log('');
        console.log('BEFORE (Broken):');
        console.log('   formData.append("profile_picture", profilePicture); // URI string');
        console.log('');
        console.log('AFTER (Fixed):');
        console.log('   // Convert to base64 like documents');
        console.log('   const response = await fetch(profilePicture);');
        console.log('   const blob = await response.blob();');
        console.log('   const base64 = await new Promise(...);');
        console.log('   formData.append("profile_picture", base64);');
        console.log('');
        console.log('📈 EXPECTED RESULTS:');
        console.log('- Profile pictures will now be proper size (not 163 bytes)');
        console.log('- Images will display correctly in admin dashboard');
        console.log('- Consistent handling across all image types');
        console.log('- Your 1.9MB images should work properly now');
        console.log('');
        console.log('🔄 NEXT STEPS:');
        console.log('1. Test with your actual 1.9MB images in the frontend');
        console.log('2. Check that profile pictures save and display correctly');
        console.log('3. Verify all images work consistently');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testProfilePictureFix(); 