#!/usr/bin/env node

const axios = require('axios');

const testJohnDoeRegistration = async () => {
  try {
    console.log('🧪 Testing registration for John Doe...');
    
    const response = await axios.post('http://192.168.1.96:8000/api/register', {
      email: 'john.doe@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      user_type: 'patient'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! John Doe registered successfully!');
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

testJohnDoeRegistration(); 