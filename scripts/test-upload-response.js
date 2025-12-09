const axios = require('axios');

// Test script to verify upload response structure
async function testUploadResponse() {
  console.log('🧪 Testing Upload Response Structure\n');

  const baseURL = 'http://172.20.10.11:8000';
  
  try {
    // Test 1: Check backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Backend is running');

    // Test 2: Expected response structure
    console.log('\n2️⃣ Expected response structure:');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "data": {');
    console.log('    "url": "http://172.20.10.11:8000/storage/chat_images/...",');
    console.log('    "name": "image_1234567890.jpg",');
    console.log('    "size": 12345,');
    console.log('    "type": "image",');
    console.log('    "extension": "jpg"');
    console.log('  },');
    console.log('  "message": "Attachment uploaded successfully."');
    console.log('}');

    // Test 3: Frontend access pattern
    console.log('\n3️⃣ Frontend access pattern:');
    console.log('const uploadResponse = await apiService.uploadFile("/upload/chat-attachment", formData);');
    console.log('const uploadData = uploadResponse.data;');
    console.log('const publicImageUrl = uploadData.url;');

    // Test 4: Potential issues
    console.log('\n4️⃣ Potential issues:');
    console.log('❌ uploadResponse.data is undefined');
    console.log('❌ uploadData.url is undefined');
    console.log('❌ uploadData.url is not a valid HTTP URL');
    console.log('❌ Upload is failing silently');
    console.log('❌ FormData is not constructed properly');

    // Test 5: Debug steps
    console.log('\n5️⃣ Debug steps:');
    console.log('1. Check console logs for "Upload response:"');
    console.log('2. Verify uploadResponse.success is true');
    console.log('3. Check uploadResponse.data structure');
    console.log('4. Verify uploadData.url exists and is HTTP URL');
    console.log('5. Test URL accessibility');

    console.log('\n🎯 Next Steps:');
    console.log('1. Send an image in the chat');
    console.log('2. Check all console logs');
    console.log('3. Look for "Upload response:" log');
    console.log('4. Verify the response structure matches expected');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testUploadResponse(); 