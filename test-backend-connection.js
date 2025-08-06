// Test script to verify frontend-backend connection
const https = require('https');

const BACKEND_URL = 'https://docavailable-1.onrender.com';

console.log('🔍 Testing backend connection...\n');

// Test 1: Basic connectivity
console.log('1️⃣ Testing basic connectivity...');
https.get(`${BACKEND_URL}/api/health`, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`   Response: ${data.substring(0, 200)}...`);
    console.log('');
    
    // Test 2: API endpoints
    testAPIEndpoints();
  });
}).on('error', (err) => {
  console.log(`   ❌ Error: ${err.message}`);
  console.log('');
  testAPIEndpoints();
});

function testAPIEndpoints() {
  console.log('2️⃣ Testing API endpoints...');
  
  const endpoints = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/users',
    '/api/doctors',
    '/api/appointments'
  ];
  
  endpoints.forEach((endpoint, index) => {
    setTimeout(() => {
      https.get(`${BACKEND_URL}${endpoint}`, (res) => {
        console.log(`   ${endpoint}: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`   ${endpoint}: ❌ ${err.message}`);
      });
    }, index * 500);
  });
  
  console.log('');
  console.log('3️⃣ Testing frontend configuration...');
  testFrontendConfig();
}

function testFrontendConfig() {
  console.log('   Checking API service configuration...');
  
  // Simulate the API service configuration
  const baseURL = 'https://docavailable-1.onrender.com/api';
  console.log(`   Base URL: ${baseURL}`);
  
  // Test a simple GET request
  const testEndpoint = '/health';
  console.log(`   Testing endpoint: ${baseURL}${testEndpoint}`);
  
  https.get(`${baseURL}${testEndpoint}`, (res) => {
    console.log(`   ✅ Frontend can reach backend: ${res.statusCode}`);
    console.log('');
    console.log('🎉 Connection test completed!');
  }).on('error', (err) => {
    console.log(`   ❌ Frontend cannot reach backend: ${err.message}`);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('   - Check if backend is deployed correctly');
    console.log('   - Verify CORS settings on backend');
    console.log('   - Check network connectivity');
  });
} 