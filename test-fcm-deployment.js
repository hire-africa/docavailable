// Test FCM configuration after deployment
async function testFCMDeployment() {
  try {
    console.log('🧪 Testing FCM configuration after deployment...');
    
    // Test FCM configuration
    const configResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/env-test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('🔧 FCM Config Status:', {
        hasProjectId: !!configData.FCM_PROJECT_ID,
        hasServiceAccount: !!configData.FIREBASE_SERVICE_ACCOUNT_JSON,
        projectId: configData.FCM_PROJECT_ID,
        serviceAccountLength: configData.FIREBASE_SERVICE_ACCOUNT_JSON?.length || 0
      });
    } else {
      console.error('❌ Failed to fetch config:', configResponse.status);
    }
    
    // Test a simple call session creation
    console.log('\n📞 Testing call session creation...');
    const callResponse = await fetch('https://docavailable-3vbdv.ondigitalocean.app/api/call-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token'
      },
      body: JSON.stringify({
        appointment_id: 'test_appointment',
        call_type: 'video',
        doctor_id: 2,
        patient_id: 1
      })
    });
    
    if (callResponse.ok) {
      const callData = await callResponse.json();
      console.log('✅ Call session created:', callData);
    } else {
      const errorText = await callResponse.text();
      console.error('❌ Call session creation failed:', callResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing FCM deployment:', error.message);
  }
}

testFCMDeployment();


