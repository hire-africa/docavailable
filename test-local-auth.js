const http = require('http');

console.log('🔍 Testing Local Backend Authentication...\n');

function testLocalRegistration() {
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
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
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

async function testLocalBackend() {
  try {
    console.log('📡 Testing local registration endpoint...');
    const result = await testLocalRegistration();
    
    console.log(`📊 Status: ${result.statusCode}`);
    console.log(`📄 Response: ${result.data}\n`);
    
    if (result.statusCode === 200 || result.statusCode === 201) {
      console.log('✅ SUCCESS! Local backend registration is working!');
      console.log('🚀 Your React Native app should work with local backend!');
    } else if (result.statusCode === 422) {
      console.log('⚠️ Validation error (expected) - Local backend is working!');
      console.log('🚀 Your React Native app should work with local backend!');
    } else if (result.statusCode === 500) {
      console.log('❌ 500 Error on local backend');
      console.log('📄 Error details:', result.data);
    } else {
      console.log(`❓ Unexpected status: ${result.statusCode}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('💡 Make sure local backend is running: cd backend && php artisan serve');
  }
}

testLocalBackend(); 