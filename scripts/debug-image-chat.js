const axios = require('axios');

// Debug script to test image chat functionality
async function debugImageChat() {
  console.log('🔍 Debugging Image Chat Issue\n');

  const baseURL = 'http://172.20.10.11:8000';
  
  try {
    // Test 1: Check backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Backend is running');

    // Test 2: Check upload endpoint
    console.log('\n2️⃣ Testing upload endpoint...');
    console.log('Endpoint: POST /api/upload/chat-attachment');
    console.log('Expected: Returns JSON with url field');

    // Test 3: Check chat message endpoint
    console.log('\n3️⃣ Testing chat message endpoint...');
    console.log('Endpoint: POST /api/chat/{appointmentId}/messages');
    console.log('Expected: Returns JSON with media_url field');

    // Test 4: Simulate the issue
    console.log('\n4️⃣ Issue Analysis:');
    console.log('❌ Error shows: file:///data/user/0/host.exp.exponent/cache/...');
    console.log('✅ Expected: http://172.20.10.11:8000/storage/chat_images/...');
    console.log('');
    console.log('🔍 Possible causes:');
    console.log('1. Upload is failing silently');
    console.log('2. Server URL not being returned properly');
    console.log('3. Local storage not being updated with server URL');
    console.log('4. Auto-sync overwriting server URL with local URI');
    console.log('5. Race condition between local storage and server sync');

    console.log('\n5️⃣ Debug Steps:');
    console.log('1. Check console logs for upload response');
    console.log('2. Verify server URL is being returned');
    console.log('3. Check if local storage is updated correctly');
    console.log('4. Monitor auto-sync behavior');
    console.log('5. Check if server response includes media_url');

    console.log('\n6️⃣ Frontend Debug Points:');
    console.log('📷 [Chat] Starting image message send with URI: <local-uri>');
    console.log('📷 [Chat] Upload successful, URL: <server-url>');
    console.log('📷 [Chat] Sending image message with server URL: <server-url>');
    console.log('📷 [MessageStorageService] Image URL received: <server-url>');
    console.log('📷 [MessageStorageService] Temp message media_url: <server-url>');
    console.log('📷 [MessageStorageService] Server message details: { media_url: <server-url> }');
    console.log('📷 [MessageStorageService] Updated message details: { media_url: <server-url> }');

    console.log('\n7️⃣ Backend Debug Points:');
    console.log('Chat attachment upload request: { has_file: true, ... }');
    console.log('File details: { original_name: ..., size: ..., url: ... }');
    console.log('File uploaded successfully: { path: ..., url: ..., folder: ... }');

    console.log('\n🎯 Next Steps:');
    console.log('1. Send an image in the chat');
    console.log('2. Check all console logs above');
    console.log('3. Look for any error messages');
    console.log('4. Verify the server URL is being used consistently');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugImageChat(); 