const axios = require('axios');

// Replace with your actual Render URL
const BASE_URL = 'https://docavailable-5.onrender.com/api';

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
    console.log(`Testing against: ${BASE_URL}\n`);

    for (const user of testUsers) {
        console.log(`Testing login for ${user.userType}: ${user.email}`);
        
        try {
            // Test login
            const loginResponse = await axios.post(`${BASE_URL}/login`, {
                email: user.email,
                password: user.password
            });
            
            console.log('✅ Login successful!');
            console.log('Response status:', loginResponse.status);
            console.log('Response data:', JSON.stringify(loginResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Login failed!');
            console.log('Error status:', error.response?.status);
            console.log('Error message:', error.response?.data?.message || error.message);
            console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
        }
        
        console.log('---\n');
    }
}

// Test API health first
async function testApiHealth() {
    console.log('🏥 Testing API Health...\n');
    
    try {
        const response = await axios.get(`${BASE_URL.replace('/api', '')}/api/health`);
        console.log('✅ API is healthy!');
        console.log('Response:', response.data);
    } catch (error) {
        console.log('❌ API health check failed!');
        console.log('Error:', error.message);
    }
    
    console.log('\n');
}

// Run tests
async function runTests() {
    await testApiHealth();
    await testLogin();
}

runTests().catch(console.error);
