const https = require('https');

console.log('🔍 Testing Production Registration...\n');

function testRegistration() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      user_type: 'patient'
    });

    const options = {
      hostname: 'docavailable-1.onrender.com',
      port: 443,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

    req.write(postData);
    req.end();
  });
}

async function testProduction() {
  try {
    console.log('📡 Testing registration endpoint...');
    const result = await testRegistration();
    
    console.log(`📊 Status: ${result.statusCode}`);
    console.log(`📄 Response: ${result.data}\n`);
    
    if (result.statusCode === 500) {
      console.log('❌ 500 Error - Backend is running but encountering issues');
      console.log('💡 Possible causes:');
      console.log('1. Database migrations not run');
      console.log('2. Database connection issues');
      console.log('3. Missing columns in database');
      console.log('4. Environment variables not properly loaded');
      
      console.log('\n🔧 Next Steps:');
      console.log('1. Check Render logs for detailed error');
      console.log('2. Run database migrations on production');
      console.log('3. Verify database connection');
    } else if (result.statusCode === 200 || result.statusCode === 201) {
      console.log('✅ SUCCESS! Registration is working!');
    } else if (result.statusCode === 422) {
      console.log('⚠️ Validation error (expected) - Backend is working!');
    } else {
      console.log(`❓ Unexpected status: ${result.statusCode}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testProduction(); 