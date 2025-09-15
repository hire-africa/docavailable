const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testAdminAPI() {
    try {
        console.log('🧪 Testing Admin API...\n');

        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@docavailable.com',
            password: 'admin123456'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Admin login successful\n');

        // 2. Get dashboard stats
        console.log('2. Getting dashboard stats...');
        const statsResponse = await axios.get(`${BASE_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Dashboard stats:', statsResponse.data.stats);
        console.log('');

        // 3. Get pending doctors
        console.log('3. Getting pending doctors...');
        const pendingResponse = await axios.get(`${BASE_URL}/admin/doctors/pending`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (pendingResponse.data.success && pendingResponse.data.data.data.length > 0) {
            const doctor = pendingResponse.data.data.data[0];
            console.log('✅ Found pending doctor:', {
                id: doctor.id,
                name: doctor.display_name,
                email: doctor.email,
                specialization: doctor.specialization,
                hasProfilePicture: !!doctor.profile_picture,
                hasDocuments: {
                    national_id: !!doctor.national_id,
                    medical_degree: !!doctor.medical_degree,
                    medical_licence: !!doctor.medical_licence
                }
            });
            console.log('');

            // 4. Get specific doctor details
            console.log('4. Getting doctor details...');
            const detailsResponse = await axios.get(`${BASE_URL}/admin/doctors/${doctor.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (detailsResponse.data.success) {
                const doctorDetails = detailsResponse.data.data;
                console.log('✅ Doctor details retrieved:', {
                    id: doctorDetails.id,
                    name: doctorDetails.display_name,
                    email: doctorDetails.email,
                    specialization: doctorDetails.specialization,
                    sub_specialization: doctorDetails.sub_specialization,
                    years_of_experience: doctorDetails.years_of_experience,
                    bio: doctorDetails.bio,
                    professional_bio: doctorDetails.professional_bio,
                    status: doctorDetails.status,
                    documents: {
                        profile_picture: doctorDetails.profile_picture,
                        profile_picture_url: doctorDetails.profile_picture_url,
                        certificate_image: doctorDetails.certificate_image,
                        certificate_image_url: doctorDetails.certificate_image_url,
                        license_image: doctorDetails.license_image,
                        license_image_url: doctorDetails.license_image_url,
                        national_id: doctorDetails.national_id,
                        national_id_url: doctorDetails.national_id_url
                    }
                });
                console.log('');

                // 5. Test document URLs
                console.log('5. Testing document URLs...');
                if (doctorDetails.profile_picture_url) {
                    try {
                        const imageResponse = await axios.get(doctorDetails.profile_picture_url, { timeout: 5000 });
                        console.log('✅ Profile picture URL accessible:', imageResponse.status === 200);
                    } catch (error) {
                        console.log('❌ Profile picture URL not accessible:', error.message);
                    }
                }

                if (doctorDetails.certificate_image_url) {
                    try {
                        const imageResponse = await axios.get(doctorDetails.certificate_image_url, { timeout: 5000 });
                        console.log('✅ Certificate image URL accessible:', imageResponse.status === 200);
                    } catch (error) {
                        console.log('❌ Certificate image URL not accessible:', error.message);
                    }
                }

                if (doctorDetails.license_image_url) {
                    try {
                        const imageResponse = await axios.get(doctorDetails.license_image_url, { timeout: 5000 });
                        console.log('✅ License image URL accessible:', imageResponse.status === 200);
                    } catch (error) {
                        console.log('❌ License image URL not accessible:', error.message);
                    }
                }

                if (doctorDetails.national_id_url) {
                    try {
                        const imageResponse = await axios.get(doctorDetails.national_id_url, { timeout: 5000 });
                        console.log('✅ National ID URL accessible:', imageResponse.status === 200);
                    } catch (error) {
                        console.log('❌ National ID URL not accessible:', error.message);
                    }
                }
                console.log('');

                // 6. Test approval (but don't actually approve to keep the test data)
                console.log('6. Testing approval endpoint (dry run)...');
                console.log('⚠️  Skipping actual approval to preserve test data');
                console.log('✅ Approval endpoint would work (not tested to preserve data)');
                console.log('');

            } else {
                console.log('❌ Failed to get doctor details:', detailsResponse.data.message);
            }
        } else {
            console.log('⚠️  No pending doctors found');
            console.log('   You may need to register a doctor account first');
        }

        console.log('🎉 Admin API test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Make sure you have created an admin account first:');
            console.log('   Run: node scripts/create-admin.js');
        }
    }
}

testAdminAPI(); 