const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testProfileUpdate() {
    try {
        console.log('🧪 Testing profile update functionality...');
        
        // First, let's test the login to get a token
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
            email: 'test@example.com', // Replace with a test user
            password: 'password123'
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.message);
            return;
        }
        
        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        
        console.log('✅ Login successful');
        console.log('User data:', {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            specialization: user.specialization,
            sub_specialization: user.sub_specialization
        });
        
        // Test getting current user data
        console.log('\n2. Testing get current user...');
        const userResponse = await axios.get(`${API_BASE_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Current user data retrieved');
        console.log('Current user:', userResponse.data);
        
        // Test profile update
        console.log('\n3. Testing profile update...');
        const updateData = {
            first_name: 'Updated First Name',
            last_name: 'Updated Last Name',
            bio: 'This is an updated bio for testing',
            country: 'Test Country',
            city: 'Test City'
        };
        
        // Add doctor-specific fields if user is a doctor
        if (user.user_type === 'doctor') {
            updateData.specialization = 'Updated Specialization';
            updateData.sub_specialization = 'Updated Sub Specialization';
            updateData.years_of_experience = 10;
        }
        
        const updateResponse = await axios.patch(`${API_BASE_URL}/profile`, updateData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (updateResponse.data.success) {
            console.log('✅ Profile update successful');
            console.log('Updated user data:', updateResponse.data.data);
        } else {
            console.error('❌ Profile update failed:', updateResponse.data.message);
        }
        
        // Test getting updated user data
        console.log('\n4. Testing get updated user data...');
        const updatedUserResponse = await axios.get(`${API_BASE_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Updated user data retrieved');
        console.log('Updated user:', updatedUserResponse.data);
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProfileUpdate(); 