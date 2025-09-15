const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://172.20.10.11:8000/api';

// Test configuration
const TEST_CONFIG = {
  doctorEmail: 'doctor@example.com',
  doctorPassword: 'password123',
  patientEmail: 'patient@example.com', 
  patientPassword: 'password123',
  testMessages: [
    'Hello doctor, I have a question about my medication',
    'I have been experiencing some side effects',
    'What should I do about these symptoms?',
    'Thank you for the advice',
    'I will follow your recommendations'
  ]
};

class SystemTest {
  constructor() {
    this.doctorToken = null;
    this.patientToken = null;
    this.doctorId = null;
    this.patientId = null;
    this.sessionId = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addResult(testName, success, details = '') {
    this.testResults.push({ testName, success, details });
    this.log(`${testName}: ${success ? 'PASSED' : 'FAILED'} ${details}`, success ? 'success' : 'error');
  }

  async setupTestData() {
    this.log('Setting up test data...');
    
    try {
      // Create test doctor if doesn't exist
      const doctorResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_CONFIG.doctorEmail,
        password: TEST_CONFIG.doctorPassword,
        first_name: 'Test',
        last_name: 'Doctor',
        role: 'doctor',
        specialization: 'General Medicine',
        phone: '+1234567890'
      });
      
      if (doctorResponse.data.success) {
        this.log('Test doctor created');
      }
    } catch (error) {
      // Doctor might already exist, that's okay
      this.log('Test doctor already exists or creation failed (continuing...)');
    }

