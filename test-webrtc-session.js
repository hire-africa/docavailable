#!/usr/bin/env node

/**
 * WebRTC Session Management Test
 * Tests the complete WebRTC session flow for both instant sessions and appointments
 */

const WebSocket = require('ws');
const axios = require('axios');

// Test configuration
const SIGNALING_SERVER_URL = 'ws://localhost:8080';
const API_BASE_URL = 'http://localhost:8000/api';

// Test data
const testData = {
  patient: {
    id: 1,
    name: 'Test Patient',
    authToken: 'test_patient_token'
  },
  doctor: {
    id: 2,
    name: 'Test Doctor',
    authToken: 'test_doctor_token'
  },
  appointmentId: 'test_appointment_123',
  textSessionId: 'text_session_456'
};

class WebRTCSessionTester {
  constructor() {
    this.testResults = [];
    this.connections = new Map();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Starting test: ${testName}`);
    try {
      await testFunction();
      this.testResults.push({ name: testName, status: 'PASSED' });
      this.log(`Test passed: ${testName}`, 'success');
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
    }
  }

  // Test 1: WebRTC Signaling Server Connection
  async testSignalingConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${SIGNALING_SERVER_URL}/audio-signaling/${testData.appointmentId}`);
      
      ws.on('open', () => {
        this.log('WebRTC signaling connection established');
        this.connections.set('signaling', ws);
        resolve();
      });

      ws.on('error', (error) => {
        this.log(`WebRTC signaling connection failed: ${error.message}`, 'error');
        reject(error);
      });

