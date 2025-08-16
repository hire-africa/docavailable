const https = require('https');

console.log('🔍 Checking Production Backend Status...\n');

// Test basic connectivity
function testBackend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'docavailable-5.onrender.com',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'DocAvailable-Test/1.0'
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

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Test API endpoint with correct field names
function testAPI() {
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
      hostname: 'docavailable-5.onrender.com',
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
          headers: res.headers,
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

async function diagnoseBackend() {
  try {
    console.log('1. Testing basic connectivity...');
    const basicResult = await testBackend();
    console.log(`✅ Backend is running (Status: ${basicResult.statusCode})`);
    console.log(`📄 Response: ${basicResult.data}\n`);

    console.log('2. Testing API registration endpoint with correct fields...');
    const apiResult = await testAPI();
    console.log(`📊 API Status: ${apiResult.statusCode}`);
    console.log(`📄 API Response: ${apiResult.data}\n`);

    console.log('🔧 DIAGNOSIS:');
    
    if (apiResult.statusCode === 404) {
      console.log('❌ ISSUE: API routes are not accessible');
      console.log('💡 SOLUTION: The backend is running but API routes are not configured properly');
      console.log('\n🔧 FIXES NEEDED:');
      console.log('1. Check if Laravel routes are properly loaded');
      console.log('2. Verify .htaccess configuration for API routes');
      console.log('3. Ensure APP_KEY is set in production');
      console.log('4. Check if database migrations are run');
      console.log('5. Verify JWT_SECRET is configured');
    } else if (apiResult.statusCode === 500) {
      console.log('❌ ISSUE: Server error (500)');
      console.log('💡 SOLUTION: Backend is running but encountering internal errors');
      console.log('\n🔧 FIXES NEEDED:');
      console.log('1. Check Laravel logs for specific error');
      console.log('2. Verify database connection');
      console.log('3. Ensure all required environment variables are set');
      console.log('4. Check if CustomDatabaseServiceProvider is working');
    } else if (apiResult.statusCode === 200 || apiResult.statusCode === 201) {
      console.log('✅ SUCCESS: API is working correctly!');
      console.log('🎉 Registration endpoint is functional!');
    } else if (apiResult.statusCode === 422) {
      console.log('⚠️  VALIDATION ERROR: API is working but request format needs adjustment');
      console.log('💡 SOLUTION: The backend expects different field names');
      console.log('\n📋 REQUIRED FIELDS:');
      console.log('- first_name (not name)');
      console.log('- last_name');
      console.log('- email');
      console.log('- password');
      console.log('- password_confirmation');
      console.log('- user_type (patient, doctor, or admin)');
    } else {
      console.log(`❓ UNKNOWN: Unexpected status code ${apiResult.statusCode}`);
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

console.log('🚀 Starting Production Backend Diagnosis...\n');
diagnoseBackend(); 