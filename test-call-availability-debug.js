#!/usr/bin/env node

/**
 * Debug Call Availability API
 * This script tests the call availability API that's failing in production builds
 */

const https = require('https');
const http = require('http');

const TEST_CONFIG = {
  // Test different API endpoints
  productionAPI: 'https://docavailable-3vbdv.ondigitalocean.app',
  developmentAPI: 'http://172.20.10.11:8000',
  
  // Test with different auth tokens
  testTokens: [
    'test-token-1',
    'invalid-token',
    '', // Empty token
    null // No token
  ],
  
  timeout: 10000 // 10 seconds
};

class CallAvailabilityDebugger {
  constructor() {
    this.results = [];
  }

  async testCallAvailability(apiUrl, token, testName) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Testing ${testName}`);
      console.log(`🔗 API URL: ${apiUrl}/api/call-sessions/check-availability`);
      console.log(`🔑 Token: ${token ? 'Present' : 'Missing'}`);
      
      const startTime = Date.now();
      
      const postData = JSON.stringify({
        call_type: 'voice'
      });
      
      const options = {
        hostname: apiUrl.replace(/^https?:\/\//, '').split('/')[0],
        port: apiUrl.includes('https') ? 443 : 80,
        path: '/api/call-sessions/check-availability',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      const client = apiUrl.includes('https') ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const duration = Date.now() - startTime;
          
          try {
            const responseData = JSON.parse(data);
            console.log(`✅ ${testName}: Response received (${res.statusCode})`);
            console.log(`📊 Response:`, {
              success: responseData.success,
              can_make_call: responseData.can_make_call,
              message: responseData.message,
              remaining_calls: responseData.remaining_calls
            });
            
            resolve({
              testName,
              success: true,
              statusCode: res.statusCode,
              response: responseData,
              duration,
              error: null
            });
          } catch (parseError) {
            console.log(`❌ ${testName}: Failed to parse response`);
            console.log(`📄 Raw response:`, data);
            
            resolve({
              testName,
              success: false,
              statusCode: res.statusCode,
              response: data,
              duration,
              error: 'Failed to parse JSON response'
            });
          }
        });
      });
      
      req.on('error', (error) => {
        const duration = Date.now() - startTime;
        console.log(`❌ ${testName}: Request failed - ${error.message}`);
        
        resolve({
          testName,
          success: false,
          statusCode: null,
          response: null,
          duration,
          error: error.message
        });
      });
      
      req.setTimeout(TEST_CONFIG.timeout, () => {
        req.destroy();
        const duration = Date.now() - startTime;
        console.log(`⏰ ${testName}: Request timeout`);
        
        resolve({
          testName,
          success: false,
          statusCode: null,
          response: null,
          duration,
          error: 'Request timeout'
        });
      });
      
      req.write(postData);
      req.end();
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Call Availability API Debug Tests');
    console.log('=' .repeat(60));
    
    // Test production API with different tokens
    for (const token of TEST_CONFIG.testTokens) {
      const testName = `Production API (${token ? 'With Token' : 'No Token'})`;
      const result = await this.testCallAvailability(TEST_CONFIG.productionAPI, token, testName);
      this.results.push(result);
    }
    
    // Test development API with different tokens
    for (const token of TEST_CONFIG.testTokens) {
      const testName = `Development API (${token ? 'With Token' : 'No Token'})`;
      const result = await this.testCallAvailability(TEST_CONFIG.developmentAPI, token, testName);
      this.results.push(result);
    }
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 CALL AVAILABILITY API TEST RESULTS');
    console.log('=' .repeat(60));
    
    const productionResults = this.results.filter(r => r.testName.includes('Production'));
    const developmentResults = this.results.filter(r => r.testName.includes('Development'));
    
    console.log('\n🏭 PRODUCTION API RESULTS:');
    productionResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? `${result.duration}ms` : 'N/A';
      const error = result.error ? ` (${result.error})` : '';
      
      console.log(`${status} ${result.testName}: ${result.success ? 'SUCCESS' : 'FAILED'} ${duration}${error}`);
      
      if (result.response && result.response.success !== undefined) {
        console.log(`   └─ Can make call: ${result.response.can_make_call}, Message: ${result.response.message}`);
      }
    });
    
    console.log('\n🛠️  DEVELOPMENT API RESULTS:');
    developmentResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? `${result.duration}ms` : 'N/A';
      const error = result.error ? ` (${result.error})` : '';
      
      console.log(`${status} ${result.testName}: ${result.success ? 'SUCCESS' : 'FAILED'} ${duration}${error}`);
      
      if (result.response && result.response.success !== undefined) {
        console.log(`   └─ Can make call: ${result.response.can_make_call}, Message: ${result.response.message}`);
      }
    });
    
    console.log('\n🎯 ANALYSIS:');
    const productionWorking = productionResults.some(r => r.success);
    const developmentWorking = developmentResults.some(r => r.success);
    
    if (productionWorking && developmentWorking) {
      console.log('✅ Both APIs are working - issue might be in app configuration');
    } else if (developmentWorking && !productionWorking) {
      console.log('❌ Production API is failing - check server deployment');
    } else if (!developmentWorking && productionWorking) {
      console.log('❌ Development API is failing - check local server');
    } else {
      console.log('❌ Both APIs are failing - check network connectivity');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CallAvailabilityDebugger();
  tester.runAllTests().catch(console.error);
}

module.exports = CallAvailabilityDebugger;
