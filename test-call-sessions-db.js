#!/usr/bin/env node

/**
 * Test script to check call-sessions database and endpoint
 */

class CallSessionsDBTester {
  constructor() {
    this.baseUrl = 'https://docavailable-3vbdv.ondigitalocean.app';
  }

  async runTests() {
    console.log('🧪 Starting Call Sessions Database Tests\n');
    
    // Test 1: Check if endpoint returns proper error
    await this.testEndpointError();
    
    // Test 2: Check if we can get more details about the error
    await this.testDetailedError();
  }

  async testEndpointError() {
    console.log('🔍 Test 1: Checking call-sessions endpoint error details');
    
    try {
      const { default: fetch } = await import('node-fetch');
      
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
      console.log(`📡 Response Headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`📄 Raw Response: ${text}`);
      
      try {
        const data = JSON.parse(text);
        console.log(`📊 Parsed Response:`, JSON.stringify(data, null, 2));
      } catch (e) {
        console.log(`❌ Failed to parse JSON: ${e.message}`);
      }

    } catch (error) {
      console.error(`❌ Error testing endpoint: ${error.message}`);
    }
    
    console.log('');
  }

  async testDetailedError() {
    console.log('🔍 Test 2: Testing with different call types');
    
    try {
      const { default: fetch } = await import('node-fetch');
      
      const callTypes = ['voice', 'video', 'invalid'];
      
      for (const callType of callTypes) {
        console.log(`Testing call type: ${callType}`);
        
        const response = await fetch(`${this.baseUrl}/api/call-sessions/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-token'
          },
          body: JSON.stringify({
            call_type: callType
          })
        });

        console.log(`  Status: ${response.status}`);
        const text = await response.text();
        console.log(`  Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        console.log('');
      }

    } catch (error) {
      console.error(`❌ Error testing call types: ${error.message}`);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new CallSessionsDBTester();
  tester.runTests().catch(console.error);
}

module.exports = CallSessionsDBTester;
