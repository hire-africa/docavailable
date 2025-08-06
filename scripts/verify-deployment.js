const axios = require('axios');

const LIVE_BACKEND_URL = 'https://docavailable-1.onrender.com';
const LOCAL_BACKEND_URL = 'http://172.20.10.11:8000';

async function verifyDeployment() {
    console.log('🔍 Verifying DocAvailable Backend Deployment...\n');

    const tests = [
        {
            name: 'Health Check',
            url: `${LIVE_BACKEND_URL}/api/health`,
            expectedStatus: 200,
            expectedContentType: 'application/json'
        },
        {
            name: 'Authentication Endpoint',
            url: `${LIVE_BACKEND_URL}/api/user`,
            expectedStatus: 401, // Should return 401 without token
            expectedContentType: 'application/json'
        },
        {
            name: 'API Routes',
            url: `${LIVE_BACKEND_URL}/api`,
            expectedStatus: 404, // Should return 404 for root API
            expectedContentType: 'application/json'
        }
    ];

    for (const test of tests) {
        console.log(`Testing: ${test.name}`);
        console.log(`URL: ${test.url}`);
        
        try {
            const response = await axios.get(test.url, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Status: ${response.status}`);
            console.log(`📄 Content-Type: ${response.headers['content-type']}`);
            
            if (response.status === test.expectedStatus) {
                console.log('✅ Status matches expected');
            } else {
                console.log(`❌ Expected status ${test.expectedStatus}, got ${response.status}`);
            }

            if (response.headers['content-type']?.includes('application/json')) {
                console.log('✅ Response is JSON');
                console.log('📋 Response data:', JSON.stringify(response.data, null, 2));
            } else {
                console.log('❌ Response is not JSON');
                console.log('📋 Response content:', response.data.substring(0, 500));
            }

        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            
            if (error.response) {
                console.log(`📊 Status: ${error.response.status}`);
                console.log(`📄 Content-Type: ${error.response.headers['content-type']}`);
                
                if (error.response.status === test.expectedStatus) {
                    console.log('✅ Status matches expected (error case)');
                }
                
                if (error.response.headers['content-type']?.includes('application/json')) {
                    console.log('✅ Error response is JSON');
                    console.log('📋 Error data:', JSON.stringify(error.response.data, null, 2));
                } else {
                    console.log('❌ Error response is not JSON');
                    console.log('📋 Error content:', error.response.data.substring(0, 500));
                }
            }
        }
        
        console.log('---\n');
    }

    // Test local backend for comparison
    console.log('🔄 Testing local backend for comparison...');
    try {
        const localResponse = await axios.get(`${LOCAL_BACKEND_URL}/api/health`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log('✅ Local backend is working');
        console.log('📋 Local response:', JSON.stringify(localResponse.data, null, 2));
    } catch (error) {
        console.log('❌ Local backend test failed:', error.message);
    }
}

// Run the verification
verifyDeployment().catch(console.error); 