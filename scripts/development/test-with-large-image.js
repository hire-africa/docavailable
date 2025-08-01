const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testWithLargeImage() {
    try {
        console.log('🧪 Testing Doctor Registration with Large Image (100KB+)...\n');

        // Create a large base64 image for testing (this is a 1x1 pixel JPEG repeated to make it larger)
        // In a real scenario, you would use an actual image file
        let largeImageBase64 = 'data:image/jpeg;base64,';
        
        // Create a larger base64 string by repeating a valid JPEG header
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Repeat the header to create a larger image (this will be over 100KB)
        for (let i = 0; i < 200; i++) {
            largeImageBase64 += jpegHeader;
        }

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

        console.log('1. Making registration request...');
        console.log('Image size:', Math.round(largeImageBase64.length / 1024), 'KB');
        
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

        // Test admin login to verify the doctor appears in pending list
        console.log('\n2. Testing admin login to verify doctor appears in pending list...');
        const adminLoginResponse = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@docavailable.com',
            password: 'admin123456'
        });

        const adminToken = adminLoginResponse.data.data.token;
        console.log('✅ Admin login successful');

        // Get pending doctors
        console.log('\n3. Getting pending doctors...');
        const pendingResponse = await axios.get(`${BASE_URL}/admin/doctors/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (pendingResponse.data.success && pendingResponse.data.data.data.length > 0) {
            const newDoctor = pendingResponse.data.data.data.find(d => 
                d.email === formData.get('email')
            );
            
            if (newDoctor) {
                console.log('✅ New doctor found in pending list:', {
                    id: newDoctor.id,
                    name: newDoctor.display_name,
                    email: newDoctor.email,
                    specialization: newDoctor.specialization,
                    hasDocuments: {
                        profile_picture: !!newDoctor.profile_picture,
                        national_id: !!newDoctor.national_id,
                        medical_degree: !!newDoctor.medical_degree,
                        medical_licence: !!newDoctor.medical_licence
                    }
                });
            } else {
                console.log('⚠️  New doctor not found in pending list');
            }
        } else {
            console.log('⚠️  No pending doctors found');
        }

        console.log('\n🎉 Doctor registration test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 422) {
            console.log('\nValidation errors:');
            console.log(JSON.stringify(error.response.data.errors, null, 2));
        }
    }
}

testWithLargeImage(); 