const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testImageUrlsComprehensive() {
    try {
        console.log('🔍 Comprehensive Image URL Test\n');

        // Test 1: Registration with profile picture
        console.log('1. Testing Registration with Profile Picture...');
        
        // Create a test image (small JPEG)
        const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        const registrationData = new FormData();
        registrationData.append('first_name', 'Test');
        registrationData.append('last_name', 'User');
        registrationData.append('email', `testuser${Date.now()}@example.com`);
        registrationData.append('password', 'password123');
        registrationData.append('password_confirmation', 'password123');
        registrationData.append('date_of_birth', '1990-01-01');
        registrationData.append('gender', 'male');
        registrationData.append('country', 'Test Country');
        registrationData.append('city', 'Test City');
        registrationData.append('user_type', 'patient');
        registrationData.append('profile_picture', testImageBase64);

        try {
            const registerResponse = await axios.post(`${BASE_URL}/register`, registrationData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (registerResponse.data.success) {
                const user = registerResponse.data.data.user;
                console.log('✅ Registration successful');
                console.log('   User ID:', user.id);
                console.log('   Profile Picture Path:', user.profile_picture);
                console.log('   Profile Picture URL:', user.profile_picture_url);
                
                if (user.profile_picture_url) {
                    console.log('   ✅ Profile picture URL generated correctly');
                    
                    // Test if the URL is accessible
                    try {
                        const imageResponse = await axios.get(user.profile_picture_url, { 
                            timeout: 5000,
                            responseType: 'arraybuffer',
                            validateStatus: () => true
                        });
                        
                        if (imageResponse.status === 200) {
                            console.log(`   ✅ Image accessible (${imageResponse.data.length} bytes)`);
                        } else {
                            console.log(`   ⚠️  Image not accessible (Status: ${imageResponse.status})`);
                        }
                    } catch (error) {
                        console.log(`   ❌ Image access error: ${error.message}`);
                    }
                } else {
                    console.log('   ❌ No profile picture URL generated');
                }

                // Test 2: Login with the same user
                console.log('\n2. Testing Login...');
                
                const loginResponse = await axios.post(`${BASE_URL}/login`, {
                    email: user.email,
                    password: 'password123'
                });

                if (loginResponse.data.success) {
                    const loginUser = loginResponse.data.data.user;
                    console.log('✅ Login successful');
                    console.log('   Profile Picture URL:', loginUser.profile_picture_url);
                    
                    if (loginUser.profile_picture_url) {
                        console.log('   ✅ Profile picture URL present in login response');
                    } else {
                        console.log('   ❌ No profile picture URL in login response');
                    }

                    // Test 3: Get current user
                    console.log('\n3. Testing Get Current User...');
                    
                    const token = loginResponse.data.data.token;
                    const userResponse = await axios.get(`${BASE_URL}/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (userResponse.data.success) {
                        const currentUser = userResponse.data.data;
                        console.log('✅ Get current user successful');
                        console.log('   Profile Picture URL:', currentUser.profile_picture_url);
                        
                        if (currentUser.profile_picture_url) {
                            console.log('   ✅ Profile picture URL present in current user response');
                        } else {
                            console.log('   ❌ No profile picture URL in current user response');
                        }

                        // Test 4: Refresh token
                        console.log('\n4. Testing Token Refresh...');
                        
                        const refreshResponse = await axios.post(`${BASE_URL}/refresh`, {}, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (refreshResponse.data.success) {
                            const refreshUser = refreshResponse.data.data.user;
                            console.log('✅ Token refresh successful');
                            console.log('   Profile Picture URL:', refreshUser.profile_picture_url);
                            
                            if (refreshUser.profile_picture_url) {
                                console.log('   ✅ Profile picture URL present in refresh response');
                            } else {
                                console.log('   ❌ No profile picture URL in refresh response');
                            }
                        } else {
                            console.log('❌ Token refresh failed');
                        }
                    } else {
                        console.log('❌ Get current user failed');
                    }
                } else {
                    console.log('❌ Login failed');
                }
            } else {
                console.log('❌ Registration failed:', registerResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Registration error:', error.response?.data?.message || error.message);
        }

        // Test 5: Doctor registration with documents
        console.log('\n5. Testing Doctor Registration with Documents...');
        
        const doctorEmail = `testdoctor${Date.now()}@example.com`;
        const doctorData = new FormData();
        doctorData.append('first_name', 'Test');
        doctorData.append('last_name', 'Doctor');
        doctorData.append('email', doctorEmail);
        doctorData.append('password', 'password123');
        doctorData.append('password_confirmation', 'password123');
        doctorData.append('date_of_birth', '1980-01-01');
        doctorData.append('gender', 'male');
        doctorData.append('country', 'Test Country');
        doctorData.append('city', 'Test City');
        doctorData.append('user_type', 'doctor');
        doctorData.append('specialization', 'Cardiology');
        doctorData.append('sub_specialization', 'Interventional Cardiology');
        doctorData.append('years_of_experience', '10');
        doctorData.append('bio', 'Test doctor bio');
        doctorData.append('profile_picture', testImageBase64);
        doctorData.append('national_id', testImageBase64);
        doctorData.append('medical_degree', testImageBase64);
        doctorData.append('medical_licence', testImageBase64);

        try {
            const doctorRegisterResponse = await axios.post(`${BASE_URL}/register`, doctorData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (doctorRegisterResponse.data.success) {
                const doctor = doctorRegisterResponse.data.data.user;
                console.log('✅ Doctor registration successful');
                console.log('   Doctor ID:', doctor.id);
                console.log('   Profile Picture URL:', doctor.profile_picture_url);
                console.log('   National ID URL:', doctor.national_id_url);
                console.log('   Medical Degree URL:', doctor.medical_degree_url);
                console.log('   Medical Licence URL:', doctor.medical_licence_url);
                
                const hasAllUrls = doctor.profile_picture_url && doctor.national_id_url && 
                                 doctor.medical_degree_url && doctor.medical_licence_url;
                
                if (hasAllUrls) {
                    console.log('   ✅ All document URLs generated correctly');
                } else {
                    console.log('   ❌ Some document URLs missing');
                }
            } else {
                console.log('❌ Doctor registration failed:', doctorRegisterResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Doctor registration error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('The backend should now generate full URLs for all image fields:');
        console.log('- profile_picture_url');
        console.log('- national_id_url');
        console.log('- medical_degree_url');
        console.log('- medical_licence_url');
        console.log('');
        console.log('These URLs will be accessible via:');
        console.log('http://172.20.10.11:8000/storage/[path]');
        console.log('');
        console.log('The frontend should now display images correctly!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testImageUrlsComprehensive(); 