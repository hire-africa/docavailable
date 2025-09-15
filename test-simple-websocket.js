#!/usr/bin/env node

/**
 * Simple WebSocket Test
 * Tests basic WebSocket connection to debug the issue
 */

const WebSocket = require('ws');

console.log('🔍 Testing Simple WebSocket Connection...');
console.log('Server: ws://localhost:8080');
console.log('Path: /audio-signaling/test123');
console.log('');

// Test connection with different URL formats
const urls = [
  'ws://localhost:8080/audio-signaling/test123',
  'ws://localhost:8080/audio-signaling',
  'ws://localhost:8080'
];

let testIndex = 0;

function testNextUrl() {
  if (testIndex >= urls.length) {
    console.log('❌ All URL formats failed');
    process.exit(1);
  }

  const url = urls[testIndex];
  console.log(`🧪 Testing URL: ${url}`);
  
  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`✅ Connection successful with URL: ${url}`);
    console.log('📤 Sending test message...');
    
    ws.send(JSON.stringify({
      type: 'test',
      data: 'Hello WebRTC Server!',
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message);
      console.log('🎉 WebSocket connection is working!');
      ws.close();
      process.exit(0);
    } catch (error) {
      console.log('📨 Received raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.log(`❌ Connection failed with URL: ${url}`);
    console.log(`Error: ${error.message}`);
    console.log('');
    
    testIndex++;
    setTimeout(testNextUrl, 1000);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} - ${reason}`);
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      console.log(`⏰ Timeout for URL: ${url}`);
      ws.close();
      testIndex++;
      setTimeout(testNextUrl, 1000);
    }
  }, 5000);
}

testNextUrl();
