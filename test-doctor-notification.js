// Test doctor notification system
async function testDoctorNotification() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('🧪 Testing doctor notification system...');
    
    // Test 1: Check if doctor has push token
    console.log('\n1. Checking doctor push token status...');
    const doctorResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/users/2', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (doctorResponse.ok) {
      const doctorData = await doctorResponse.json();
      console.log('👨‍⚕️ Doctor info:', {
        id: doctorData.data?.id,
        name: doctorData.data?.first_name + ' ' + doctorData.data?.last_name,
        hasPushToken: !!doctorData.data?.push_token,
        pushTokenLength: doctorData.data?.push_token?.length || 0,
        pushNotificationsEnabled: doctorData.data?.push_notifications_enabled,
        lastSeen: doctorData.data?.last_seen_at
      });
    } else {
      console.error('❌ Failed to fetch doctor info:', doctorResponse.status);
    }
    
    // Test 2: Check FCM configuration
    console.log('\n2. Checking FCM configuration...');
    const configResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/env-test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('🔧 FCM Config:', {
        hasProjectId: !!configData.FCM_PROJECT_ID,
        hasServiceAccount: !!configData.FIREBASE_SERVICE_ACCOUNT_JSON,
        projectId: configData.FCM_PROJECT_ID
      });
    } else {
      console.error('❌ Failed to fetch config:', configResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing doctor notification:', error.message);
  }
}

testDoctorNotification();
