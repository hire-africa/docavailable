const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testImageUrls() {
    try {
        console.log('🔍 Testing Image URL Accessibility...\n');

        // 1. Get pending doctors to see their image URLs
        console.log('1. Fetching pending doctors...');
        const doctorsResponse = await axios.get(`${BASE_URL}/admin/pending-doctors`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // You'll need to replace this
            }
        });

        if (!doctorsResponse.data.success) {
            console.log('❌ Failed to fetch doctors:', doctorsResponse.data.message);
            return;
        }

        const doctors = doctorsResponse.data.data.data;
        console.log(`✅ Found ${doctors.length} pending doctors`);

        // 2. Test each doctor's images
        for (let i = 0; i < Math.min(doctors.length, 3); i++) {
            const doctor = doctors[i];
            console.log(`\n📋 Testing Doctor ${i + 1}: ${doctor.display_name || doctor.email}`);
            
            // Test profile picture
            if (doctor.profile_picture_url) {
                console.log(`   Profile Picture URL: ${doctor.profile_picture_url}`);
                try {
                    const imageResponse = await axios.get(doctor.profile_picture_url, { 
                        timeout: 5000,
                        responseType: 'arraybuffer'
                    });
                    console.log(`   ✅ Profile picture accessible (${imageResponse.data.length} bytes)`);
                } catch (error) {
                    console.log(`   ❌ Profile picture not accessible: ${error.message}`);
                }
            } else {
                console.log('   ⚠️  No profile picture URL');
            }

            // 3. Get detailed doctor info to test document URLs
            console.log(`   Getting detailed info for doctor ID: ${doctor.id}`);
            try {
                const detailsResponse = await axios.get(`${BASE_URL}/admin/doctors/${doctor.id}`, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // You'll need to replace this
                    }
                });

                if (detailsResponse.data.success) {
                    const doctorDetails = detailsResponse.data.data;
                    
                    // Test document URLs
                    const documents = [
                        { name: 'National ID', url: doctorDetails.national_id_url },
                        { name: 'Medical Degree', url: doctorDetails.certificate_image_url },
                        { name: 'Medical License', url: doctorDetails.license_image_url }
                    ];

                    for (const doc of documents) {
                        if (doc.url) {
                            console.log(`   ${doc.name} URL: ${doc.url}`);
                            try {
                                const docResponse = await axios.get(doc.url, { 
                                    timeout: 5000,
                                    responseType: 'arraybuffer'
                                });
                                console.log(`   ✅ ${doc.name} accessible (${docResponse.data.length} bytes)`);
                            } catch (error) {
                                console.log(`   ❌ ${doc.name} not accessible: ${error.message}`);
                            }
                        } else {
                            console.log(`   ⚠️  No ${doc.name} URL`);
                        }
                    }
                } else {
                    console.log(`   ❌ Failed to get doctor details: ${detailsResponse.data.message}`);
                }
            } catch (error) {
                console.log(`   ❌ Error getting doctor details: ${error.message}`);
            }
        }

        console.log('\n🔍 DIAGNOSIS:');
        console.log('If images are accessible but showing blank in the app, the issue might be:');
        console.log('1. CORS issues (images not loading due to cross-origin restrictions)');
        console.log('2. Image format issues (corrupted or invalid image data)');
        console.log('3. Frontend image rendering issues');
        console.log('4. URL construction problems');
        console.log('');
        console.log('If images are NOT accessible, the issue is:');
        console.log('1. Backend URL generation problems');
        console.log('2. File storage issues');
        console.log('3. File permissions problems');
        console.log('4. Missing files');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testImageUrls(); 