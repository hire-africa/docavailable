#!/usr/bin/env node

/**
 * Simple WebRTC Connection Test
 * Tests if the WebRTC signaling server is running and responding
 */

const WebSocket = require('ws');

const SIGNALING_SERVER_URL = 'ws://localhost:8080';
const TEST_APPOINTMENT_ID = 'test_connection_123';

console.log('🔍 Testing WebRTC Signaling Server Connection...');
console.log(`Server: ${SIGNALING_SERVER_URL}`);
console.log(`Appointment ID: ${TEST_APPOINTMENT_ID}`);
console.log('');

// Test connection - use query parameter for appointment ID
const ws = new WebSocket(`${SIGNALING_SERVER_URL}/audio-signaling?appointmentId=${TEST_APPOINTMENT_ID}`);

ws.on('open', () => {
  console.log('✅ WebRTC Signaling Server is running and accepting connections!');
  
  // Test sending a simple message
  const testMessage = {
    type: 'test-message',
    data: 'Hello WebRTC Server!',
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('📤 Sent test message to server');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received message from server:', message.type);
    
    if (message.type === 'connection-established') {
      console.log('✅ Connection established successfully!');
    }
    
    if (message.type === 'test-message') {
      console.log('✅ Server echoed our test message!');
    }
  } catch (error) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.log('❌ WebRTC Signaling Server connection failed!');
  console.log('Error:', error.message);
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('1. Make sure the WebRTC signaling server is running');
  console.log('2. Check if port 8080 is available');
  console.log('3. Run: node backend/webrtc-signaling-server.js');
  console.log('4. Or run: npm run webrtc-server');
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 10000);
