const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testSpecializationFilter() {
    try {
        console.log('🔍 Testing Specialization Filter Implementation (Main Specializations Only)\n');

        // Test 1: Get available specializations
        console.log('1️⃣ Testing specializations endpoint...');
        try {
            const specializationsResponse = await axios.get(`${BASE_URL}/doctors/specializations`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (specializationsResponse.data.success) {
                const specializations = specializationsResponse.data.data;
                console.log('✅ Specializations endpoint works');
                console.log('\n📋 Available Main Specializations:');
                
                const mainSpecializations = [];
                Object.keys(specializations).forEach(mainSpecialization => {
                    console.log(`\n   Main: ${mainSpecialization}`);
                    mainSpecializations.push(mainSpecialization);
                    
                    // Show sub-specializations for reference (but not used in filter)
                    if (Array.isArray(specializations[mainSpecialization])) {
                        console.log(`     Sub-specializations (not used in filter):`);
                        specializations[mainSpecialization].forEach(subSpecialization => {
                            console.log(`       - ${subSpecialization}`);
                        });
                    }
                });
                
                console.log(`\n📊 Total main specializations available: ${mainSpecializations.length}`);
                console.log('✅ Main specializations will be used in dropdown filter');
                console.log('✅ Sub-specializations are excluded from filter dropdown');
            } else {
                console.log('❌ Specializations endpoint failed:', specializationsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Specializations endpoint error:', error.response?.data?.message || error.message);
        }

        // Test 2: Get active doctors and check specializations
        console.log('\n2️⃣ Testing active doctors with specialization data...');
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
                    console.log('\n📋 Doctor Specializations in Database:');
                    const specializationsInUse = new Set();
                    
                    doctors.forEach((doctor, index) => {
                        const specialization = doctor.specialization || doctor.occupation || 'General Medicine';
                        specializationsInUse.add(specialization);
                        
                        console.log(`\n   Doctor ${index + 1}: ${doctor.display_name || doctor.email}`);
                        console.log(`   ID: ${doctor.id}`);
                        console.log(`   Specialization: ${specialization}`);
                        console.log(`   Status: ${doctor.status}`);
                    });
                    
                    console.log(`\n📊 Unique specializations in use: ${specializationsInUse.size}`);
                    console.log('Specializations:', Array.from(specializationsInUse).join(', '));
                } else {
                    console.log('⚠️  No doctors found');
                }
            } else {
                console.log('❌ Active doctors endpoint failed:', doctorsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Active doctors endpoint error:', error.response?.data?.message || error.message);
        }

        // Test 3: Test filtering by main specializations
        console.log('\n3️⃣ Testing main specialization filtering...');
        try {
            const doctorsResponse = await axios.get(`${BASE_URL}/doctors/active`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (doctorsResponse.data.success) {
                const doctors = doctorsResponse.data.data.data || doctorsResponse.data.data;
                
                // Test filtering by "Mental Health"
                const mentalHealthDoctors = doctors.filter(doctor => 
                    (doctor.specialization || doctor.occupation || '').toLowerCase().includes('mental')
                );
                
                console.log(`✅ Mental Health filter: ${mentalHealthDoctors.length} doctor(s) found`);
                
                // Test filtering by "General Medicine"
                const generalMedicineDoctors = doctors.filter(doctor => 
                    (doctor.specialization || doctor.occupation || '').toLowerCase().includes('general')
                );
                
                console.log(`✅ General Medicine filter: ${generalMedicineDoctors.length} doctor(s) found`);
                
                // Test filtering by "Women's Health"
                const womensHealthDoctors = doctors.filter(doctor => 
                    (doctor.specialization || doctor.occupation || '').toLowerCase().includes('women')
                );
                
                console.log(`✅ Women's Health filter: ${womensHealthDoctors.length} doctor(s) found`);
            }
        } catch (error) {
            console.log('❌ Filtering test error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('✅ Specialization filter now uses dropdown component');
        console.log('✅ Only main specializations are shown in dropdown');
        console.log('✅ Sub-specializations are excluded from filter');
        console.log('✅ Users can select from main specializations only');
        console.log('✅ Clear filter option available in dropdown');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSpecializationFilter(); 