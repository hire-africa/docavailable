#!/usr/bin/env node

/**
 * Backend API Endpoints Test
 * Tests if the required API endpoints are working for WebRTC session management
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';

// Test data
const testData = {
  appointmentId: 'test_appointment_123',
  textSessionId: 'test_text_session_456',
  authToken: 'test_token_123'
};

class BackendTester {
  constructor() {
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Testing: ${testName}`);
    try {
      await testFunction();
      this.testResults.push({ name: testName, status: 'PASSED' });
      this.log(`✅ ${testName} - PASSED`, 'success');
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
    }
  }

  // Test 1: Check if backend is running
  async testBackendHealth() {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
  }

  // Test 2: Test chat message endpoint
  async testChatMessageEndpoint() {
    const response = await axios.post(`${API_BASE_URL}/chat/${testData.appointmentId}/messages`, {
      message: 'Test message for WebRTC',
      message_type: 'text',
      temp_id: 'test_temp_123'
    }, {
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Chat message endpoint failed: ${response.data.message}`);
    }
  }

  // Test 3: Test text session status endpoint
  async testTextSessionStatusEndpoint() {
    const response = await axios.get(`${API_BASE_URL}/text-sessions/${testData.textSessionId}/status`, {
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Text session status endpoint failed: ${response.data.message}`);
    }
  }

  // Test 4: Test text session activation endpoint
  async testTextSessionActivationEndpoint() {
    const response = await axios.post(`${API_BASE_URL}/text-sessions/${testData.textSessionId}/activate`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Text session activation endpoint failed: ${response.data.message}`);
    }
  }

  // Test 5: Test text session auto-deduction endpoint
  async testTextSessionAutoDeductionEndpoint() {
    const response = await axios.post(`${API_BASE_URL}/text-sessions/${testData.textSessionId}/auto-deduct`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Text session auto-deduction endpoint failed: ${response.data.message}`);
    }
  }

  // Test 6: Test appointment status endpoint
  async testAppointmentStatusEndpoint() {
    const response = await axios.get(`${API_BASE_URL}/appointments/${testData.appointmentId}/status`, {
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Appointment status endpoint failed: ${response.data.message}`);
    }
  }

  // Test 7: Test appointment start endpoint
  async testAppointmentStartEndpoint() {
    const response = await axios.post(`${API_BASE_URL}/appointments/${testData.appointmentId}/start`, {}, {
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Appointment start endpoint failed: ${response.data.message}`);
    }
  }

  // Test 8: Test appointment end endpoint
  async testAppointmentEndEndpoint() {
    const response = await axios.post(`${API_BASE_URL}/appointments/${testData.appointmentId}/end`, {
      reason: 'test_end'
    }, {
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(`Appointment end endpoint failed: ${response.data.message}`);
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Backend API Endpoints Test');
    this.log('=====================================');

    try {
      await this.runTest('Backend Health Check', () => this.testBackendHealth());
      await this.runTest('Chat Message Endpoint', () => this.testChatMessageEndpoint());
      await this.runTest('Text Session Status Endpoint', () => this.testTextSessionStatusEndpoint());
      await this.runTest('Text Session Activation Endpoint', () => this.testTextSessionActivationEndpoint());
      await this.runTest('Text Session Auto-Deduction Endpoint', () => this.testTextSessionAutoDeductionEndpoint());
      await this.runTest('Appointment Status Endpoint', () => this.testAppointmentStatusEndpoint());
      await this.runTest('Appointment Start Endpoint', () => this.testAppointmentStartEndpoint());
      await this.runTest('Appointment End Endpoint', () => this.testAppointmentEndEndpoint());

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    } finally {
      this.printResults();
    }
  }

  printResults() {
    this.log('\n📊 Backend API Test Results');
    this.log('==========================');
    
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
      this.log('\n🎉 All backend API endpoints are working!', 'success');
    } else {
      this.log('\n⚠️  Some backend API endpoints failed. Please check your Laravel backend.', 'error');
    }
  }
}

// Run the tests
const tester = new BackendTester();
tester.runAllTests().catch(error => {
  console.error('❌ Backend test suite crashed:', error);
  process.exit(1);
});
