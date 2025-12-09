#!/usr/bin/env node

/**
 * Test WebSocket connections with query parameters
 * This script tests the new query parameter format for WebSocket connections
 */

const WebSocket = require('ws');

const TEST_CONFIG = {
  // Test URLs with query parameters (new format)
  audioSignaling: 'wss://docavailable.org/audio-signaling?appointmentId=test123&userId=456',
  chatSignaling: 'wss://docavailable.org/chat-signaling?appointmentId=test123&userId=456&authToken=test-token',
  
  // Test URLs with path parameters (old format - should fail)
  audioSignalingOld: 'wss://docavailable.org/audio-signaling/test123',
  chatSignalingOld: 'wss://docavailable.org/chat-signaling/test123',
  
  timeout: 10000 // 10 seconds
};

class WebSocketTester {
  constructor() {
    this.results = {
      audioQuery: null,
      chatQuery: null,
      audioPath: null,
      chatPath: null
    };
  }

  async testConnection(name, url, description) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Testing ${name}: ${description}`);
      console.log(`🔗 URL: ${url}`);
      
      const startTime = Date.now();
      let connected = false;
      let error = null;
      
      try {
        const ws = new WebSocket(url);
        
        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            resolve({
              success: false,
              error: 'Connection timeout',
              duration: Date.now() - startTime
            });
          }
        }, TEST_CONFIG.timeout);
        
        ws.on('open', () => {
          connected = true;
          clearTimeout(timeout);
          console.log(`✅ ${name}: Connected successfully`);
          
          // Send a test message
          ws.send(JSON.stringify({
            type: 'test-message',
            timestamp: new Date().toISOString()
          }));
          
          setTimeout(() => {
            ws.close();
            resolve({
              success: true,
              error: null,
              duration: Date.now() - startTime
            });
          }, 1000);
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            console.log(`📨 ${name}: Received message:`, message.type || 'unknown');
          } catch (e) {
            console.log(`📨 ${name}: Received raw message:`, data.toString());
          }
        });
        
        ws.on('error', (err) => {
          if (!connected) {
            clearTimeout(timeout);
            console.log(`❌ ${name}: Connection error:`, err.message);
            resolve({
              success: false,
              error: err.message,
              duration: Date.now() - startTime
            });
          }
        });
        
        ws.on('close', (code, reason) => {
          if (connected) {
            console.log(`🔌 ${name}: Connection closed (${code}): ${reason}`);
          }
        });
        
      } catch (err) {
        console.log(`❌ ${name}: Failed to create connection:`, err.message);
        resolve({
          success: false,
          error: err.message,
          duration: Date.now() - startTime
        });
      }
    });
  }

  async runAllTests() {
    console.log('🚀 Starting WebSocket Query Parameter Tests');
    console.log('=' .repeat(60));
    
    // Test new query parameter format
    this.results.audioQuery = await this.testConnection(
      'Audio Signaling (Query)',
      TEST_CONFIG.audioSignaling,
      'Audio signaling with query parameters (NEW FORMAT)'
    );
    
    this.results.chatQuery = await this.testConnection(
      'Chat Signaling (Query)',
      TEST_CONFIG.chatSignaling,
      'Chat signaling with query parameters (NEW FORMAT)'
    );
    
    // Test old path parameter format (should fail)
    this.results.audioPath = await this.testConnection(
      'Audio Signaling (Path)',
      TEST_CONFIG.audioSignalingOld,
      'Audio signaling with path parameters (OLD FORMAT)'
    );
    
    this.results.chatPath = await this.testConnection(
      'Chat Signaling (Path)',
      TEST_CONFIG.chatSignalingOld,
      'Chat signaling with path parameters (OLD FORMAT)'
    );
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    const tests = [
      { name: 'Audio Signaling (Query)', result: this.results.audioQuery, expected: true },
      { name: 'Chat Signaling (Query)', result: this.results.chatQuery, expected: true },
      { name: 'Audio Signaling (Path)', result: this.results.audioPath, expected: false },
      { name: 'Chat Signaling (Path)', result: this.results.chatPath, expected: false }
    ];
    
    tests.forEach(test => {
      const status = test.result.success === test.expected ? '✅' : '❌';
      const duration = test.result.duration ? `${test.result.duration}ms` : 'N/A';
      const error = test.result.error ? ` (${test.result.error})` : '';
      
      console.log(`${status} ${test.name}: ${test.result.success ? 'SUCCESS' : 'FAILED'} ${duration}${error}`);
    });
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('✅ Query parameter format should work (NEW)');
    console.log('❌ Path parameter format should fail (OLD)');
    
    const querySuccess = this.results.audioQuery.success && this.results.chatQuery.success;
    const pathFailure = !this.results.audioPath.success && !this.results.chatPath.success;
    
    if (querySuccess && pathFailure) {
      console.log('\n🎉 ALL TESTS PASSED! Query parameter format is working correctly.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Check the results above.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new WebSocketTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WebSocketTester;
