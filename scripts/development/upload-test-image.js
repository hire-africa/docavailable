const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://docavailable-1.onrender.com/api';

async function uploadTestImage() {
    console.log('🔍 Testing Image Upload to Live Server\n');
    
    // First, let's check if we can access the upload endpoint
    console.log('1️⃣ Testing upload endpoint accessibility...');
    try {
        const response = await axios.get(`${BASE_URL}/upload/test`, {
            timeout: 10000,
            validateStatus: () => true
        });
        console.log(`   Upload endpoint status: ${response.status}`);
    } catch (error) {
        console.log(`   Upload endpoint error: ${error.message}`);
    }
    
    // Check if there's a file upload endpoint
    console.log('\n2️⃣ Testing file upload endpoint...');
    try {
        // Create a simple test image (1x1 pixel PNG)
        const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        
        const formData = new FormData();
        formData.append('image', testImageData, {
            filename: 'test-image.png',
            contentType: 'image/png'
        });
        
        const uploadResponse = await axios.post(`${BASE_URL}/upload/profile-picture`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Accept': 'application/json'
            },
            timeout: 15000,
            validateStatus: () => true
        });
        
        console.log(`   Upload response status: ${uploadResponse.status}`);
        console.log(`   Upload response data:`, uploadResponse.data);
        
        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
            console.log('   ✅ Upload successful!');
            return true;
        } else {
            console.log('   ❌ Upload failed');
        }
    } catch (error) {
        console.log(`   ❌ Upload error: ${error.message}`);
        if (error.response) {
            console.log(`   Response status: ${error.response.status}`);
            console.log(`   Response data:`, error.response.data);
        }
    }
    
    console.log('\n3️⃣ Checking if there are any existing upload endpoints...');
    
    // Test common upload endpoints
    const uploadEndpoints = [
        '/upload',
        '/upload/image',
        '/upload/profile-picture',
        '/api/upload',
        '/api/upload/image',
        '/api/upload/profile-picture'
    ];
    
    for (const endpoint of uploadEndpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                timeout: 5000,
                validateStatus: () => true
            });
            console.log(`   ${endpoint}: ${response.status}`);
        } catch (error) {
            console.log(`   ${endpoint}: Error - ${error.message}`);
        }
    }
    
    return false;
}

uploadTestImage();
