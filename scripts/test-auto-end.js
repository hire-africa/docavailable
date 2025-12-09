const { apiService } = require('../app/services/apiService');

async function testAutoEnd() {
  console.log('🧪 Testing Auto-End Functionality');
  console.log('================================\n');

  try {
    // 1. Create a test session with 1 session remaining (10 minutes)
    console.log('1. Creating test session...');
    const startResponse = await apiService.post('/text-sessions/start', {
      doctor_id: 1, // Assuming doctor ID 1 exists
      reason: 'Auto-end test'
    });

    if (!startResponse.success) {
      console.error('❌ Failed to create test session:', startResponse.message);
      return;
    }

    const sessionId = startResponse.data.session_id;
    console.log(`✅ Test session created: ${sessionId}`);

    // 2. Check initial session status
    console.log('\n2. Checking initial session status...');
    const initialCheck = await apiService.get(`/text-sessions/${sessionId}/check-response`);
    console.log('Initial status:', initialCheck.data);

    // 3. Manually update the session to simulate time passing
    console.log('\n3. Simulating time passing (updating started_at to 11 minutes ago)...');
    
    // This would require direct database access, but for now let's just check the logic
    console.log('⚠️  Note: In a real test, you would update the database to simulate time passing');
    console.log('   - Set started_at to 11 minutes ago');
    console.log('   - This would make remaining_time_minutes = 0');
    console.log('   - The auto-end should trigger');

    // 4. Check what should happen
    console.log('\n4. Expected behavior:');
    console.log('   - Frontend should call check-response every 30 seconds');
    console.log('   - Backend should detect session has run out of time');
    console.log('   - Session should be marked as "ended"');
    console.log('   - Frontend should show "Session Ended" alert');
    console.log('   - User should be prompted to rate the session');

    // 5. Test the check-response endpoint manually
    console.log('\n5. Testing check-response endpoint...');
    const checkResponse = await apiService.get(`/text-sessions/${sessionId}/check-response`);
    console.log('Check response:', checkResponse.data);

    console.log('\n✅ Auto-end test completed!');
    console.log('\n📝 To test the full flow:');
    console.log('   1. Create a session with 1 session remaining');
    console.log('   2. Wait 10+ minutes or manually update database');
    console.log('   3. Open the chat in the frontend');
    console.log('   4. The session should auto-end within 30 seconds');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAutoEnd();

