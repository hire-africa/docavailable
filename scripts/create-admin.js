const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://172.20.10.11:8000';

// Admin account details
const adminData = {
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@doc.com',
    password: '000000009',
    password_confirmation: '000000009'
};

async function createFirstAdmin() {
    try {
        console.log('Creating first admin account...');
        console.log('API URL:', `${API_BASE_URL}/api/create-first-admin`);
        console.log('Admin data:', { ...adminData, password: '***', password_confirmation: '***' });

        const response = await axios.post(`${API_BASE_URL}/api/create-first-admin`, adminData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.data.success) {
            console.log('✅ Admin account created successfully!');
            console.log('User ID:', response.data.data.user.id);
            console.log('Email:', response.data.data.user.email);
            console.log('Token:', response.data.data.token.substring(0, 20) + '...');
            console.log('\nYou can now login to the admin dashboard with:');
            console.log('Email:', adminData.email);
            console.log('Password:', adminData.password);
        } else {
            console.log('❌ Failed to create admin account:', response.data.message);
        }
    } catch (error) {
        if (error.response) {
            console.log('❌ Error response:', error.response.status, error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

// Run the script
createFirstAdmin(); 