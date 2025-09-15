const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com/api';

async function testApiHealth() {
    console.log('🔍 Testing API Health\n');
    
    const endpoints = [
        '/doctors/active',
        '/users/profile',
        '/health',
        '/'
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`${i + 1}️⃣ Testing: ${BASE_URL}${endpoint}`);
        
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                timeout: 10000,
                headers: { 'Accept': 'application/json' },
                validateStatus: () => true
            });
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);
            
            if (response.status === 200) {
                console.log(`   ✅ Endpoint working`);
            } else {
                console.log(`   ⚠️ Endpoint returned ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ❌ Error: timeout exceeded`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }
}

testApiHealth();
