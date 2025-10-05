const AsyncStorage = require('@react-native-async-storage/async-storage');
const axios = require('axios');

// Test authentication token storage and validity
async function debugAuthToken() {
    console.log('🔍 Debugging authentication token...\n');
    
    try {
        // 1. Check if token exists in AsyncStorage
        console.log('1. Checking AsyncStorage for auth token...');
        let token;
        
        try {
            // In Node.js environment, we'll simulate AsyncStorage
            // In a real React Native environment, this would work directly
            console.log('   - AsyncStorage check (simulated for Node.js)');
            token = process.env.TEST_AUTH_TOKEN || 'your-test-token-here';
            console.log(`   - Token found: ${token ? 'YES' : 'NO'}`);
            console.log(`   - Token length: ${token ? token.length : 0}`);
            console.log(`   - Token preview: ${token ? token.substring(0, 50) + '...' : 'None'}\n`);
        } catch (error) {
            console.log('   - Error retrieving token from AsyncStorage:', error.message);
            return;
        }

        if (!token) {
            console.log('❌ No authentication token found in storage');
            console.log('💡 Suggestions:');
            console.log('   - Make sure user is logged in');
            console.log('   - Check if login process is storing the token properly');
            console.log('   - Try logging out and logging back in\n');
            return;
        }

        // 2. Decode JWT token to check expiration (without verification)
        console.log('2. Analyzing JWT token...');
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                console.log('   - Token type: JWT');
                console.log('   - Issued at:', new Date(payload.iat * 1000).toISOString());
                console.log('   - Expires at:', new Date(payload.exp * 1000).toISOString());
                
                const now = Date.now();
                const expiryTime = payload.exp * 1000;
                const timeUntilExpiry = expiryTime - now;
                
                if (timeUntilExpiry > 0) {
                    console.log(`   - Status: VALID (expires in ${Math.ceil(timeUntilExpiry / 1000 / 60)} minutes)`);
                } else {
                    console.log('   - Status: EXPIRED');
                    console.log('💡 Token has expired - user needs to log in again\n');
                    return;
                }
            } else {
                console.log('   - Token type: Not a standard JWT');
            }
        } catch (decodeError) {
            console.log('   - Could not decode token as JWT:', decodeError.message);
            console.log('   - Proceeding with API validation...');
        }
        console.log('');

        // 3. Test token validity with API call
        console.log('3. Testing token validity with API...');
        const apiUrl = process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'https://docavailable-3vbdv.ondigitalocean.app';
        
        try {
            const response = await axios.get(`${apiUrl}/api/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`   - API Response Status: ${response.status}`);
            console.log(`   - API Response Success: ${response.data?.success}`);
            console.log(`   - User ID: ${response.data?.data?.id}`);
            console.log(`   - User Email: ${response.data?.data?.email}`);
            console.log('   - Token is VALID for API calls ✅\n');
            
        } catch (apiError) {
            console.log('   - API call failed:', apiError.response?.status || apiError.code);
            console.log('   - API error message:', apiError.response?.data?.message || apiError.message);
            
            if (apiError.response?.status === 401) {
                console.log('   - Token is INVALID or EXPIRED ❌');
                console.log('💡 User needs to log in again\n');
            } else {
                console.log('   - Network or server error (token might still be valid)\n');
            }
            return;
        }

        // 4. Test upload endpoint specifically
        console.log('4. Testing voice message upload endpoint access...');
        try {
            // Create a small test file
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('file', Buffer.from('test audio content'), {
                filename: 'test-voice.m4a',
                contentType: 'audio/mp4'
            });
            formData.append('appointment_id', '1');

            const uploadResponse = await axios.post(`${apiUrl}/api/upload/voice-message`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                },
                timeout: 15000
            });

            console.log(`   - Upload endpoint status: ${uploadResponse.status}`);
            console.log(`   - Upload response success: ${uploadResponse.data?.success}`);
            console.log('   - Upload endpoint is accessible ✅\n');

        } catch (uploadError) {
            console.log('   - Upload endpoint test failed:', uploadError.response?.status || uploadError.code);
            console.log('   - Upload error message:', uploadError.response?.data?.message || uploadError.message);
            
            if (uploadError.response?.status === 401) {
                console.log('   - Upload endpoint returns UNAUTHORIZED ❌');
                console.log('💡 This confirms the authentication issue\n');
            } else if (uploadError.response?.status === 422) {
                console.log('   - Upload endpoint accessible but validation failed (this is expected for test data) ✅\n');
            } else {
                console.log('   - Upload endpoint error (might be server-side issue)\n');
            }
        }

        console.log('✅ Authentication token diagnosis completed!');
        console.log('\n📋 Next Steps:');
        console.log('   1. If token is expired: Implement automatic token refresh');
        console.log('   2. If token is missing: Fix login process');
        console.log('   3. If upload endpoint fails: Check backend authentication middleware');
        console.log('   4. Test with a fresh login to get a new token\n');

    } catch (error) {
        console.error('❌ Error during token diagnosis:', error.message);
        console.error('💡 Make sure the API server is running and accessible\n');
    }
}

// Helper function to simulate getting token from React Native AsyncStorage
async function getStoredToken() {
    // In a real React Native app, this would be:
    // return await AsyncStorage.getItem('auth_token');
    
    // For testing purposes, we'll check environment variable
    return process.env.TEST_AUTH_TOKEN || null;
}

// Run the debug script
debugAuthToken().catch(console.error);

console.log('🔧 Debug Auth Token Script');
console.log('=========================');
console.log('This script checks authentication token storage and validity');
console.log('To use with a real token, set TEST_AUTH_TOKEN environment variable\n');