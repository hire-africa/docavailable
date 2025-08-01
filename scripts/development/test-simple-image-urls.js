const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testSimpleImageUrls() {
    try {
        console.log('🔍 Simple Image URL Test\n');

        // Test 1: Simple registration with profile picture
        console.log('1. Testing Registration with Profile Picture...');
        
        // Create a minimal test image
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

        console.log('Sending registration request...');
        
        const registerResponse = await axios.post(`${BASE_URL}/register`, registrationData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 10000
        });

        console.log('Registration response received');
        console.log('Success:', registerResponse.data.success);
        console.log('Message:', registerResponse.data.message);

        if (registerResponse.data.success) {
            const user = registerResponse.data.data.user;
            console.log('\n✅ Registration successful!');
            console.log('User ID:', user.id);
            console.log('Email:', user.email);
            console.log('Profile Picture Path:', user.profile_picture);
            console.log('Profile Picture URL:', user.profile_picture_url);
            
            if (user.profile_picture_url) {
                console.log('✅ Profile picture URL generated correctly!');
                console.log('URL format looks correct:', user.profile_picture_url.startsWith('http'));
            } else {
                console.log('❌ No profile picture URL generated');
            }

            // Test 2: Login
            console.log('\n2. Testing Login...');
            
            const loginResponse = await axios.post(`${BASE_URL}/login`, {
                email: user.email,
                password: 'password123'
            });

            if (loginResponse.data.success) {
                const loginUser = loginResponse.data.data.user;
                console.log('✅ Login successful!');
                console.log('Profile Picture URL in login:', loginUser.profile_picture_url);
                
                if (loginUser.profile_picture_url) {
                    console.log('✅ Profile picture URL present in login response');
                } else {
                    console.log('❌ No profile picture URL in login response');
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
                    console.log('✅ Get current user successful!');
                    console.log('Profile Picture URL in current user:', currentUser.profile_picture_url);
                    
                    if (currentUser.profile_picture_url) {
                        console.log('✅ Profile picture URL present in current user response');
                    } else {
                        console.log('❌ No profile picture URL in current user response');
                    }
                } else {
                    console.log('❌ Get current user failed');
                }
            } else {
                console.log('❌ Login failed:', loginResponse.data.message);
            }
        } else {
            console.log('❌ Registration failed:', registerResponse.data.message);
            if (registerResponse.data.errors) {
                console.log('Errors:', registerResponse.data.errors);
            }
        }

        console.log('\n🎯 SUMMARY:');
        console.log('If you see ✅ marks above, the image URL generation is working!');
        console.log('The backend should now return profile_picture_url for all user endpoints.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testSimpleImageUrls(); 