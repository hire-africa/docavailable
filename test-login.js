const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

// Test users from the seeder
const testUsers = [
    {
        email: 'admin@example.com',
        password: 'password123',
        userType: 'admin'
    },
    {
        email: 'doctor@example.com',
        password: 'password123',
        userType: 'doctor'
    },
    {
        email: 'patient@example.com',
        password: 'password123',
        userType: 'patient'
    }
];

async function testLogin() {
    console.log('🧪 Testing Login Functionality\n');
    console.log('================================\n');

    for (const user of testUsers) {
        console.log(`Testing login for ${user.userType}: ${user.email}`);
        
        try {
            // Test login
            const loginResponse = await axios.post(`${BASE_URL}/login`, {
                email: user.email,
                password: user.password
            });

            if (loginResponse.data.success) {
                console.log(`✅ Login successful for ${user.userType}`);
                console.log(`   User ID: ${loginResponse.data.data.user.id}`);
                console.log(`   User Type: ${loginResponse.data.data.user.user_type}`);
                console.log(`   Status: ${loginResponse.data.data.user.status}`);
                console.log(`   Token received: ${!!loginResponse.data.data.token}`);
                
                // Test getting current user with token
                const token = loginResponse.data.data.token;
                const userResponse = await axios.get(`${BASE_URL}/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (userResponse.data.success) {
                    console.log(`✅ Current user endpoint working`);
                }
                
            } else {
                console.log(`❌ Login failed: ${loginResponse.data.message}`);
            }
            
        } catch (error) {
            console.log(`❌ Login error: ${error.response?.data?.message || error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }

    console.log('🎉 Login testing completed!');
}

// Run the test
testLogin().catch(console.error); 