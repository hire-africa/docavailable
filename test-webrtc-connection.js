#!/usr/bin/env node

/**
 * Test script to verify WebRTC connection improvements
 * This script tests the WebSocket connection with SSL error handling
 */

const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
  url: 'wss://docavailable.org/chat-signaling?appointmentId=test_session_123&userId=1&authToken=test_token',
  timeout: 10000,
  maxRetries: 3
};

class WebRTCConnectionTester {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = TEST_CONFIG.maxRetries;
    this.isConnected = false;
  }

  async testConnection() {
    console.log('🧪 [WebRTC Test] Starting connection test...');
    console.log('🔌 [WebRTC Test] URL:', TEST_CONFIG.url);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          console.error('❌ [WebRTC Test] Connection timeout');
          reject(new Error('Connection timeout'));
        }
      }, TEST_CONFIG.timeout);

      try {
        const ws = new WebSocket(TEST_CONFIG.url);

        ws.on('open', () => {
          console.log('✅ [WebRTC Test] Connection established successfully');
          this.isConnected = true;
          clearTimeout(timeout);
          
          // Send a test ping
          ws.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: Date.now(),
            test: true 
          }));
          
          setTimeout(() => {
            ws.close(1000, 'Test completed');
            resolve('Connection successful');
          }, 2000);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📨 [WebRTC Test] Message received:', message.type);
            
            if (message.type === 'pong') {
              console.log('🏓 [WebRTC Test] Pong received, connection healthy');
            }
          } catch (error) {
            console.error('❌ [WebRTC Test] Error parsing message:', error);
          }
        });

        ws.on('close', (code, reason) => {
          console.log('🔌 [WebRTC Test] Connection closed:', code, reason.toString());
          clearTimeout(timeout);
          if (this.isConnected) {
            resolve('Connection test completed');
          } else {
            reject(new Error(`Connection closed unexpectedly: ${code} - ${reason}`));
          }
        });

        ws.on('error', (error) => {
          console.error('❌ [WebRTC Test] WebSocket error:', error.message);
          clearTimeout(timeout);
          
          // Handle SSL/TLS errors with retry logic
          if (error.message && (
            error.message.includes('Connection reset by peer') ||
            error.message.includes('ssl') ||
            error.message.includes('TLS') ||
            error.message.includes('SSL')
          )) {
            console.warn('🔄 [WebRTC Test] SSL/TLS error detected, retrying...');
            this.handleRetry(resolve, reject);
            return;
          }
          
          reject(error);
        });

      } catch (error) {
        console.error('❌ [WebRTC Test] Failed to create connection:', error);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  handleRetry(resolve, reject) {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ [WebRTC Test] Max retries reached');
      reject(new Error('Max retries reached'));
      return;
    }

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
    
    console.log(`🔄 [WebRTC Test] Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
    
    setTimeout(() => {
      this.testConnection().then(resolve).catch(reject);
    }, delay);
  }
}

// Run the test
async function runTest() {
  const tester = new WebRTCConnectionTester();
  
  try {
    const result = await tester.testConnection();
    console.log('✅ [WebRTC Test] Test completed successfully:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ [WebRTC Test] Test failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 [WebRTC Test] Test interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 [WebRTC Test] Test terminated');
  process.exit(0);
});

// Run the test
runTest();
