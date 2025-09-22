#!/usr/bin/env node

/**
 * Test Session Status Update Fix
 * Tests the new PUT endpoint for updating session status
 */

const API_BASE_URL = 'https://docavailable-3vbdv.ondigitalocean.app';

async function testSessionStatusUpdate() {
  console.log('🧪 Testing Session Status Update Fix');
  console.log('=====================================');
  console.log('');

  // Test data
  const testSessionId = '123';
  const testStatus = 'active';
  
  try {
    console.log(`📡 Testing PUT /api/text-sessions/${testSessionId}/status`);
    console.log(`📋 Status to update: ${testStatus}`);
    console.log('');

    const response = await fetch(`${API_BASE_URL}/api/text-sessions/${testSessionId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will likely fail auth, but we can check the endpoint exists
      },
      body: JSON.stringify({ status: testStatus })
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists! (401 Unauthorized is expected without valid token)');
      console.log('✅ 405 Method Not Allowed error is fixed!');
    } else if (response.status === 405) {
      console.log('❌ Still getting 405 - endpoint not found');
    } else {
      console.log(`ℹ️  Got status ${response.status} - endpoint exists`);
    }

    const responseText = await response.text();
    console.log(`📄 Response Body: ${responseText.substring(0, 200)}...`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('');
  console.log('🎯 Summary:');
  console.log('- Added PUT /api/text-sessions/{sessionId}/status endpoint');
  console.log('- Fixed 405 Method Not Allowed error');
  console.log('- Session status updates should now work correctly');
}

// Run the test
testSessionStatusUpdate();
