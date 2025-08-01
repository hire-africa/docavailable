const axios = require('axios');

// Test attachment upload to debug 422 error
async function testAttachment422() {
  console.log('🔍 Testing Attachment Upload 422 Error...\n');

  const baseURL = 'http://172.20.10.11:8000';
  const token = 'your-jwt-token-here'; // Replace with actual token

  try {
    // Test 1: Check if endpoint is accessible
    console.log('1️⃣ Testing endpoint accessibility...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Test with invalid FormData
    console.log('\n2️⃣ Testing with invalid FormData...');
    const FormData = require('form-data');
    const formData = new FormData();
    
    // This should cause a 422 error
    formData.append('wrong_field', 'test');
    
    try {
      const response = await axios.post(`${baseURL}/api/upload/chat-attachment`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      });
      console.log('❌ Expected 422 but got:', response.status);
    } catch (error) {
      if (error.response?.status === 422) {
        console.log('✅ Got expected 422 error');
        console.log('Error details:', error.response.data);
      } else {
        console.log('❌ Got unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 3: Test with missing file
    console.log('\n3️⃣ Testing with missing file...');
    const formData2 = new FormData();
    formData2.append('file', ''); // Empty file
    
    try {
      const response = await axios.post(`${baseURL}/api/upload/chat-attachment`, formData2, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData2.getHeaders()
        }
      });
      console.log('❌ Expected 422 but got:', response.status);
    } catch (error) {
      if (error.response?.status === 422) {
        console.log('✅ Got expected 422 error for missing file');
        console.log('Error details:', error.response.data);
      } else {
        console.log('❌ Got unexpected error:', error.response?.status, error.response?.data);
      }
    }

    console.log('\n🎯 Common 422 causes:');
    console.log('1. Missing "file" field in FormData');
    console.log('2. File size > 10MB');
    console.log('3. Invalid file type');
    console.log('4. FormData not properly constructed');
    console.log('5. Missing authentication token');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAttachment422(); 