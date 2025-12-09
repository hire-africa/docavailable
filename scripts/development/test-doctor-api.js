const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com/api';

async function testDoctorAPI() {
    try {
        console.log('🔍 Testing Doctor API for Profile Pictures\n');

        // Test the active doctors endpoint
        console.log('1️⃣ Testing /doctors/active endpoint...');
        const response = await axios.get(`${BASE_URL}/doctors/active`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.data.success) {
            const doctors = response.data.data.data || response.data.data;
            console.log(`✅ Found ${doctors.length} doctors`);
            
            doctors.forEach((doctor, index) => {
                console.log(`\n📋 Doctor ${index + 1}: ${doctor.first_name} ${doctor.last_name}`);
                console.log(`   - profile_picture: ${doctor.profile_picture || 'null'}`);
                console.log(`   - profile_picture_url: ${doctor.profile_picture_url || 'null'}`);
                console.log(`   - Has profile_picture: ${!!doctor.profile_picture}`);
                console.log(`   - Has profile_picture_url: ${!!doctor.profile_picture_url}`);
                
                if (doctor.profile_picture_url) {
                    console.log(`   - Full URL: ${doctor.profile_picture_url}`);
                }
            });
        } else {
            console.log('❌ API call failed:', response.data.message);
        }

    } catch (error) {
        console.error('❌ Error testing doctor API:', error.response?.data || error.message);
    }
}

testDoctorAPI();
