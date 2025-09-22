#!/usr/bin/env node

/**
 * WebSocket Issue Diagnostic Tool
 * Identifies the exact cause of the 400 Bad Request error
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔍 WebSocket Issue Diagnostic Tool');
console.log('==================================');
console.log('');

// Test different connection scenarios
const tests = [
  {
    name: 'Audio Signaling (nginx proxy)',
    url: 'ws://46.101.123.123/audio-signaling/test123',
    expected: 'Should work - nginx proxy to port 8080'
  },
  {
    name: 'Chat Signaling (nginx proxy)',
    url: 'ws://46.101.123.123/chat-signaling/test123', 
    expected: 'Currently failing - nginx config issue'
  },
  {
    name: 'Audio Signaling (direct port 8080)',
    url: 'ws://46.101.123.123:8080/audio-signaling/test123',
    expected: 'Should work - direct server connection'
  },
  {
    name: 'Chat Signaling (direct port 8080)',
    url: 'ws://46.101.123.123:8080/chat-signaling/test123',
    expected: 'Should work - direct server connection'
  }
];

let testIndex = 0;
let results = [];

function runDiagnostic() {
  if (testIndex >= tests.length) {
    printDiagnosticResults();
    return;
  }

  const test = tests[testIndex];
  console.log(`🧪 Testing: ${test.name}`);
  console.log(`🔗 URL: ${test.url}`);
  console.log(`📋 Expected: ${test.expected}`);
  
  const ws = new WebSocket(test.url);
  
  const timeout = setTimeout(() => {
    console.log(`⏰ Timeout after 10 seconds`);
    ws.close();
    results.push({
      name: test.name,
      url: test.url,
      status: 'timeout',
      error: 'Connection timeout'
    });
    testIndex++;
    setTimeout(runDiagnostic, 1000);
  }, 10000);

  ws.on('open', () => {
    console.log(`✅ Connection successful!`);
    clearTimeout(timeout);
    
    // Send test message
    ws.send(JSON.stringify({
      type: 'diagnostic-test',
      timestamp: new Date().toISOString()
    }));
    
    results.push({
      name: test.name,
      url: test.url,
      status: 'success',
      error: null
    });
    
    ws.close();
    testIndex++;
    setTimeout(runDiagnostic, 1000);
  });

  ws.on('error', (error) => {
    console.log(`❌ Connection failed: ${error.message}`);
    clearTimeout(timeout);
    
    results.push({
      name: test.name,
      url: test.url,
      status: 'failed',
      error: error.message
    });
    
    testIndex++;
    setTimeout(runDiagnostic, 1000);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} - ${reason}`);
  });
}

function printDiagnosticResults() {
  console.log('\n📊 Diagnostic Results');
  console.log('====================');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status === 'success' ? '✅ Success' : '❌ Failed'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n🔍 Analysis');
  console.log('===========');
  
  const audioNginx = results.find(r => r.name.includes('Audio Signaling (nginx proxy)'));
  const chatNginx = results.find(r => r.name.includes('Chat Signaling (nginx proxy)'));
  const audioDirect = results.find(r => r.name.includes('Audio Signaling (direct port 8080)'));
  const chatDirect = results.find(r => r.name.includes('Chat Signaling (direct port 8080)'));
  
  if (audioNginx?.status === 'success' && chatNginx?.status === 'failed') {
    console.log('🎯 ISSUE IDENTIFIED: Nginx configuration problem');
    console.log('   - Audio signaling works via nginx (port 80)');
    console.log('   - Chat signaling fails via nginx (port 80)');
    console.log('   - Both work via direct port 8080');
    console.log('');
    console.log('💡 SOLUTION: Update nginx configuration');
    console.log('   The nginx config is missing or misconfigured for /chat-signaling');
    console.log('   Deploy the nginx-webrtc-proxy.conf file to your server');
  } else if (audioDirect?.status === 'success' && chatDirect?.status === 'success') {
    console.log('🎯 ISSUE IDENTIFIED: Nginx proxy configuration');
    console.log('   - Direct server connections work (port 8080)');
    console.log('   - Nginx proxy has issues');
    console.log('');
    console.log('💡 SOLUTION: Fix nginx configuration');
    console.log('   Update nginx config and restart nginx service');
  } else {
    console.log('🎯 ISSUE IDENTIFIED: Server configuration problem');
    console.log('   - WebRTC server may not be running properly');
    console.log('   - Check server logs and configuration');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy nginx-webrtc-proxy.conf to your server');
  console.log('2. Restart nginx: sudo systemctl restart nginx');
  console.log('3. Test again with: node diagnose-websocket-issue.js');
  console.log('4. If still failing, check server logs');
}

// Start diagnostic
runDiagnostic();
