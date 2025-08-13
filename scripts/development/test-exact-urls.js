const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com/api';

async function testExactUrls() {
    try {
        console.log('🔍 Testing Exact URLs from API Response\n');
        
        // First get the actual URLs from the API
        console.log('1️⃣ Getting doctor data from API...');
        const response = await axios.get(`${BASE_URL}/doctors/active`, {
            headers: { 'Accept': 'application/json' }
        });

        if (response.data.success) {
            const doctors = response.data.data.data || response.data.data;
            console.log(`✅ Found ${doctors.length} doctors\n`);
            
            // Test each doctor's profile picture URL
            for (let i = 0; i < doctors.length; i++) {
                const doctor = doctors[i];
                if (doctor.profile_picture_url) {
                    console.log(`${i + 1}️⃣ Testing: ${doctor.first_name} ${doctor.last_name}`);
                    console.log(`   URL: ${doctor.profile_picture_url}`);
                    
                    try {
                        const imageResponse = await axios.get(doctor.profile_picture_url, {
                            timeout: 15000,
                            validateStatus: () => true
                        });
                        
                        console.log(`   Status: ${imageResponse.status}`);
                        console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
                        console.log(`   Content-Length: ${imageResponse.headers['content-length']}`);
                        
                        if (imageResponse.status === 200) {
                            console.log(`   ✅ Image accessible`);
                        } else {
                            console.log(`   ❌ Image not accessible (${imageResponse.status})`);
                        }
                    } catch (error) {
                        if (error.code === 'ECONNABORTED') {
                            console.log(`   ❌ Error: timeout exceeded`);
                        } else {
                            console.log(`   ❌ Error: ${error.message}`);
                        }
                    }
                    console.log('');
                }
            }
        } else {
            console.log('❌ API call failed:', response.data.message);
        }

    } catch (error) {
        console.error('❌ Error testing exact URLs:', error.response?.data || error.message);
    }
}

testExactUrls();
