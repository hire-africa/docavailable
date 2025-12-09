const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';

async function testLoginErrors() {
    console.log('🧪 Testing Enhanced Login Error Handling\n');

    const tests = [
        {
            name: 'Empty Email and Password',
            data: { email: '', password: '' },
            expectedError: 'validation_error'
        },
        {
            name: 'Invalid Email Format',
            data: { email: 'invalid-email', password: 'password123' },
            expectedError: 'validation_error'
        },
        {
            name: 'Missing Password',
            data: { email: 'test@example.com', password: '' },
            expectedError: 'validation_error'
        },
        {
            name: 'Non-existent Email',
            data: { email: 'nonexistent@example.com', password: 'password123' },
            expectedError: 'email_not_found'
        },
        {
            name: 'Wrong Password for Existing Email',
            data: { email: 'admin@docavailable.com', password: 'wrongpassword' },
            expectedError: 'invalid_password'
        }
    ];

    for (const test of tests) {
        console.log(`📋 Test: ${test.name}`);
        try {
            const response = await axios.post(`${BASE_URL}/login`, test.data);
            console.log('❌ Expected error but got success response');
        } catch (error) {
            if (error.response) {
                const { status, data } = error.response;
                console.log(`✅ Status: ${status}`);
                console.log(`📝 Message: ${data.message}`);
                console.log(`🏷️  Error Type: ${data.error_type || 'N/A'}`);
                if (data.suggestion) {
                    console.log(`💡 Suggestion: ${data.suggestion}`);
                }
                if (data.errors) {
                    console.log(`🔍 Field Errors:`, data.errors);
                }
                
                // Check if we got the expected error type
                if (data.error_type === test.expectedError) {
                    console.log('✅ Expected error type received');
                } else {
                    console.log(`❌ Expected ${test.expectedError} but got ${data.error_type}`);
                }
            } else {
                console.log('❌ Network error:', error.message);
            }
        }
        console.log('---\n');
    }

    // Test successful login
    console.log('📋 Test: Valid Login Credentials');
    try {
        const response = await axios.post(`${BASE_URL}/login`, {
            email: 'admin@docavailable.com',
            password: 'admin123'
        });
        
        if (response.data.success) {
            console.log('✅ Login successful');
            console.log(`👤 User: ${response.data.data.user.email}`);
            console.log(`🔑 Token: ${response.data.data.token ? 'Present' : 'Missing'}`);
        } else {
            console.log('❌ Login failed:', response.data.message);
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.message || error.message);
    }
    console.log('---\n');

    console.log('🎉 Login error handling tests completed!');
}

// Run the tests
testLoginErrors().catch(console.error); 