// Test script to debug call connectivity issues
const fetch = require('node-fetch');

async function testCallDebug() {
  console.log('🔍 Testing Call Debug - Production vs Development');
  console.log('================================================');
  
  // Test 1: Check if production API is accessible
  console.log('\n1️⃣ Testing Production API Accessibility:');
  try {
    const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ Production API Status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Response: ${text.substring(0, 200)}...`);
  } catch (error) {
    console.log(`❌ Production API Error: ${error.message}`);
  }
  
  // Test 2: Check WebRTC signaling server
  console.log('\n2️⃣ Testing WebRTC Signaling Server:');
  try {
    const response = await fetch('https://docavailable.org/webrtc-health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ WebRTC Server Status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Response: ${text}`);
  } catch (error) {
    console.log(`❌ WebRTC Server Error: ${error.message}`);
  }
  
  // Test 3: Check call availability endpoint (without auth)
  console.log('\n3️⃣ Testing Call Availability Endpoint (No Auth):');
  try {
    const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions/check-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        call_type: 'voice'
      })
    });
    
    console.log(`📡 Call Availability Status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Response: ${text}`);
  } catch (error) {
    console.log(`❌ Call Availability Error: ${error.message}`);
  }
  
  // Test 4: Check environment variables that would be used
  console.log('\n4️⃣ Environment Variables Check:');
  console.log('EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL || 'Not set');
  console.log('EXPO_PUBLIC_LARAVEL_API_URL:', process.env.EXPO_PUBLIC_LARAVEL_API_URL || 'Not set');
  console.log('EXPO_PUBLIC_WEBRTC_SIGNALING_URL:', process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 'Not set');
  console.log('EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL:', process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL || 'Not set');
  
  console.log('\n🎯 Summary:');
  console.log('- If Production API returns 200: ✅ Backend is working');
  console.log('- If WebRTC Server returns 200: ✅ Signaling server is working');
  console.log('- If Call Availability returns 401: ❌ Authentication issue (expected without token)');
  console.log('- If Call Availability returns 200: ⚠️  Unexpected (should require auth)');
}

testCallDebug().catch(console.error);
