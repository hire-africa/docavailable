const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testDoctorProfilePictures() {
    try {
        console.log('🔍 Testing Doctor Profile Pictures\n');

        // Test 1: Get active doctors (this should work without auth)
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
                    const firstDoctor = doctors[0];
                    console.log('   First doctor profile picture info:');
                    console.log('     - Has profile_picture:', !!firstDoctor.profile_picture);
                    console.log('     - Has profile_picture_url:', !!firstDoctor.profile_picture_url);
                    if (firstDoctor.profile_picture_url) {
                        console.log('     - Profile picture URL:', firstDoctor.profile_picture_url);
                    }
                }
            } else {
                console.log('❌ Active doctors endpoint failed:', doctorsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Active doctors endpoint error:', error.response?.data?.message || error.message);
        }

        // Test 2: Test doctor details endpoint (used in doctor profile page)
        console.log('\n2️⃣ Testing doctor details endpoint...');
        try {
            // First get a doctor ID from active doctors
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
                    }
                    console.log('   Doctor info:', {
                        id: doctor.id,
                        name: doctor.display_name,
                        specialization: doctor.specialization,
                        rating: doctor.rating
                    });
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
        console.log('Both endpoints should return profile picture data for the doctor profile page to work correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDoctorProfilePictures(); 