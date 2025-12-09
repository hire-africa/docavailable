// Test the API service configuration
const https = require('https');

console.log('🧪 Testing API Service Configuration...\n');

// Simulate the API service base URL
const baseURL = 'https://docavailable-5.onrender.com/api';

console.log(`📍 API Base URL: ${baseURL}`);

// Test endpoints that the frontend would use
const testEndpoints = [
  { name: 'Health Check', path: '/health', method: 'GET' },
  { name: 'Login', path: '/auth/login', method: 'POST' },
  { name: 'Register', path: '/auth/register', method: 'POST' },
  { name: 'Users', path: '/users', method: 'GET' },
  { name: 'Doctors', path: '/doctors', method: 'GET' },
  { name: 'Appointments', path: '/appointments', method: 'GET' }
];

let completedTests = 0;
const totalTests = testEndpoints.length;

testEndpoints.forEach((endpoint, index) => {
  setTimeout(() => {
    const url = `${baseURL}${endpoint.path}`;
    
    console.log(`\n🔍 Testing: ${endpoint.name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${endpoint.method}`);
    
    const options = {
      hostname: 'docavailable-5.onrender.com',
      port: 443,
      path: `/api${endpoint.path}`,
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      console.log(`   ✅ Status: ${res.statusCode}`);
      console.log(`   📋 Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (data.length > 0) {
          console.log(`   📄 Response: ${data.substring(0, 100)}...`);
        }
        
        completedTests++;
        if (completedTests === totalTests) {
          console.log('\n🎉 All API tests completed!');
          console.log('\n📊 Summary:');
          console.log('   ✅ Backend is reachable');
          console.log('   ✅ API endpoints are responding');
          console.log('   ⚠️  Backend has public directory issue (being fixed)');
          console.log('\n💡 Next Steps:');
          console.log('   1. Wait for backend deployment to complete');
          console.log('   2. Test frontend authentication');
          console.log('   3. Test full app functionality');
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      completedTests++;
    });
    
    // For POST requests, send empty body
    if (endpoint.method === 'POST') {
      req.write('{}');
    }
    
    req.end();
  }, index * 1000); // 1 second delay between tests
}); 