#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api';
const TIMEOUT = 10000;

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let testResults = [];

// Utility functions
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

const runTest = async (testName, testFunction) => {
  totalTests++;
  log(`Running test: ${testName}`, 'info');
  
  try {
    const startTime = Date.now();
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    passedTests++;
    testResults.push({ name: testName, status: 'PASS', duration, result });
    log(`${testName} - PASSED (${duration}ms)`, 'success');
    return true;
  } catch (error) {
    failedTests++;
    testResults.push({ name: testName, status: 'FAIL', error: error.message });
    log(`${testName} - FAILED: ${error.message}`, 'error');
    return false;
  }
};

// Test functions
const testBackendConnectivity = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`, {
    timeout: TIMEOUT,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data || response.data.status !== 'healthy') {
    throw new Error('Health check did not return healthy status');
  }
  
  return response.data;
};

const testApiService = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`, {
    timeout: TIMEOUT,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.data) {
    throw new Error('No response data received');
  }
  
  return response.data;
};

const testCorsHeaders = async () => {
  const response = await axios.options(`${API_BASE_URL}/health`, {
    timeout: TIMEOUT,
    headers: {
              'Origin': 'http://172.20.10.11:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type',
    }
  });
  
  const corsHeaders = {
    allowOrigin: response.headers['access-control-allow-origin'],
    allowMethods: response.headers['access-control-allow-methods'],
    allowHeaders: response.headers['access-control-allow-headers'],
  };
  
  if (!corsHeaders.allowOrigin) {
    throw new Error('CORS headers not properly configured');
  }
  
  return corsHeaders;
};

const testTimeoutHandling = async () => {
  try {
    await axios.get(`${API_BASE_URL}/health`, {
      timeout: 100, // Very short timeout to test timeout handling
    });
    // If we get here, the request was fast enough
    return { status: 'fast_response' };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Expected timeout
      return { status: 'timeout_handled' };
    }
    throw error;
  }
};

const testEnvironmentVariables = () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api';
  const hasEnvVar = !!process.env.EXPO_PUBLIC_API_BASE_URL;
  
      if (!apiUrl.includes('172.20.10.11') && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
    throw new Error(`Invalid API URL: ${apiUrl}`);
  }
  
  return {
    apiUrl,
    hasEnvVar,
    fallbackUsed: !hasEnvVar
  };
};

const testDatabaseConnection = async () => {
  const response = await axios.get(`${API_BASE_URL}/health`, {
    timeout: TIMEOUT,
  });
  
  if (response.data.database !== 'connected') {
    throw new Error('Database not connected');
  }
  
  return { database: response.data.database };
};

const testAuthenticationEndpoints = async () => {
  // Test that protected endpoints return 401 when not authenticated
  try {
    await axios.get(`${API_BASE_URL}/user`, {
      timeout: TIMEOUT,
    });
    throw new Error('Protected endpoint accessible without authentication');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return { status: 'properly_protected' };
    }
    throw new Error(`Unexpected response: ${error.response?.status || error.message}`);
  }
};

// Main test runner
const runAllTests = async () => {
  console.log(colors.cyan.bold('\n🚀 Starting Backend Connectivity Tests\n'));
  console.log(colors.gray(`API Base URL: ${API_BASE_URL}`));
  console.log(colors.gray(`Timeout: ${TIMEOUT}ms`));
  console.log(colors.gray(`Platform: ${process.platform}`));
  console.log(colors.gray(`Node Version: ${process.version}\n`));
  
  const tests = [
    { name: 'Environment Variables', fn: testEnvironmentVariables },
    { name: 'Backend Connectivity', fn: testBackendConnectivity },
    { name: 'API Service', fn: testApiService },
    { name: 'CORS Headers', fn: testCorsHeaders },
    { name: 'Timeout Handling', fn: testTimeoutHandling },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Authentication Protection', fn: testAuthenticationEndpoints },
  ];
  
  for (const test of tests) {
    await runTest(test.name, test.fn);
    console.log(''); // Add spacing between tests
  }
  
  // Print summary
  console.log(colors.cyan.bold('\n📊 Test Summary\n'));
  console.log(colors.white(`Total Tests: ${totalTests}`));
  console.log(colors.green(`Passed: ${passedTests}`));
  console.log(colors.red(`Failed: ${failedTests}`));
  
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  console.log(colors.cyan(`Success Rate: ${successRate.toFixed(1)}%`));
  
  if (failedTests === 0) {
    console.log(colors.green.bold('\n🎉 All tests passed! Backend is working correctly.\n'));
    process.exit(0);
  } else {
    console.log(colors.red.bold('\n❌ Some tests failed. Check the errors above.\n'));
    
    // Show detailed results
    console.log(colors.yellow.bold('Detailed Results:\n'));
    testResults.forEach(result => {
      if (result.status === 'FAIL') {
        console.log(colors.red(`❌ ${result.name}: ${result.error}`));
      } else {
        console.log(colors.green(`✅ ${result.name} (${result.duration}ms)`));
      }
    });
    
    process.exit(1);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(colors.cyan.bold('Backend Connectivity Test Runner\n'));
  console.log('Usage: node scripts/test-backend.js [options]\n');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --verbose, -v  Show detailed output');
  console.log('  --url <url>    Override API base URL');
  console.log('\nEnvironment Variables:');
  console.log('  EXPO_PUBLIC_API_BASE_URL  API base URL (default: http://172.20.10.11:8000/api)');
  console.log('\nExamples:');
  console.log('  node scripts/test-backend.js');
  console.log('  node scripts/test-backend.js --url http://172.20.10.11:8000/api');
  console.log('  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000/api node scripts/test-backend.js');
  process.exit(0);
}

// Override API URL if provided
if (args.includes('--url')) {
  const urlIndex = args.indexOf('--url');
  if (urlIndex + 1 < args.length) {
    process.env.EXPO_PUBLIC_API_BASE_URL = args[urlIndex + 1];
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(colors.red.bold('\n💥 Test runner failed:'), error.message);
  process.exit(1);
}); 