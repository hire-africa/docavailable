#!/usr/bin/env node

const axios = require('axios');

const testRegistration = async () => {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    const response = await axios.post('http://172.20.10.11:8000/api/register', {
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      password_confirmation: 'password123',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'patient'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Registration worked!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Registration failed');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Network Error:', error.message);
    }
  }
};

testRegistration(); 