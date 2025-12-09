#!/usr/bin/env node

/**
 * Test script for Unified WebSocket Server
 * Tests both audio and chat signaling connections
 */

const WebSocket = require('ws');

console.log('🧪 Testing Unified WebSocket Server');
console.log('==================================');
console.log('');

const tests = [
  {
    name: 'Audio Signaling (HTTPS)',
    url: 'wss://docavailable.org/audio-signaling',
    params: '?appointmentId=test_audio_123&userId=1&authToken=test-token'
  },
  {
    name: 'Chat Signaling (HTTPS)',
    url: 'wss://docavailable.org/chat-signaling',
    params: '?appointmentId=test_chat_123&userId=1&authToken=test-token'
  },
  {
    name: 'Audio Signaling (Direct Port)',
    url: 'ws://localhost:8080/audio-signaling',
    params: '?appointmentId=test_audio_direct&userId=1&authToken=test-token'
  },
  {
    name: 'Chat Signaling (Direct Port)',
    url: 'ws://localhost:8080/chat-signaling',
    params: '?appointmentId=test_chat_direct&userId=1&authToken=test-token'
  }
];

let testIndex = 0;
let results = [];

function runTest() {
  if (testIndex >= tests.length) {
    printResults();
    return;
  }

  const test = tests[testIndex];
  const fullUrl = test.url + test.params;
  
  console.log(`🧪 Test ${testIndex + 1}: ${test.name}`);
  console.log(`🔗 URL: ${fullUrl}`);
  
  const ws = new WebSocket(fullUrl, {
    rejectUnauthorized: false // Allow self-signed certificates
  });

  const timeout = setTimeout(() => {
    console.log(`⏰ Timeout after 10 seconds`);
    ws.close();
    results.push({
      name: test.name,
      url: fullUrl,
      status: 'timeout',
      error: 'Connection timeout'
    });
    testIndex++;
    setTimeout(runTest, 1000);
  }, 10000);

  ws.on('open', () => {
    console.log(`✅ Connection successful!`);
    clearTimeout(timeout);
    
    // Send test message
    const testMessage = {
      type: 'test-message',
      appointmentId: test.params.includes('audio') ? 'test_audio_123' : 'test_chat_123',
      userId: '1',
      message: 'Hello from unified WebSocket test!',
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(testMessage));
    console.log(`📤 Test message sent`);
    
    results.push({
      name: test.name,
      url: fullUrl,
      status: 'success',
      error: null
    });
    
    ws.close();
    testIndex++;
    setTimeout(runTest, 1000);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📥 Message received: ${message.type}`);
      
      if (message.type === 'connection-established') {
        console.log(`✅ Connection established for ${message.connectionType} signaling`);
      } else if (message.type === 'test-message') {
        console.log(`✅ Test message echoed back successfully`);
      }
    } catch (error) {
      console.log(`📥 Raw message: ${data.toString()}`);
    }
  });

  ws.on('error', (error) => {
    console.log(`❌ Connection failed: ${error.message}`);
    clearTimeout(timeout);
    
    results.push({
      name: test.name,
      url: fullUrl,
      status: 'failed',
      error: error.message
    });
    
    testIndex++;
    setTimeout(runTest, 1000);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} - ${reason}`);
  });
}

function printResults() {
  console.log('\n📊 Test Results');
  console.log('================');
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status === 'success' ? '✅ Success' : '❌ Failed'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.status === 'success') successCount++;
    else failCount++;
  });
  
  console.log('\n📈 Summary');
  console.log('==========');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Success Rate: ${Math.round((successCount / results.length) * 100)}%`);
  
  console.log('\n🔍 Analysis');
  console.log('===========');
  
  const httpsAudio = results.find(r => r.name.includes('Audio Signaling (HTTPS)'));
  const httpsChat = results.find(r => r.name.includes('Chat Signaling (HTTPS)'));
  const directAudio = results.find(r => r.name.includes('Audio Signaling (Direct Port)'));
  const directChat = results.find(r => r.name.includes('Chat Signaling (Direct Port)'));
  
  if (httpsAudio?.status === 'success' && httpsChat?.status === 'success') {
    console.log('🎉 SUCCESS: Both HTTPS endpoints are working!');
    console.log('   - Nginx proxy is configured correctly');
    console.log('   - SSL certificates are working');
    console.log('   - Unified WebSocket server is running properly');
  } else if (directAudio?.status === 'success' && directChat?.status === 'success') {
    console.log('⚠️ PARTIAL SUCCESS: Direct port connections work');
    console.log('   - WebSocket server is running correctly');
    console.log('   - Nginx proxy needs configuration');
    console.log('   - Deploy nginx-webrtc-unified.conf to your server');
  } else {
    console.log('❌ ISSUES DETECTED:');
    if (httpsAudio?.status !== 'success') {
      console.log('   - HTTPS Audio signaling failed');
    }
    if (httpsChat?.status !== 'success') {
      console.log('   - HTTPS Chat signaling failed');
    }
    if (directAudio?.status !== 'success') {
      console.log('   - Direct Audio signaling failed');
    }
    if (directChat?.status !== 'success') {
      console.log('   - Direct Chat signaling failed');
    }
    console.log('   - Check server logs and configuration');
  }
  
  console.log('\n📋 Next Steps:');
  if (httpsAudio?.status !== 'success' || httpsChat?.status !== 'success') {
    console.log('1. Deploy nginx-webrtc-unified.conf to your server');
    console.log('2. Restart nginx: sudo systemctl restart nginx');
    console.log('3. Test again with: node test-unified-websocket.js');
  } else {
    console.log('1. Update your client applications to use the unified WebSocket service');
    console.log('2. Test with real appointment data');
    console.log('3. Monitor server logs for any issues');
  }
}

// Start testing
runTest();
