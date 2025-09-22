#!/usr/bin/env node

/**
 * WebSocket Fix Test
 * Tests WebSocket connections after fixing the 400 Bad Request issue
 */

const WebSocket = require('ws');

console.log('🔍 Testing WebSocket Fix...');
console.log('=====================================');

// Test URLs - all should work now
const testUrls = [
  {
    name: 'Audio Signaling (via nginx proxy)',
    url: 'ws://46.101.123.123/audio-signaling/test123',
    expected: 'Should connect successfully'
  },
  {
    name: 'Chat Signaling (via nginx proxy)', 
    url: 'ws://46.101.123.123/chat-signaling/test123',
    expected: 'Should connect successfully'
  },
  {
    name: 'Audio Signaling (direct port 8080)',
    url: 'ws://46.101.123.123:8080/audio-signaling/test123',
    expected: 'Should connect successfully'
  },
  {
    name: 'Chat Signaling (direct port 8080)',
    url: 'ws://46.101.123.123:8080/chat-signaling/test123',
    expected: 'Should connect successfully'
  }
];

let testIndex = 0;
let successCount = 0;
let totalTests = testUrls.length;

function runNextTest() {
  if (testIndex >= testUrls.length) {
    console.log('\n=====================================');
    console.log(`📊 Test Results: ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('✅ All WebSocket connections are working!');
      console.log('🎉 The 400 Bad Request issue has been fixed!');
    } else {
      console.log('❌ Some tests failed. Check server configuration.');
    }
    
    process.exit(successCount === totalTests ? 0 : 1);
  }

  const test = testUrls[testIndex];
  console.log(`\n🧪 Test ${testIndex + 1}/${totalTests}: ${test.name}`);
  console.log(`🔗 URL: ${test.url}`);
  console.log(`📋 Expected: ${test.expected}`);
  
  const ws = new WebSocket(test.url);

  const timeout = setTimeout(() => {
    console.log(`⏰ Timeout after 10 seconds`);
    ws.close();
    testIndex++;
    setTimeout(runNextTest, 1000);
  }, 10000);

  ws.on('open', () => {
    console.log(`✅ Connection successful!`);
    clearTimeout(timeout);
    
    // Send a test message
    const testMessage = {
      type: 'test',
      data: 'WebSocket fix test',
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(testMessage));
    console.log(`📤 Sent test message`);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Received message:`, message.type || 'Unknown type');
      console.log(`✅ Message exchange successful!`);
    } catch (error) {
      console.log(`📨 Received raw message:`, data.toString());
    }
    
    clearTimeout(timeout);
    ws.close();
    successCount++;
    testIndex++;
    setTimeout(runNextTest, 1000);
  });

  ws.on('error', (error) => {
    console.log(`❌ Connection failed: ${error.message}`);
    clearTimeout(timeout);
    testIndex++;
    setTimeout(runNextTest, 1000);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} - ${reason}`);
  });
}

// Start testing
console.log('🚀 Starting WebSocket tests...');
runNextTest();
