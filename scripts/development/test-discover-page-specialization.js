const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testDiscoverPageSpecialization() {
    try {
        console.log('🔍 Testing Discover Page Doctor Specialization\n');

        // Test 1: Get active doctors (this is what the discover page uses)
        console.log('1️⃣ Testing active doctors endpoint for discover page...');
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
                    console.log('\n📋 Doctor Specializations:');
                    doctors.forEach((doctor, index) => {
                        console.log(`\n   Doctor ${index + 1}: ${doctor.display_name || doctor.email}`);
                        console.log(`   ID: ${doctor.id}`);
                        console.log(`   Specialization: ${doctor.specialization || 'Not set'}`);
                        console.log(`   Occupation: ${doctor.occupation || 'Not set'}`);
                        console.log(`   Years of Experience: ${doctor.years_of_experience || 'Not set'}`);
                        console.log(`   Status: ${doctor.status}`);
                        
                        // Check what the frontend would display
                        const frontendSpecialization = doctor.specialization || doctor.occupation || 'General Medicine';
                        console.log(`   Frontend will display: "${frontendSpecialization}"`);
                        
                        if (doctor.specialization) {
                            console.log(`   ✅ Has specialization: "${doctor.specialization}"`);
                        } else if (doctor.occupation) {
                            console.log(`   ⚠️  Using occupation as fallback: "${doctor.occupation}"`);
                        } else {
                            console.log(`   ❌ No specialization or occupation - will show "General Medicine"`);
                        }
                    });
                } else {
                    console.log('⚠️  No doctors found');
                }
            } else {
                console.log('❌ Active doctors endpoint failed:', doctorsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Active doctors endpoint error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('The discover page should now show the correct doctor specialization instead of "General Medicine"');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDiscoverPageSpecialization(); 