#!/usr/bin/env node

/**
 * Server Status Checker
 * Checks if the WebRTC signaling servers are running
 */

const WebSocket = require('ws');

async function checkServer(url, name) {
  return new Promise((resolve) => {
    console.log(`Checking ${name}...`);
    
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ name, status: 'timeout', error: 'Connection timeout' });
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ name, status: 'online', error: null });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ name, status: 'offline', error: error.message });
    });
  });
}

async function main() {
  console.log('🔍 Checking WebRTC Server Status...\n');
  
  const servers = [
    { url: 'ws://46.101.123.123:8080/audio-signaling', name: 'Audio Signaling Server' },
    { url: 'ws://46.101.123.123:8081/chat-signaling', name: 'Chat Signaling Server' },
    { url: 'wss://docavailable.org/call-signaling', name: 'HTTPS Call Signaling (old)' },
  ];
  
  for (const server of servers) {
    const result = await checkServer(server.url, server.name);
    const status = result.status === 'online' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}\n`);
    } else {
      console.log(`   URL: ${server.url}\n`);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('- Use ws://46.101.123.123:8080 for audio calls');
  console.log('- Use ws://46.101.123.123:8081 for chat signaling');
  console.log('- The wss://docavailable.org URLs are not working');
}

main().catch(console.error);
