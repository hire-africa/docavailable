const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testStorageUrls() {
    try {
        console.log('🔍 Testing Storage URL Generation\n');

        // Test 1: Check if we can access a known image
        console.log('1. Testing access to known image...');
        
        const testImageUrl = 'http://172.20.10.11:8000/storage/profile-pictures/9b7cfdaf-df10-4873-bd41-ddf8e50694eb.jpg';
        console.log('Testing URL:', testImageUrl);
        
        try {
            const imageResponse = await axios.get(testImageUrl, { 
                timeout: 5000,
                responseType: 'arraybuffer',
                validateStatus: () => true
            });
            
            if (imageResponse.status === 200) {
                console.log(`✅ Image accessible (${imageResponse.data.length} bytes)`);
                
                // Check if it's a valid image
                const buffer = Buffer.from(imageResponse.data);
                const header = buffer.slice(0, 4).toString('hex');
                console.log(`File header: ${header}`);
                
                if (header.startsWith('ffd8ff')) {
                    console.log('✅ Valid JPEG file');
                } else {
                    console.log('⚠️  Unknown file format');
                }
            } else {
                console.log(`❌ Image not accessible (Status: ${imageResponse.status})`);
            }
        } catch (error) {
            console.log(`❌ Error accessing image: ${error.message}`);
        }

        // Test 2: Check Laravel storage configuration
        console.log('\n2. Testing Laravel storage configuration...');
        
        const storageTestUrl = 'http://172.20.10.11:8000/storage/profile-pictures/test.jpg';
        console.log('Testing storage URL pattern:', storageTestUrl);
        
        try {
            const response = await axios.get(storageTestUrl, { 
                timeout: 5000,
                validateStatus: () => true
            });
            console.log(`Storage test response: ${response.status}`);
        } catch (error) {
            console.log(`Storage test error: ${error.message}`);
        }

        // Test 3: Test registration to see what URLs are generated
        console.log('\n3. Testing registration to see URL generation...');
        
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
                },
                timeout: 10000
            });

            if (registerResponse.data.success) {
                const user = registerResponse.data.data.user;
                console.log('✅ Registration successful!');
                console.log('Profile Picture Path:', user.profile_picture);
                console.log('Profile Picture URL:', user.profile_picture_url);
                
                if (user.profile_picture_url) {
                    console.log('✅ URL generated correctly');
                    
                    // Test the generated URL
                    try {
                        const urlResponse = await axios.get(user.profile_picture_url, { 
                            timeout: 5000,
                            responseType: 'arraybuffer',
                            validateStatus: () => true
                        });
                        
                        if (urlResponse.status === 200) {
                            console.log(`✅ Generated URL works (${urlResponse.data.length} bytes)`);
                        } else {
                            console.log(`❌ Generated URL doesn't work (Status: ${urlResponse.status})`);
                        }
                    } catch (error) {
                        console.log(`❌ Generated URL error: ${error.message}`);
                    }
                } else {
                    console.log('❌ No URL generated');
                }
            } else {
                console.log('❌ Registration failed:', registerResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Registration error:', error.response?.data?.message || error.message);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('The storage structure looks correct:');
        console.log('- Images are saved in: storage/app/public/profile-pictures/');
        console.log('- URLs should be: http://172.20.10.11:8000/storage/profile-pictures/filename.jpg');
        console.log('- Laravel storage link should make these accessible');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testStorageUrls(); 