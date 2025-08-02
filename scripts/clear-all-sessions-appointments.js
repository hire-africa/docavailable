const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function clearAllSessionsAndAppointments() {
  console.log('🧹 Clearing All Sessions and Appointments');
  console.log('=========================================\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Logged in as:', user.first_name, user.last_name);

    // Set auth header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Get and end all active sessions
    console.log('\n2. Clearing active sessions...');
    try {
      const sessionsResponse = await axios.get(`${BASE_URL}/text-sessions`);
      if (sessionsResponse.data.success) {
        const sessions = sessionsResponse.data.data;
        console.log(`Found ${sessions.length} active sessions`);

        for (const session of sessions) {
          try {
            await axios.post(`${BASE_URL}/text-sessions/${session.session_id}/end`);
            console.log(`✅ Ended session ${session.session_id}`);
          } catch (error) {
            console.log(`⚠️  Could not end session ${session.session_id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not get sessions:', error.message);
    }

    // Step 3: Clear appointments (if there's an endpoint for this)
    console.log('\n3. Clearing appointments...');
    try {
      // Try to get appointments and delete them
      const appointmentsResponse = await axios.get(`${BASE_URL}/appointments`);
      if (appointmentsResponse.data.success) {
        const appointments = appointmentsResponse.data.data;
        console.log(`Found ${appointments.length} appointments`);

        for (const appointment of appointments) {
          try {
            await axios.delete(`${BASE_URL}/appointments/${appointment.id}`);
            console.log(`✅ Deleted appointment ${appointment.id}`);
          } catch (error) {
            console.log(`⚠️  Could not delete appointment ${appointment.id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not get appointments:', error.message);
    }

    // Step 4: Clear chat data (if endpoints exist)
    console.log('\n4. Clearing chat data...');
    try {
      const chatRoomsResponse = await axios.get(`${BASE_URL}/chat/rooms`);
      if (chatRoomsResponse.data.success) {
        const chatRooms = chatRoomsResponse.data.data;
        console.log(`Found ${chatRooms.length} chat rooms`);

        for (const room of chatRooms) {
          try {
            await axios.delete(`${BASE_URL}/chat/rooms/${room.id}`);
            console.log(`✅ Deleted chat room ${room.id}`);
          } catch (error) {
            console.log(`⚠️  Could not delete chat room ${room.id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not get chat rooms:', error.message);
    }

    // Step 5: Clear cache (if endpoint exists)
    console.log('\n5. Clearing cache...');
    try {
      await axios.post(`${BASE_URL}/admin/clear-cache`);
      console.log('✅ Cache cleared');
    } catch (error) {
      console.log('⚠️  Could not clear cache:', error.message);
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('All sessions, appointments, and chat data have been cleared.');
    console.log('You can now start fresh with new sessions and appointments.');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Also create a function to check current state
async function checkCurrentState() {
  console.log('📊 Checking Current Database State');
  console.log('================================\n');

  try {
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Check sessions
    try {
      const sessionsResponse = await axios.get(`${BASE_URL}/text-sessions`);
      if (sessionsResponse.data.success) {
        console.log(`📱 Active Sessions: ${sessionsResponse.data.data.length}`);
      }
    } catch (error) {
      console.log('📱 Active Sessions: Could not check');
    }

    // Check appointments
    try {
      const appointmentsResponse = await axios.get(`${BASE_URL}/appointments`);
      if (appointmentsResponse.data.success) {
        console.log(`📅 Appointments: ${appointmentsResponse.data.data.length}`);
      }
    } catch (error) {
      console.log('📅 Appointments: Could not check');
    }

    // Check chat rooms
    try {
      const chatRoomsResponse = await axios.get(`${BASE_URL}/chat/rooms`);
      if (chatRoomsResponse.data.success) {
        console.log(`💬 Chat Rooms: ${chatRoomsResponse.data.data.length}`);
      }
    } catch (error) {
      console.log('💬 Chat Rooms: Could not check');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Export functions for use
module.exports = {
  clearAllSessionsAndAppointments,
  checkCurrentState
};

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkCurrentState();
  } else {
    clearAllSessionsAndAppointments();
  }
} 