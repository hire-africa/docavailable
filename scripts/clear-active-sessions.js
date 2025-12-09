const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function clearActiveSessions() {
  console.log('🧹 Clearing Active Sessions');
  console.log('==========================\n');

  try {
    // Step 1: Login as admin or a user with access
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'admin@test.com', // Replace with actual admin user
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Logged in as:', user.first_name, user.last_name);

    // Set auth header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Get all active sessions
    console.log('\n2. Getting active sessions...');
    const sessionsResponse = await axios.get(`${BASE_URL}/text-sessions`);
    
    if (!sessionsResponse.data.success) {
      console.error('Failed to get sessions:', sessionsResponse.data.message);
      return;
    }

    const sessions = sessionsResponse.data.data;
    console.log(`Found ${sessions.length} sessions`);

    if (sessions.length === 0) {
      console.log('✅ No active sessions found');
      return;
    }

    // Step 3: End each active session
    console.log('\n3. Ending active sessions...');
    for (const session of sessions) {
      console.log(`Ending session ${session.session_id}...`);
      
      try {
        const endResponse = await axios.post(`${BASE_URL}/text-sessions/${session.session_id}/end`, {
          session_id: session.session_id
        });

        if (endResponse.data.success) {
          console.log(`✅ Session ${session.session_id} ended successfully`);
        } else {
          console.log(`❌ Failed to end session ${session.session_id}:`, endResponse.data.message);
        }
      } catch (error) {
        console.log(`❌ Error ending session ${session.session_id}:`, error.message);
      }
    }

    // Step 4: Clear cache manually (if needed)
    console.log('\n4. Clearing cache...');
    try {
      // You might need to add an endpoint to clear cache, or restart the server
      console.log('⚠️  Cache clearing may require server restart');
    } catch (error) {
      console.log('❌ Error clearing cache:', error.message);
    }

    console.log('\n✅ Active sessions cleared!');
    console.log('You can now start a new session for testing.');

  } catch (error) {
    console.error('\n❌ Clear sessions failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

clearActiveSessions(); 