const axios = require('axios');

const BASE_URL = 'https://docavailable-5.onrender.com/api';

async function testSimpleEndpoints() {
    console.log('🔍 Testing Simple API Endpoints\n');
    console.log('================================\n');

    // Test health endpoint
    console.log('1. Testing /health endpoint:');
    try {
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('Status:', healthResponse.status);
        console.log('Content-Type:', healthResponse.headers['content-type']);
        console.log('Response length:', healthResponse.data.length);
        console.log('First 200 chars:', JSON.stringify(healthResponse.data).substring(0, 200));
        console.log('---\n');
    } catch (error) {
        console.log('Error:', error.message);
        console.log('---\n');
    }

    // Test login with simple credentials
    console.log('2. Testing /login endpoint:');
    try {
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        console.log('Status:', loginResponse.status);
        console.log('Content-Type:', loginResponse.headers['content-type']);
        console.log('Response length:', loginResponse.data.length);
        console.log('First 200 chars:', JSON.stringify(loginResponse.data).substring(0, 200));
        console.log('---\n');
    } catch (error) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data length:', error.response.data.length);
            console.log('First 200 chars:', JSON.stringify(error.response.data).substring(0, 200));
        }
        console.log('---\n');
    }

    // Test a non-existent endpoint to see what happens
    console.log('3. Testing non-existent endpoint:');
    try {
        const testResponse = await axios.get(`${BASE_URL}/test-nonexistent`);
        console.log('Status:', testResponse.status);
        console.log('Content-Type:', testResponse.headers['content-type']);
        console.log('Response length:', testResponse.data.length);
        console.log('First 200 chars:', JSON.stringify(testResponse.data).substring(0, 200));
    } catch (error) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data length:', error.response.data.length);
            console.log('First 200 chars:', JSON.stringify(error.response.data).substring(0, 200));
        }
    }
}

testSimpleEndpoints().catch(console.error);

