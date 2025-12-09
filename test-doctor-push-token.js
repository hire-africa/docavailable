// Test doctor's push token status
const fetch = require('node-fetch');

async function testDoctorPushToken() {
  try {
    console.log('🧪 Testing doctor push token status...');
    
    // Test with a real auth token (you'll need to replace this with a valid one)
    const authToken = 'your_auth_token_here';
    
    const response = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/users/2', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch doctor info:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('👨‍⚕️ Doctor info:', {
      id: data.data?.id,
      name: data.data?.first_name + ' ' + data.data?.last_name,
      hasPushToken: !!data.data?.push_token,
      pushTokenLength: data.data?.push_token?.length || 0,
      pushNotificationsEnabled: data.data?.push_notifications_enabled,
      lastSeen: data.data?.last_seen_at
    });
    
  } catch (error) {
    console.error('❌ Error testing doctor push token:', error.message);
  }
}

testDoctorPushToken();
