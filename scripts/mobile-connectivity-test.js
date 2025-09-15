#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');

const TEST_URLS = [
  'http://172.20.10.11:8000/api/health',
  'http://172.20.10.11:8000/api',
  'http://172.20.10.11:8000/api/health',
  'http://127.0.0.1:8000/api/health'
];

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success':
      console.log(colors.green(`[${timestamp}] ✅ ${message}`));
      break;
    case 'error':
      console.log(colors.red(`[${timestamp}] ❌ ${message}`));
      break;
    case 'warning':
      console.log(colors.yellow(`[${timestamp}] ⚠️  ${message}`));
      break;
    case 'info':
      console.log(colors.blue(`[${timestamp}] ℹ️  ${message}`));
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
};

const testConnectivity = async (url, timeout = 10000) => {
  try {
    log(`Testing: ${url}`, 'info');
    const response = await axios.get(url, {
      timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MobileConnectivityTest/1.0'
      }
    });
    
    log(`✅ SUCCESS: ${url} (${response.status})`, 'success');
    if (response.data) {
      console.log(colors.gray(`   Response: ${JSON.stringify(response.data, null, 2)}`));
    }
    return true;
  } catch (error) {
    log(`❌ FAILED: ${url} - ${error.message}`, 'error');
    if (error.response) {
      console.log(colors.gray(`   Status: ${error.response.status}`));
      console.log(colors.gray(`   Data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    return false;
  }
};

const runTests = async () => {
  console.log(colors.cyan.bold('\n📱 Mobile Connectivity Test\n'));
  console.log(colors.gray('Testing backend connectivity from mobile device perspective\n'));
  
  let successCount = 0;
  let totalTests = TEST_URLS.length;
  
  for (const url of TEST_URLS) {
    const success = await testConnectivity(url);
    if (success) successCount++;
    console.log(''); // Add spacing between tests
  }
  
  console.log(colors.cyan.bold('\n📊 Test Results:\n'));
  console.log(colors.gray(`Successful: ${successCount}/${totalTests}`));
  
  if (successCount === 0) {
    console.log(colors.red.bold('\n🚨 All tests failed! Possible issues:'));
    console.log(colors.gray('• Backend not running'));
    console.log(colors.gray('• Firewall blocking connections'));
    console.log(colors.gray('• Wrong IP address'));
    console.log(colors.gray('• Network connectivity issues'));
  } else if (successCount < totalTests) {
    console.log(colors.yellow.bold('\n⚠️  Partial connectivity issues detected'));
    console.log(colors.gray('• Some endpoints work, others don\'t'));
    console.log(colors.gray('• Check specific failing endpoints'));
  } else {
    console.log(colors.green.bold('\n🎉 All tests passed!'));
    console.log(colors.gray('• Backend is fully accessible'));
    console.log(colors.gray('• Mobile app should work correctly'));
  }
  
  console.log(colors.cyan.bold('\n🔧 Next Steps:\n'));
  console.log(colors.gray('1. If tests fail, check Windows Firewall'));
  console.log(colors.gray('2. Ensure backend is running: php artisan serve --host=0.0.0.0 --port=8000'));
  console.log(colors.gray('3. Verify mobile device is on same WiFi network'));
  console.log(colors.gray('4. Try accessing URLs directly in mobile browser'));
};

// Run tests
runTests().catch(error => {
  console.error(colors.red.bold('\n💥 Test failed:'), error.message);
  process.exit(1);
}); 