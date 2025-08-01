// Test script to verify message sending functionality
const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.11:8000/api';

async function testMessageSending() {
  try {
    console.log('🧪 Testing message sending functionality...');
    
    // First, test the health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test the chat updates endpoint (without auth for now)
    console.log('2. Testing chat updates endpoint...');
    try {
      const updatesResponse = await axios.get(`${API_BASE_URL}/chat/11/updates?since=&limit=50`);
      console.log('✅ Chat updates endpoint working:', updatesResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Chat updates endpoint responding (401 expected without auth)');
      } else {
        console.log('❌ Chat updates endpoint error:', error.response?.data || error.message);
      }
    }
    
    // Test the send message endpoint (without auth for now)
    console.log('3. Testing send message endpoint...');
    try {
      const sendResponse = await axios.post(`${API_BASE_URL}/chat/11/messages`, {
        message: 'Test message from script',
        message_type: 'text'
      });
      console.log('✅ Send message endpoint working:', sendResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Send message endpoint responding (401 expected without auth)');
      } else {
        console.log('❌ Send message endpoint error:', error.response?.data || error.message);
      }
    }
    
    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMessageSending(); 