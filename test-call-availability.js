#!/usr/bin/env node

/**
 * Test script to check call availability endpoint
 * This will help identify why calls are not working
 */

class CallAvailabilityTester {
  constructor() {
    this.baseUrl = 'https://docavailable-3vbdv.ondigitalocean.app';
    this.testResults = [];
  }

  async runTests() {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    console.log('🧪 Starting Call Availability Tests\n');
    
    // Test 1: Check if endpoint exists
    await this.testEndpointExists(fetch);
    
    // Test 2: Test with invalid token
    await this.testWithInvalidToken(fetch);
    
    // Test 3: Test with valid token (if available)
    await this.testWithValidToken(fetch);
    
    this.printResults();
  }

  async testEndpointExists(fetch) {
    console.log('🔍 Test 1: Checking if call-sessions endpoint exists');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/call-sessions/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          call_type: 'voice'
        })
      });

      console.log(`📡 Response Status: ${response.status}`);
      console.log(`📡 Response OK: ${response.ok}`);
      
      const text = await response.text();
      console.log(`📄 Raw Response: ${text}`);
      
      let data = null;
      try {
        data = JSON.parse(text);
        console.log(`📊 Parsed Response:`, data);
      } catch (e) {
        console.log(`❌ Failed to parse JSON: ${e.message}`);
      }

      this.testResults.push({
        test: 'Endpoint Exists',
        status: response.status === 401 ? 'PASS' : 'FAIL',
        details: `Status: ${response.status}, Expected: 401 (unauthorized)`,
        response: data
      });

    } catch (error) {
      console.error(`❌ Error testing endpoint: ${error.message}`);
      this.testResults.push({
        test: 'Endpoint Exists',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        response: null
      });
    }
    
    console.log('');
  }

  async testWithInvalidToken(fetch) {
    console.log('🔍 Test 2: Testing with invalid token');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/call-sessions/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: JSON.stringify({
          call_type: 'voice'
        })
      });

      console.log(`📡 Response Status: ${response.status}`);
      
      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
        console.log(`📊 Response:`, data);
      } catch (e) {
        console.log(`📄 Raw Response: ${text}`);
      }

      this.testResults.push({
        test: 'Invalid Token',
        status: response.status === 401 ? 'PASS' : 'FAIL',
        details: `Status: ${response.status}, Expected: 401`,
        response: data
      });

    } catch (error) {
      console.error(`❌ Error testing with invalid token: ${error.message}`);
      this.testResults.push({
        test: 'Invalid Token',
        status: 'FAIL',
        details: `Error: ${error.message}`,
        response: null
      });
    }
    
    console.log('');
  }

  async testWithValidToken(fetch) {
    console.log('🔍 Test 3: Testing with valid token (if available)');
    console.log('ℹ️ This test requires a valid auth token - skipping for now');
    
    this.testResults.push({
      test: 'Valid Token',
      status: 'SKIP',
      details: 'Requires valid auth token',
      response: null
    });
    
    console.log('');
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));
    
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Details: ${result.details}`);
      if (result.response) {
        console.log(`   Response: ${JSON.stringify(result.response, null, 2)}`);
      }
      console.log('');
      
      if (result.status === 'PASS') passCount++;
      else if (result.status === 'FAIL') failCount++;
      else skipCount++;
    });
    
    console.log('📈 Summary:');
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️ Skipped: ${skipCount}`);
    
    if (failCount === 0) {
      console.log('\n🎉 All tests passed! Call availability endpoint is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the backend configuration.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CallAvailabilityTester();
  tester.runTests().catch(console.error);
}

module.exports = CallAvailabilityTester;