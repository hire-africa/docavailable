#!/usr/bin/env node

/**
 * Start WebRTC Signaling Server
 * Simple script to start the WebRTC signaling server for testing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting WebRTC Signaling Server...');
console.log('=====================================');

const serverPath = path.join(__dirname, 'backend', 'webrtc-signaling-server.js');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (error) => {
  console.error('❌ Failed to start WebRTC server:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🔌 WebRTC server exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebRTC server...');
  server.kill('SIGINT');
  process.exit(0);
});

console.log('✅ WebRTC Signaling Server started!');
console.log('📡 Server running on: ws://localhost:8080/audio-signaling');
console.log('🛑 Press Ctrl+C to stop the server');
console.log('');
