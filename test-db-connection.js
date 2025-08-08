const https = require('https');

console.log('🔍 Testing Database Connection Configuration...\n');

function testDBConfig() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'docavailable-1.onrender.com',
      port: 443,
      path: '/api/test-env',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
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
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkDBConfig() {
  try {
    console.log('📡 Checking database configuration...');
    const result = await testDBConfig();
    
    console.log(`📊 Status: ${result.statusCode}`);
    console.log(`📄 Response: ${result.data}\n`);
    
    if (result.statusCode === 200) {
      console.log('✅ Backend is responding');
      console.log('📋 Database configuration details above');
    } else {
      console.log('❌ Could not get database configuration');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkDBConfig(); 