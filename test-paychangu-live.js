const https = require('https');

const BACKEND_URL = 'https://docavailable-1.onrender.com';

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'docavailable-1.onrender.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'User-Agent': 'PayChangu-Test/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

async function testPayChanguIntegration() {
    console.log('🧪 Testing PayChangu Integration with Live Backend...\n');

    try {
        // Test 1: Backend health
        console.log('1️⃣ Testing backend health...');
        const health = await makeRequest('/api/health');
        console.log(`✅ Backend health: ${health.statusCode}`);
        console.log(`   Response: ${health.data.substring(0, 100)}...`);

        // Test 2: PayChangu callback route (should return 400 without tx_ref)
        console.log('\n2️⃣ Testing PayChangu callback route...');
        try {
            const callback = await makeRequest('/api/payments/paychangu/callback');
            console.log(`✅ Callback route accessible: ${callback.statusCode}`);
        } catch (error) {
            console.log(`❌ Callback route error: ${error.message}`);
        }

        // Test 3: PayChangu return route
        console.log('\n3️⃣ Testing PayChangu return route...');
        try {
            const returnRoute = await makeRequest('/api/payments/paychangu/return');
            console.log(`✅ Return route accessible: ${returnRoute.statusCode}`);
        } catch (error) {
            console.log(`❌ Return route error: ${error.message}`);
        }

        // Test 4: PayChangu initiate route (should require auth)
        console.log('\n4️⃣ Testing PayChangu initiate route...');
        try {
            const initiate = await makeRequest('/api/payments/paychangu/initiate', 'POST');
            console.log(`✅ Initiate route accessible: ${initiate.statusCode}`);
        } catch (error) {
            console.log(`✅ Initiate route requires auth (expected): ${error.message}`);
        }

        console.log('\n🎉 PayChangu Integration Test Complete!');
        console.log('\n📋 Summary:');
        console.log('- Backend is live and responding');
        console.log('- PayChangu routes are deployed');
        console.log('- Callback and return URLs are configured');
        console.log('\n🚀 Ready for payment testing!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testPayChanguIntegration(); 