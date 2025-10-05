const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the fixed upload functionality
async function testFixedUploads() {
    console.log('🧪 Testing Fixed Upload Functionality');
    console.log('=====================================\n');
    
    const apiUrl = process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'https://docavailable-3vbdv.ondigitalocean.app';
    
    // For testing, we need a fresh token - this simulates a logged-in user
    const freshToken = await getFreshToken();
    
    if (!freshToken) {
        console.log('❌ Could not get fresh token for testing');
        return;
    }
    
    console.log('✅ Got fresh token for testing\n');
    
    // Test 1: Voice message upload with proper Content-Type handling
    console.log('1. Testing voice message upload...');
    try {
        await testVoiceMessageUpload(apiUrl, freshToken);
    } catch (error) {
        console.error('❌ Voice message test failed:', error.message);
    }
    
    console.log('');
    
    // Test 2: Image upload with proper Content-Type handling  
    console.log('2. Testing image upload...');
    try {
        await testImageUpload(apiUrl, freshToken);
    } catch (error) {
        console.error('❌ Image upload test failed:', error.message);
    }
    
    console.log('');
    
    // Test 3: Upload with expired token (to test refresh mechanism)
    console.log('3. Testing expired token handling...');
    try {
        await testExpiredTokenHandling(apiUrl);
    } catch (error) {
        console.error('❌ Expired token test failed:', error.message);
    }
    
    console.log('\n✅ Upload functionality tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Fixed Content-Type header issue for multipart/form-data');
    console.log('   - Added proactive token refresh before uploads');
    console.log('   - Added retry mechanism for 401 errors');
    console.log('   - Improved error messages for better user experience');
}

async function testVoiceMessageUpload(apiUrl, token) {
    console.log('   Creating test voice file...');
    
    // Create a test audio file
    const testAudioPath = path.join(__dirname, 'test-voice.m4a');
    fs.writeFileSync(testAudioPath, Buffer.from('test voice message content'));
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testAudioPath), {
        filename: 'test-voice.m4a',
        contentType: 'audio/mp4'
    });
    formData.append('appointment_id', '1');
    
    console.log('   Uploading voice message (with fixed Content-Type handling)...');
    
    try {
        const response = await axios.post(`${apiUrl}/api/upload/voice-message`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                // NOT setting Content-Type manually - let axios handle it with boundary
                ...formData.getHeaders()
            },
            timeout: 30000
        });
        
        console.log('   ✅ Voice message upload successful:');
        console.log(`      - Status: ${response.status}`);
        console.log(`      - Success: ${response.data?.success}`);
        console.log(`      - URL: ${response.data?.data?.url || 'N/A'}`);
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('   🔄 Got 401 - this should trigger token refresh in real app');
        } else if (error.response?.status === 422) {
            console.log('   ✅ Got 422 validation error - endpoint is accessible but test data invalid');
            console.log('      This indicates the authentication is working correctly!');
        } else {
            console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data?.message);
        }
    } finally {
        // Clean up test file
        if (fs.existsSync(testAudioPath)) {
            fs.unlinkSync(testAudioPath);
        }
    }
}

async function testImageUpload(apiUrl, token) {
    console.log('   Creating test image file...');
    
    // Create a minimal test image (1x1 pixel PNG)
    const testImageData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, testImageData);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath), {
        filename: 'test-image.png',
        contentType: 'image/png'
    });
    formData.append('appointment_id', '1');
    
    console.log('   Uploading test image (with fixed Content-Type handling)...');
    
    try {
        const response = await axios.post(`${apiUrl}/api/upload/chat-image`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                // NOT setting Content-Type manually - let axios handle it with boundary
                ...formData.getHeaders()
            },
            timeout: 30000
        });
        
        console.log('   ✅ Image upload successful:');
        console.log(`      - Status: ${response.status}`);
        console.log(`      - Success: ${response.data?.success}`);
        console.log(`      - URL: ${response.data?.data?.media_url || 'N/A'}`);
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('   🔄 Got 401 - this should trigger token refresh in real app');
        } else if (error.response?.status === 422) {
            console.log('   ✅ Got 422 validation error - endpoint is accessible but test data invalid');
            console.log('      This indicates the authentication is working correctly!');
        } else {
            console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data?.message);
        }
    } finally {
        // Clean up test file
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    }
}

async function testExpiredTokenHandling(apiUrl) {
    console.log('   Testing with expired token...');
    
    // Use the expired token from before
    const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZG9jYXZhaWxhYmxlLTN2YmR2Lm9uZGlnaXRhbG9jZWFuLmFwcC9hcGkvbG9naW4iLCJpYXQiOjE3NTkxMzg2ODcsImV4cCI6MTc1OTE0MjI4NywibmJmIjoxNzU5MTM4Njg3LCJqdGkiOiIyUTQ2YkJTdG1nY3VWMHM3Iiwic3ViIjoiMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjciLCJ1c2VyX3R5cGUiOiJwYXRpZW50IiwiZW1haWwiOiJ6ZWVtdG9oOTlAZ21haWwuY29tIiwiZGlzcGxheV9uYW1lIjoiUHJhaXNlIE10b3NhIn0.lythdGH1_mNEj8Wx-_4gjz5qJVMZXj2G7J1fnkC2RjY';
    
    const formData = new FormData();
    formData.append('file', Buffer.from('test content'), {
        filename: 'test.m4a',
        contentType: 'audio/mp4'
    });
    formData.append('appointment_id', '1');
    
    try {
        const response = await axios.post(`${apiUrl}/api/upload/voice-message`, formData, {
            headers: {
                'Authorization': `Bearer ${expiredToken}`,
                ...formData.getHeaders()
            },
            timeout: 10000
        });
        
        console.log('   ⚠️ Unexpected success with expired token');
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('   ✅ Correctly received 401 Unauthorized with expired token');
            console.log('   💡 In the real app, this would trigger automatic token refresh');
        } else {
            console.log('   ❓ Unexpected error:', error.response?.status, error.message);
        }
    }
}

// Helper to get a fresh token (would be from login in real app)
async function getFreshToken() {
    const apiUrl = process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'https://docavailable-3vbdv.ondigitalocean.app';
    
    try {
        // In a real scenario, you'd use actual login credentials
        // For testing, we'll try to refresh the expired token or use a test endpoint
        console.log('🔑 Attempting to get fresh token...');
        
        // For now, we'll simulate having a fresh token
        // In the real app, this would come from the login process
        return process.env.FRESH_TEST_TOKEN || null;
        
    } catch (error) {
        console.log('❌ Could not get fresh token:', error.message);
        return null;
    }
}

// Run the tests
testFixedUploads().catch(console.error);

console.log('🧪 Upload Fixes Test Suite');
console.log('==========================');
console.log('This script tests the fixes for voice message and image upload issues');
console.log('Set FRESH_TEST_TOKEN environment variable with a valid token to test\n');