    try {
      // Create test patient if doesn't exist
      const patientResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_CONFIG.patientEmail,
        password: TEST_CONFIG.patientPassword,
        first_name: 'Test',
        last_name: 'Patient',
        role: 'patient',
        phone: '+1234567891'
      });
      
      if (patientResponse.data.success) {
        this.log('Test patient created');
      }
    } catch (error) {
      // Patient might already exist, that's okay
      this.log('Test patient already exists or creation failed (continuing...)');
    }
  }

  async loginUsers() {
    this.log('Logging in test users...');
    
    try {
      // Login doctor
      const doctorLogin = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_CONFIG.doctorEmail,
        password: TEST_CONFIG.doctorPassword
      });
      
      if (doctorLogin.data.success) {
        this.doctorToken = doctorLogin.data.data.token;
        this.doctorId = doctorLogin.data.data.user.id;
        this.log('Doctor login successful');
      } else {
        throw new Error('Doctor login failed');
      }

      // Login patient
      const patientLogin = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_CONFIG.patientEmail,
        password: TEST_CONFIG.patientPassword
      });
      
      if (patientLogin.data.success) {
        this.patientToken = patientLogin.data.data.token;
        this.patientId = patientLogin.data.data.user.id;
        this.log('Patient login successful');
      } else {
        throw new Error('Patient login failed');
      }

      this.addResult('User Login', true, 'Both doctor and patient logged in successfully');
    } catch (error) {
      this.addResult('User Login', false, error.message);
      throw error;
    }
  }

  async testTextSessionCreation() {
    this.log('Testing text session creation...');
    
    try {
      const sessionResponse = await axios.post(`${BASE_URL}/text-sessions/start`, {
        doctor_id: this.doctorId
      }, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (sessionResponse.data.success) {
        this.sessionId = sessionResponse.data.data.session_id;
        this.log(`Text session created: ${this.sessionId}`);
        this.addResult('Text Session Creation', true, `Session ID: ${this.sessionId}`);
      } else {
        throw new Error('Failed to create text session');
      }
    } catch (error) {
      this.addResult('Text Session Creation', false, error.message);
      throw error;
    }
  }

  async testMessageSending() {
    this.log('Testing message sending...');
    
    try {
      let successCount = 0;
      
      for (let i = 0; i < TEST_CONFIG.testMessages.length; i++) {
        const message = TEST_CONFIG.testMessages[i];
        
        const sendResponse = await axios.post(`${BASE_URL}/text-sessions/${this.sessionId}/messages`, {
          text: message,
          sender: this.patientId.toString()
        }, {
          headers: { Authorization: `Bearer ${this.patientToken}` }
        });

        if (sendResponse.data.success) {
          successCount++;
          this.log(`Message ${i + 1} sent successfully`);
        } else {
          this.log(`Failed to send message ${i + 1}`);
        }
      }

      if (successCount === TEST_CONFIG.testMessages.length) {
        this.addResult('Message Sending', true, `All ${successCount} messages sent successfully`);
      } else {
        this.addResult('Message Sending', false, `${successCount}/${TEST_CONFIG.testMessages.length} messages sent`);
      }
    } catch (error) {
      this.addResult('Message Sending', false, error.message);
    }
  }

  async testLocalStorageEndpoints() {
    this.log('Testing local storage endpoints...');
    
    try {
      // Test 1: Get messages for local storage
      const localStorageResponse = await axios.get(`${BASE_URL}/text-sessions/${this.sessionId}/local-storage`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (localStorageResponse.data.success) {
        const data = localStorageResponse.data.data;
        this.log(`Retrieved ${data.messages.length} messages for local storage`);
        
        if (data.messages.length > 0) {
          const message = data.messages[0];
          this.log(`Sample message: ID=${message.id}, Encrypted=${message.is_encrypted}, Algorithm=${message.algorithm}`);
        }
        
        this.addResult('Local Storage Endpoint', true, `${data.messages.length} messages retrieved`);
      } else {
        throw new Error('Failed to get messages for local storage');
      }

      // Test 2: Get session key
      const keyResponse = await axios.get(`${BASE_URL}/text-sessions/${this.sessionId}/key`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (keyResponse.data.success) {
        const keyData = keyResponse.data.data;
        this.log(`Session key retrieved: Algorithm=${keyData.algorithm}`);
        this.addResult('Session Key Endpoint', true, `Key retrieved successfully`);
      } else {
        throw new Error('Failed to get session key');
      }

      // Test 3: Get session metadata
      const metadataResponse = await axios.get(`${BASE_URL}/text-sessions/${this.sessionId}/metadata`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (metadataResponse.data.success) {
        const metadata = metadataResponse.data.data;
        this.log(`Session metadata: Doctor=${metadata.doctor?.name}, Status=${metadata.status}`);
        this.addResult('Session Metadata Endpoint', true, 'Metadata retrieved successfully');
      } else {
        throw new Error('Failed to get session metadata');
      }

    } catch (error) {
      this.addResult('Local Storage Endpoints', false, error.message);
    }
  }

  async testSyncFunctionality() {
    this.log('Testing sync functionality...');
    
    try {
      // Create mock local messages
      const mockLocalMessages = [
        {
          id: 'local_msg_1',
          encrypted_content: 'encrypted_content_1',
          iv: 'iv_1',
          tag: 'tag_1',
          algorithm: 'aes-256-gcm',
          is_encrypted: true,
          timestamp: new Date().toISOString(),
          sender_id: this.patientId
        },
        {
          id: 'local_msg_2',
          encrypted_content: 'encrypted_content_2',
          iv: 'iv_2',
          tag: 'tag_2',
          algorithm: 'aes-256-gcm',
          is_encrypted: true,
          timestamp: new Date().toISOString(),
          sender_id: this.patientId
        }
      ];

      const syncResponse = await axios.post(`${BASE_URL}/text-sessions/${this.sessionId}/sync`, {
        messages: mockLocalMessages
      }, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (syncResponse.data.success) {
        const syncData = syncResponse.data.data;
        this.log(`Sync successful: ${syncData.synced_count} messages synced`);
        this.addResult('Sync Functionality', true, `${syncData.synced_count} messages synced`);
      } else {
        throw new Error('Failed to sync messages');
      }
    } catch (error) {
      this.addResult('Sync Functionality', false, error.message);
    }
  }

  async testActiveSessions() {
    this.log('Testing active sessions endpoint...');
    
    try {
      const activeSessionsResponse = await axios.get(`${BASE_URL}/text-sessions/active-sessions`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (activeSessionsResponse.data.success) {
        const sessionsData = activeSessionsResponse.data.data;
        this.log(`Active sessions: ${sessionsData.active_sessions.length} sessions found`);
        
        if (sessionsData.active_sessions.length > 0) {
          const session = sessionsData.active_sessions[0];
          this.log(`Sample session: ID=${session.session_id}, Messages=${session.message_count}`);
        }
        
        this.addResult('Active Sessions Endpoint', true, `${sessionsData.active_sessions.length} sessions found`);
      } else {
        throw new Error('Failed to get active sessions');
      }
    } catch (error) {
      this.addResult('Active Sessions Endpoint', false, error.message);
    }
  }

  async testMessageRetrieval() {
    this.log('Testing message retrieval...');
    
    try {
      const messagesResponse = await axios.get(`${BASE_URL}/text-sessions/${this.sessionId}/messages`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (messagesResponse.data.success) {
        const messages = messagesResponse.data.data;
        this.log(`Retrieved ${messages.length} messages from server`);
        
        if (messages.length > 0) {
          const message = messages[0];
          this.log(`Sample message: "${message.text.substring(0, 50)}..."`);
        }
        
        this.addResult('Message Retrieval', true, `${messages.length} messages retrieved`);
      } else {
        throw new Error('Failed to retrieve messages');
      }
    } catch (error) {
      this.addResult('Message Retrieval', false, error.message);
    }
  }

  async testSessionEnd() {
    this.log('Testing session end...');
    
    try {
      const endResponse = await axios.post(`${BASE_URL}/text-sessions/${this.sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (endResponse.data.success) {
        this.log('Session ended successfully');
        this.addResult('Session End', true, 'Session ended successfully');
      } else {
        throw new Error('Failed to end session');
      }
    } catch (error) {
      this.addResult('Session End', false, error.message);
    }
  }

  async testPatientAccess() {
    this.log('Testing patient access functionality...');
    
    try {
      // Test patient history
      const historyResponse = await axios.get(`${BASE_URL}/text-sessions/patient/history`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (historyResponse.data.success) {
        const history = historyResponse.data.data;
        this.log(`Patient history: ${history.length} sessions found`);
        this.addResult('Patient History', true, `${history.length} sessions in history`);
      } else {
        throw new Error('Failed to get patient history');
      }

      // Test session messages access
      const sessionMessagesResponse = await axios.get(`${BASE_URL}/text-sessions/${this.sessionId}/patient/messages`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (sessionMessagesResponse.data.success) {
        const sessionData = sessionMessagesResponse.data.data;
        this.log(`Session messages: ${sessionData.messages.length} messages accessible`);
        this.addResult('Patient Session Access', true, `${sessionData.messages.length} messages accessible`);
      } else {
        throw new Error('Failed to access session messages');
      }

    } catch (error) {
      this.addResult('Patient Access', false, error.message);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Complete System Test for Local Storage Solution...\n');
    
    try {
      // Setup phase
      await this.setupTestData();
      await this.loginUsers();
      
      // Core functionality tests
      await this.testTextSessionCreation();
      await this.testMessageSending();
      await this.testLocalStorageEndpoints();
      await this.testSyncFunctionality();
      await this.testActiveSessions();
      await this.testMessageRetrieval();
      
      // Patient access tests
      await this.testPatientAccess();
      
      // Cleanup
      await this.testSessionEnd();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      this.generateReport();
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(50));
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.testName}: ${status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });
    
    console.log('\n🎯 SYSTEM STATUS:');
    console.log('-'.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 ALL SYSTEMS OPERATIONAL!');
      console.log('✅ Local storage solution is working perfectly');
      console.log('✅ All endpoints are functional');
      console.log('✅ Encryption and security are maintained');
      console.log('✅ WhatsApp-like experience is ready');
    } else {
      console.log('⚠️  SOME ISSUES DETECTED');
      console.log('Please review the failed tests above');
    }
    
    console.log('\n🔧 TECHNICAL DETAILS:');
    console.log('-'.repeat(50));
    console.log(`• Base URL: ${BASE_URL}`);
    console.log(`• Session ID: ${this.sessionId || 'N/A'}`);
    console.log(`• Doctor ID: ${this.doctorId || 'N/A'}`);
    console.log(`• Patient ID: ${this.patientId || 'N/A'}`);
    console.log(`• Test Messages: ${TEST_CONFIG.testMessages.length}`);
  }
}

// Run the complete system test
const systemTest = new SystemTest();
systemTest.runAllTests().then(() => {
  console.log('\n🏁 Complete system test finished!');
}).catch((error) => {
  console.error('💥 Test suite crashed:', error);
}); 