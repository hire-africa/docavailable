const axios = require('axios');

// Test script to debug image upload process
async function testImageUploadDebug() {
  console.log('🔍 Debugging Image Upload Process\n');

  const baseURL = 'http://172.20.10.11:8000';
  
  try {
    // Test 1: Check backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Backend is running');

    // Test 2: Expected flow
    console.log('\n2️⃣ Expected Upload Flow:');
    console.log('📱 Frontend:');
    console.log('  1. User selects image');
    console.log('  2. FormData created with file');
    console.log('  3. POST /api/upload/chat-attachment');
    console.log('  4. Receive response with server URL');
    console.log('  5. Send message with server URL');
    console.log('  6. Store message with server URL');

    // Test 3: Current issue
    console.log('\n3️⃣ Current Issue:');
    console.log('❌ Error shows: file:///data/user/0/host.exp.exponent/cache/...');
    console.log('✅ Expected: http://172.20.10.11:8000/storage/chat_images/...');
    console.log('');
    console.log('🔍 This means:');
    console.log('   - Upload is failing OR');
    console.log('   - Server URL not being returned OR');
    console.log('   - Local URI being used instead of server URL');

    // Test 4: Debug points to check
    console.log('\n4️⃣ Debug Points to Check:');
    console.log('📱 Frontend logs:');
    console.log('  - "📷 [Chat] Starting image message send with URI:"');
    console.log('  - "📷 [Chat] Upload response:"');
    console.log('  - "📷 [Chat] Upload successful, URL:"');
    console.log('  - "📷 [Chat] Sending image message with server URL:"');
    console.log('');
    console.log('🔧 Backend logs:');
    console.log('  - "Chat attachment upload request:"');
    console.log('  - "File details:"');
    console.log('  - "File uploaded successfully:"');

    // Test 5: Common failure points
    console.log('\n5️⃣ Common Failure Points:');
    console.log('❌ FormData not constructed properly');
    console.log('❌ Upload endpoint returning error');
    console.log('❌ Server URL not in response');
    console.log('❌ Frontend not using server URL');
    console.log('❌ Auto-sync overwriting server URL');

    // Test 6: Test steps
    console.log('\n6️⃣ Test Steps:');
    console.log('1. Send an image in the chat');
    console.log('2. Check ALL console logs above');
    console.log('3. Look for any error messages');
    console.log('4. Verify upload response structure');
    console.log('5. Check if server URL is being used');

    console.log('\n🎯 Next Steps:');
    console.log('1. Try sending an image now');
    console.log('2. Check console logs for the debug points');
    console.log('3. Look for any error messages');
    console.log('4. Report back what you see in the logs');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testImageUploadDebug(); 