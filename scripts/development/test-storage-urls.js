const axios = require('axios');

async function testStorageUrls() {
    try {
        console.log('🔍 Testing Direct Storage URLs\n');

        // Test direct storage URLs
        const testUrls = [
            'https://docavailable-1.onrender.com/storage/profile-pictures/doctor3.jpg',
            'https://docavailable-1.onrender.com/storage/profile-pictures/doctor2.jpg',
            'https://docavailable-1.onrender.com/storage/profile-pictures/doctor1.jpg'
        ];

        for (let i = 0; i < testUrls.length; i++) {
            const url = testUrls[i];
            console.log(`\n${i + 1}️⃣ Testing: ${url}`);
            
            try {
                const response = await axios.get(url, {
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status < 500; // Accept all status codes less than 500
                    }
                });
                
                console.log(`   Status: ${response.status}`);
                console.log(`   Content-Type: ${response.headers['content-type']}`);
                console.log(`   Content-Length: ${response.headers['content-length']}`);
                
                if (response.status === 200) {
                    console.log('   ✅ Image accessible via direct storage URL');
                } else if (response.status === 404) {
                    console.log('   ❌ Image not found (404)');
                } else if (response.status === 403) {
                    console.log('   ❌ Access forbidden (403)');
                } else {
                    console.log(`   ⚠️ Unexpected status: ${response.status}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                if (error.response) {
                    console.log(`   Status: ${error.response.status}`);
                    console.log(`   Data: ${error.response.data}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error testing storage URLs:', error.message);
    }
}

testStorageUrls(); 