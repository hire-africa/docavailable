const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com';

async function testImageServing() {
    try {
        console.log('🔍 Testing new image serving route...\n');
        
        // Test 1: Check if backend is accessible
        console.log('1. Testing backend accessibility...');
        try {
            const response = await axios.get(`${BASE_URL}/api/health`);
            console.log('✅ Backend is accessible');
        } catch (error) {
            console.log('❌ Backend not accessible:', error.message);
            return;
        }
        
        // Test 2: Test the new image serving route with a known image
        console.log('\n2. Testing new image serving route...');
        const testImagePath = 'profile_pictures/uGQyuHw7sM6OCPeeJxzcYxdJEhaTl49pjZcc2nRS.jpg';
        const imageUrl = `${BASE_URL}/api/images/${testImagePath}`;
        
        try {
            const response = await axios.get(imageUrl);
            console.log(`✅ Image serving route works!`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            console.log(`   Content-Length: ${response.headers['content-length']}`);
            console.log(`   URL: ${imageUrl}`);
        } catch (error) {
            console.log(`❌ Image serving route failed: ${error.response?.status || error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data: ${JSON.stringify(error.response.data)}`);
            }
        }
        
        // Test 3: Test with different image types
        console.log('\n3. Testing different image types...');
        const testImages = [
            'profile_pictures/7ozZu3f484bgGpNa4OVwR7jQtJRSw6rl7osEMJrt.jpg',
            'profile_pictures/5mXbwB1AEr2sNTewnVxRnvrzMqkOwokgMQljkA09.jpg',
            'profile_pictures/exZs8Ei9fH14tKbGlmGNpd1sDdhnqdulG4G9rZA4.jpg'
        ];
        
        for (const imagePath of testImages) {
            try {
                const response = await axios.get(`${BASE_URL}/api/images/${imagePath}`);
                console.log(`✅ ${imagePath} - Status: ${response.status}`);
            } catch (error) {
                console.log(`❌ ${imagePath} - ${error.response?.status || error.message}`);
            }
        }
        
        // Test 4: Test invalid paths (security)
        console.log('\n4. Testing security (invalid paths)...');
        const invalidPaths = [
            'invalid/path.jpg',
            '../profile_pictures/test.jpg',
            'profile_pictures/../../../etc/passwd'
        ];
        
        for (const invalidPath of invalidPaths) {
            try {
                const response = await axios.get(`${BASE_URL}/api/images/${invalidPath}`);
                console.log(`❌ Security issue: ${invalidPath} returned ${response.status}`);
            } catch (error) {
                console.log(`✅ Security working: ${invalidPath} correctly blocked (${error.response?.status || 'error'})`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testImageServing(); 