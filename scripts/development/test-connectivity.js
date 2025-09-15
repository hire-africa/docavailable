const axios = require('axios');

async function testConnectivity() {
    console.log('🔍 Testing API Connectivity\n');
    console.log('==========================\n');

    const baseURLs = [
        'http://172.20.10.11:8000',
        'http://172.20.10.11:8000',
        'http://127.0.0.1:8000',
        'http://10.0.2.2:8000', // Android emulator
        'http://192.168.1.100:8000',
        'http://192.168.1.101:8000',
        'http://192.168.1.102:8000',
        'http://192.168.1.103:8000',
        'http://192.168.1.104:8000',
        'http://192.168.1.105:8000',
    ];

    for (const baseURL of baseURLs) {
        try {
            console.log(`Testing: ${baseURL}/api/health`);
            const response = await axios.get(`${baseURL}/api/health`, {
                timeout: 3000,
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (response.status === 200) {
                console.log(`✅ SUCCESS: ${baseURL} is reachable`);
                console.log(`   Response:`, response.data);
                console.log('');
                return baseURL;
            }
        } catch (error) {
            console.log(`❌ FAILED: ${baseURL} - ${error.message}`);
        }
    }

    console.log('❌ No working API endpoints found');
    return null;
}

// Test the endpoints
testConnectivity()
    .then((workingURL) => {
        if (workingURL) {
            console.log(`🎯 Recommended API URL: ${workingURL}`);
            console.log('\nTo fix the issue, update your .env file with:');
            console.log(`EXPO_PUBLIC_API_BASE_URL=${workingURL}`);
            console.log(`EXPO_PUBLIC_LARAVEL_API_URL=${workingURL}`);
        }
    })
    .catch(console.error); 