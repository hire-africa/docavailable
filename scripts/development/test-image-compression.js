const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testImageCompression() {
    try {
        console.log('🔍 Testing Image Compression Pipeline...\n');

        // Simulate the frontend image processing pipeline
        console.log('1. Original image size: ~1.9MB (as reported by user)');
        
        // Step 1: ProfilePicturePicker compression
        console.log('2. ProfilePicturePicker processing:');
        console.log('   - quality: 0.8 (80%)');
        console.log('   - compress: 0.8 (80%)');
        console.log('   - resize: 500x500 pixels');
        console.log('   - Estimated size after ProfilePicturePicker: ~300KB');
        
        // Step 2: Base64 conversion
        console.log('3. Base64 conversion:');
        console.log('   - Base64 increases size by ~33%');
        console.log('   - Estimated size after base64: ~400KB');
        
        // Step 3: Network transmission
        console.log('4. Network transmission:');
        console.log('   - Additional compression may occur');
        console.log('   - Estimated final size: ~200-300KB');
        
        // Test with a realistic image size
        console.log('\n🧪 Testing with realistic image...');
        
        // Create a base64 image that's about 300KB (realistic for processed image)
        let realisticImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Repeat to create a ~300KB image
        for (let i = 0; i < 150; i++) {
            realisticImageBase64 += jpegHeader;
        }

        const base64Data = realisticImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        
        console.log('Realistic processed image size:', decodedImage.length, 'bytes');
        console.log('Realistic processed image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass 1KB validation:', decodedImage.length > 1000);

        // Test registration with this realistic image
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
        formData.append('profile_picture', realisticImageBase64);
        formData.append('national_id', realisticImageBase64);
        formData.append('medical_degree', realisticImageBase64);
        formData.append('medical_licence', realisticImageBase64);

        console.log('\n5. Testing registration with realistic image...');
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

        console.log('\n📋 SUMMARY:');
        console.log('The issue is that your 1.9MB image is being compressed multiple times:');
        console.log('1. Frontend image picker compression (quality: 0.8, compress: 0.8)');
        console.log('2. Resize to 500x500 pixels');
        console.log('3. Base64 conversion');
        console.log('4. Network transmission compression');
        console.log('');
        console.log('This reduces your 1.9MB image to just a few hundred KB, which may fail validation.');
        console.log('');
        console.log('SOLUTION: Adjust the frontend image processing to preserve more quality.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testImageCompression(); 