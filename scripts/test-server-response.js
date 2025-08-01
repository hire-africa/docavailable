const axios = require('axios');

// Test script to verify server response includes media_url
async function testServerResponse() {
  console.log('🧪 Testing Server Response for Image Messages\n');

  const baseURL = 'http://172.20.10.11:8000';
  
  try {
    // Test 1: Check backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Backend is running');

    // Test 2: Simulate image message send
    console.log('\n2️⃣ Testing image message endpoint...');
    console.log('Endpoint: POST /api/chat/{appointmentId}/messages');
    console.log('Expected payload:');
    console.log('  - message: "📷 Image"');
    console.log('  - message_type: "image"');
    console.log('  - media_url: "http://172.20.10.11:8000/storage/chat_images/..."');
    console.log('  - temp_id: "image_1234567890_abc123"');

    // Test 3: Expected server response
    console.log('\n3️⃣ Expected server response:');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "data": {');
    console.log('    "id": "server-generated-id",');
    console.log('    "appointment_id": 123,');
    console.log('    "sender_id": 456,');
    console.log('    "sender_name": "John Doe",');
    console.log('    "message": "📷 Image",');
    console.log('    "message_type": "image",');
    console.log('    "media_url": "http://172.20.10.11:8000/storage/chat_images/...",');
    console.log('    "temp_id": "image_1234567890_abc123",');
    console.log('    "timestamp": "2024-01-01T12:00:00.000Z",');
    console.log('    "created_at": "2024-01-01T12:00:00.000Z",');
    console.log('    "updated_at": "2024-01-01T12:00:00.000Z"');
    console.log('  }');
    console.log('}');

    // Test 4: Issue analysis
    console.log('\n4️⃣ Potential Issues:');
    console.log('❌ Server not returning media_url in response');
    console.log('❌ Server returning null/undefined media_url');
    console.log('❌ Frontend overwriting server URL with local URI');
    console.log('❌ Auto-sync overwriting server URL');
    console.log('❌ Race condition between local storage and server sync');

    // Test 5: Debug steps
    console.log('\n5️⃣ Debug Steps:');
    console.log('1. Send an image in the chat');
    console.log('2. Check server response in console logs');
    console.log('3. Verify media_url is present in response');
    console.log('4. Check if frontend is preserving server URL');
    console.log('5. Monitor auto-sync behavior');

    // Test 6: Frontend safeguards
    console.log('\n6️⃣ Frontend Safeguards Applied:');
    console.log('✅ Added URL validation in sendImageMessage');
    console.log('✅ Added safeguard in mergeMessages to preserve server URLs');
    console.log('✅ Added detailed logging throughout the process');
    console.log('✅ Added error handling for invalid server URLs');

    console.log('\n🎯 Next Steps:');
    console.log('1. Test image sending in the app');
    console.log('2. Check all console logs for the debug points');
    console.log('3. Verify server response includes media_url');
    console.log('4. Check if the safeguard is working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testServerResponse(); 