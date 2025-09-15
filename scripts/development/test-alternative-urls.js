const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com';

async function testAlternativeUrls() {
    console.log('🔍 Testing Alternative URL Structures\n');
    
    // Test different URL patterns
    const testPatterns = [
        // Direct storage with different path structures
        `${BASE_URL}/storage/app/public/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/storage/app/public/profile_pictures/doctor1.jpg`,
        `${BASE_URL}/public/storage/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/public/storage/profile_pictures/doctor1.jpg`,
        
        // API routes with different structures
        `${BASE_URL}/api/storage/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/api/storage/profile_pictures/doctor1.jpg`,
        `${BASE_URL}/api/files/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/api/files/profile_pictures/doctor1.jpg`,
        
        // Direct file access
        `${BASE_URL}/profile-pictures/doctor1.jpg`,
        `${BASE_URL}/profile_pictures/doctor1.jpg`,
        
        // With different file extensions
        `${BASE_URL}/storage/profile-pictures/doctor1.png`,
        `${BASE_URL}/storage/profile-pictures/doctor1.jpeg`,
        `${BASE_URL}/storage/profile-pictures/doctor1.webp`
    ];
    
    for (let i = 0; i < testPatterns.length; i++) {
        const url = testPatterns[i];
        console.log(`${i + 1}️⃣ Testing: ${url}`);
        
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                validateStatus: () => true
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            
            if (response.status === 200) {
                console.log(`   ✅ Image accessible!`);
                console.log(`   🎉 Found working URL pattern: ${url}`);
                return url; // Found a working pattern
            } else if (response.status === 404) {
                console.log(`   ❌ Not found`);
            } else {
                console.log(`   ⚠️ Status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ❌ Timeout`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }
    
    console.log('❌ No working URL pattern found');
    return null;
}

testAlternativeUrls();
