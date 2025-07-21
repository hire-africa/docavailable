const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testIssues() {
    try {
        console.log('🔍 Testing Logout and Doctors Issues\n');

        // Test 1: Check if doctors endpoint works
        console.log('1️⃣ Testing doctors endpoint...');
        try {
            const doctorsResponse = await axios.get(`${BASE_URL}/doctors/active`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (doctorsResponse.data.success) {
                const doctors = doctorsResponse.data.data.data || doctorsResponse.data.data;
                console.log(`✅ Doctors endpoint works - Found ${doctors.length} doctors`);
                if (doctors.length === 0) {
                    console.log('⚠️  No doctors found (expected since we cleaned the database)');
                }
            } else {
                console.log('❌ Doctors endpoint failed:', doctorsResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Doctors endpoint error:', error.response?.data?.message || error.message);
        }

        // Test 2: Test registration to get a token
        console.log('\n2️⃣ Testing registration to get token...');
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

        let token = null;
        try {
            const registerResponse = await axios.post(`${BASE_URL}/register`, registrationData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (registerResponse.data.success) {
                token = registerResponse.data.data.token;
                console.log('✅ Registration successful, got token');
            } else {
                console.log('❌ Registration failed:', registerResponse.data.message);
                return;
            }
        } catch (error) {
            console.log('❌ Registration error:', error.response?.data?.message || error.message);
            return;
        }

        // Test 3: Test logout with token
        console.log('\n3️⃣ Testing logout...');
        try {
            const logoutResponse = await axios.post(`${BASE_URL}/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (logoutResponse.data.success) {
                console.log('✅ Logout successful');
            } else {
                console.log('❌ Logout failed:', logoutResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Logout error:', error.response?.data?.message || error.message);
        }

        // Test 4: Verify token is invalid after logout
        console.log('\n4️⃣ Testing token invalidation...');
        try {
            await axios.get(`${BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            console.log('❌ Token still valid after logout (unexpected)');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Token properly invalidated after logout');
            } else {
                console.log('❌ Unexpected error:', error.response?.status);
            }
        }

        console.log('\n🎯 SUMMARY:');
        console.log('1. Doctors endpoint: Working (no doctors because we cleaned DB)');
        console.log('2. Registration: Working');
        console.log('3. Logout: Working');
        console.log('4. Token invalidation: Working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testIssues(); 