      ws.on('close', () => {
        this.log('WebRTC signaling connection closed');
      });
    });
  }

  // Test 2: Instant Session Flow
  async testInstantSessionFlow() {
    const ws = this.connections.get('signaling');
    if (!ws) throw new Error('No signaling connection available');

    return new Promise((resolve, reject) => {
      let messageCount = 0;
      const expectedMessages = [
        'connection-established',
        'session-status',
        'doctor-response-timer-started',
        'session-activated',
        'session-deduction',
        'session-ended'
      ];

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.log(`Received message: ${message.type}`);
          
          if (expectedMessages.includes(message.type)) {
            messageCount++;
            this.log(`Expected message received: ${message.type}`, 'success');
          }

          // Simulate instant session flow
          if (message.type === 'connection-established') {
            // Send patient message to start 90-second timer
            setTimeout(() => {
              this.sendMessage(ws, 'chat-message', {
                message: {
                  message: 'Hello doctor, I need help',
                  message_type: 'text',
                  temp_id: 'temp_123'
                },
                authToken: testData.patient.authToken
              });
            }, 1000);
          }

          if (message.type === 'doctor-response-timer-started') {
            // Simulate doctor response within 90 seconds
            setTimeout(() => {
              this.sendMessage(ws, 'chat-message', {
                message: {
                  message: 'Hello! How can I help you?',
                  message_type: 'text',
                  temp_id: 'temp_124'
                },
                authToken: testData.doctor.authToken
              });
            }, 2000);
          }

          if (message.type === 'session-activated') {
            // Simulate session ending after some time
            setTimeout(() => {
              this.sendMessage(ws, 'session-end-request', {
                reason: 'manual_end',
                authToken: testData.patient.authToken
              });
            }, 5000);
          }

          if (message.type === 'session-ended') {
            this.log('Instant session flow completed successfully', 'success');
            resolve();
          }

        } catch (error) {
          this.log(`Error parsing message: ${error.message}`, 'error');
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (messageCount < expectedMessages.length) {
          reject(new Error(`Only received ${messageCount}/${expectedMessages.length} expected messages`));
        }
      }, 30000);
    });
  }

  // Test 3: Appointment Session Flow
  async testAppointmentSessionFlow() {
    // Create new connection for appointment
    const appointmentWs = new WebSocket(`${SIGNALING_SERVER_URL}/audio-signaling/${testData.appointmentId}_appointment`);
    
    return new Promise((resolve, reject) => {
      let messageCount = 0;
      const expectedMessages = [
        'connection-established',
        'appointment-started',
        'session-ended'
      ];

      appointmentWs.on('open', () => {
        this.log('Appointment WebRTC connection established');
        this.connections.set('appointment', appointmentWs);
      });

      appointmentWs.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.log(`Received appointment message: ${message.type}`);
          
          if (expectedMessages.includes(message.type)) {
            messageCount++;
            this.log(`Expected appointment message received: ${message.type}`, 'success');
          }

          if (message.type === 'connection-established') {
            // Request appointment start
            setTimeout(() => {
              this.sendMessage(appointmentWs, 'appointment-start-request', {
                authToken: testData.patient.authToken
              });
            }, 1000);
          }

          if (message.type === 'appointment-started') {
            // Simulate appointment ending
            setTimeout(() => {
              this.sendMessage(appointmentWs, 'session-end-request', {
                reason: 'manual_end',
                authToken: testData.patient.authToken
              });
            }, 3000);
          }

          if (message.type === 'session-ended') {
            this.log('Appointment session flow completed successfully', 'success');
            resolve();
          }

        } catch (error) {
          this.log(`Error parsing appointment message: ${error.message}`, 'error');
        }
      });

      appointmentWs.on('error', (error) => {
        this.log(`Appointment WebRTC connection failed: ${error.message}`, 'error');
        reject(error);
      });

      // Timeout after 20 seconds
      setTimeout(() => {
        if (messageCount < expectedMessages.length) {
          reject(new Error(`Only received ${messageCount}/${expectedMessages.length} expected appointment messages`));
        }
      }, 20000);
    });
  }

  // Test 4: Session Status Requests
  async testSessionStatusRequests() {
    const ws = this.connections.get('signaling');
    if (!ws) throw new Error('No signaling connection available');

    return new Promise((resolve, reject) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'session-status') {
            this.log(`Session status received: ${JSON.stringify(message.sessionData)}`, 'success');
            resolve();
          }
        } catch (error) {
          this.log(`Error parsing status message: ${error.message}`, 'error');
        }
      });

      // Request session status
      this.sendMessage(ws, 'session-status-request', {});
    });
  }

  // Test 5: Typing Indicators
  async testTypingIndicators() {
    const ws = this.connections.get('signaling');
    if (!ws) throw new Error('No signaling connection available');

    return new Promise((resolve) => {
      let typingReceived = false;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'typing-indicator') {
            this.log(`Typing indicator received: ${message.isTyping}`, 'success');
            typingReceived = true;
            resolve();
          }
        } catch (error) {
          this.log(`Error parsing typing message: ${error.message}`, 'error');
        }
      });

      // Send typing indicator
      this.sendMessage(ws, 'typing-indicator', {
        isTyping: true
      });

      // Stop typing after 2 seconds
      setTimeout(() => {
        this.sendMessage(ws, 'typing-indicator', {
          isTyping: false
        });
      }, 2000);
    });
  }

  sendMessage(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
      this.log(`Sent message: ${type}`);
    } else {
      this.log(`Cannot send message: WebSocket not open`, 'error');
    }
  }

  // Test 6: Error Handling
  async testErrorHandling() {
    const ws = this.connections.get('signaling');
    if (!ws) throw new Error('No signaling connection available');

    return new Promise((resolve) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'error') {
            this.log(`Error message received: ${message.message}`, 'success');
            resolve();
          }
        } catch (error) {
          this.log(`Error parsing error message: ${error.message}`, 'error');
        }
      });

      // Send invalid message to trigger error
      ws.send('invalid json message');
    });
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting WebRTC Session Management Tests');
    this.log('==========================================');

    try {
      await this.runTest('WebRTC Signaling Connection', () => this.testSignalingConnection());
      await this.runTest('Session Status Requests', () => this.testSessionStatusRequests());
      await this.runTest('Typing Indicators', () => this.testTypingIndicators());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Instant Session Flow', () => this.testInstantSessionFlow());
      await this.runTest('Appointment Session Flow', () => this.testAppointmentSessionFlow());

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    } finally {
      this.printResults();
      this.cleanup();
    }
  }

  printResults() {
    this.log('\n📊 Test Results Summary');
    this.log('======================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      this.log(`${status} ${result.name}: ${result.status}`);
      if (result.error) {
        this.log(`   Error: ${result.error}`);
      }
    });
    
    this.log(`\nTotal: ${this.testResults.length} tests`);
    this.log(`Passed: ${passed}`);
    this.log(`Failed: ${failed}`);
    
    if (failed === 0) {
      this.log('\n🎉 All tests passed! WebRTC Session Management is working correctly!', 'success');
    } else {
      this.log('\n⚠️  Some tests failed. Please check the implementation.', 'error');
    }
  }

  cleanup() {
    this.log('🧹 Cleaning up connections...');
    this.connections.forEach((ws, name) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        this.log(`Closed ${name} connection`);
      }
    });
  }
}

// Run the tests
const tester = new WebRTCSessionTester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});
