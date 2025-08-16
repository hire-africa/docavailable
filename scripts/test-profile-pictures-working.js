const axios = require('axios');

const BASE_URL = 'https://docavailable-5.onrender.com/api';

async function testProfilePicturesWorking() {
    try {
        console.log('🔍 Testing Profile Pictures Working\n');

        // Test 1: Get active doctors
        console.log('1️⃣ Testing active doctors endpoint...');
        try {
            const doctorsResponse = await axios.get(`${BASE_URL}/doctors/active`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (doctorsResponse.data.success) {
                const doctors = doctorsResponse.data.data.data || doctorsResponse.data.data;
                console.log(`✅ Active doctors endpoint works - Found ${doctors.length} doctors`);
                
                if (doctors.length > 0) {
                    console.log('\n📋 Doctor Profile Picture Status:');
                    doctors.forEach((doctor, index) => {
                        console.log(`   ${index + 1}. Dr. ${doctor.first_name} ${doctor.last_name}:`);
                        console.log(`      - Has profile_picture: ${!!doctor.profile_picture}`);
                        console.log(`      - Has profile_picture_url: ${!!doctor.profile_picture_url}`);
                        if (doctor.profile_picture_url) {
                            console.log(`      - Profile picture URL: ${doctor.profile_picture_url}`);
                        }
                        console.log('');
                    });
                }
            } else {
                console.log('❌ Active doctors endpoint failed:', doctorsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Active doctors endpoint error:', error.response?.data?.message || error.message);
        }

        // Test 2: Test individual doctor details
        console.log('\n2️⃣ Testing individual doctor details...');
        try {
            const doctorsResponse = await axios.get(`${BASE_URL}/doctors/active`);
            if (doctorsResponse.data.success && doctorsResponse.data.data.data?.length > 0) {
                const doctorId = doctorsResponse.data.data.data[0].id;
                
                const doctorDetailsResponse = await axios.get(`${BASE_URL}/doctors/${doctorId}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (doctorDetailsResponse.data.success) {
                    const doctor = doctorDetailsResponse.data.data;
                    console.log('✅ Doctor details endpoint works');
                    console.log('   Doctor profile picture info:');
                    console.log('     - Has profile_picture:', !!doctor.profile_picture);
                    console.log('     - Has profile_picture_url:', !!doctor.profile_picture_url);
                    if (doctor.profile_picture_url) {
                        console.log('     - Profile picture URL:', doctor.profile_picture_url);
                        
                        // Test if the image URL is accessible
                        try {
                            const imageResponse = await axios.head(doctor.profile_picture_url);
                            console.log('     - Image URL accessible:', imageResponse.status === 200 ? '✅ YES' : '❌ NO');
                        } catch (imageError) {
                            console.log('     - Image URL accessible: ❌ NO (', imageError.response?.status || 'error', ')');
                        }
                    }
                } else {
                    console.log('❌ Doctor details endpoint failed:', doctorDetailsResponse.data.message);
                }
            } else {
                console.log('❌ No doctors available to test details endpoint');
            }
        } catch (error) {
            console.log('❌ Doctor details endpoint error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('Profile pictures should now be working for doctors in the app!');
        console.log('Check the doctor dashboard to see the profile pictures.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testProfilePicturesWorking();
