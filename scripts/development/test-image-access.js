const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com';

async function testImageAccess() {
    console.log('🔍 Testing Image Access with Extended Timeout\n');

    const testUrls = [
        `${BASE_URL}/api/images/profile-pictures/doctor3.jpg`,
        `${BASE_URL}/api/images/profile-pictures/doctor2.jpg`,
        `${BASE_URL}/api/images/profile_pictures/kBznaFXCGfKH7Kb322zeCkH9Cyp4MWs8hos1hrsb.png`
    ];

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`${i + 1}️⃣ Testing: ${url}`);
        
        try {
            const response = await axios.get(url, {
                timeout: 30000, // 30 seconds timeout
                validateStatus: () => true // Don't throw on any status
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            console.log(`   Content-Length: ${response.headers['content-length']}`);
            
            if (response.status === 200) {
                console.log(`   ✅ Image accessible`);
            } else {
                console.log(`   ❌ Image not accessible (${response.status})`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ❌ Error: timeout of 30000ms exceeded`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }
}

testImageAccess(); 