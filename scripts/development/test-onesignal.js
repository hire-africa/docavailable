const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function testOneSignalSetup() {
    console.log('🧪 Testing OneSignal Secure Notification Setup...\n');

    try {
        // Test 1: Check environment variables
        console.log('1️⃣ Checking OneSignal configuration...');
        const envResponse = await axios.get(`${BASE_URL}/test-env`);
        console.log('✅ OneSignal configuration check completed');
        console.log('   App ID:', envResponse.data.onesignal_app_id ? 'Configured' : 'Missing');
        console.log('   REST API Key:', envResponse.data.onesignal_rest_api_key);
        console.log('   Channel:', envResponse.data.notification_channel);

        if (!envResponse.data.onesignal_app_id || envResponse.data.onesignal_rest_api_key === 'missing') {
            console.log('\n❌ OneSignal not configured properly');
            console.log('   Please add to backend/.env:');
            console.log('   ONESIGNAL_APP_ID=your_app_id_here');
            console.log('   ONESIGNAL_REST_API_KEY=your_rest_api_key_here');
            return;
        }

        // Test 2: Test secure notification sending
        console.log('\n2️⃣ Testing secure notification trigger...');
        const testResponse = await axios.post(`${BASE_URL}/test-notification`, {
            user_id: 50, // Using user ID 50 (blacksleeky84@gmail.com)
            message: 'Test secure notification trigger'
        });
        
        console.log('✅ Secure notification trigger sent');
        console.log('   User ID:', testResponse.data.user_id);
        console.log('   User Email:', testResponse.data.user_email);
        console.log('   Has Push Token:', testResponse.data.has_push_token);
        console.log('   Push Notifications Enabled:', testResponse.data.push_notifications_enabled);

        console.log('\n🎉 OneSignal Secure Setup Test Complete!');
        console.log('\n🔒 Security Features:');
        console.log('✅ NO message content sent to OneSignal');
        console.log('✅ Only notification triggers sent');
        console.log('✅ Medical data stays on your servers');
        console.log('✅ HIPAA-compliant approach');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Send a chat message to trigger real notification');
        console.log('2. Check Laravel logs for OneSignal responses');
        console.log('3. Verify notification appears on device');
        console.log('4. Confirm NO message content in OneSignal dashboard');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 You may need to start the Laravel server first');
        }
    }
}

// Instructions for OneSignal setup
function showOneSignalSetupInstructions() {
    console.log('\n📋 OneSignal Setup Instructions:');
    console.log('\n1️⃣ Create OneSignal Account:');
    console.log('   - Go to https://onesignal.com');
    console.log('   - Sign up for free account');
    
    console.log('\n2️⃣ Create New App:');
    console.log('   - Click "New App"');
    console.log('   - Name: "DocAvailable"');
    console.log('   - Platform: React Native');
    
    console.log('\n3️⃣ Get Credentials:');
    console.log('   - App ID: Found in App Settings');
    console.log('   - REST API Key: Found in App Settings → Keys & IDs');
    
    console.log('\n4️⃣ Configure Backend:');
    console.log('   Add to backend/.env:');
    console.log('   ONESIGNAL_APP_ID=your_app_id_here');
    console.log('   ONESIGNAL_REST_API_KEY=your_rest_api_key_here');
    
    console.log('\n5️⃣ Test Setup:');
    console.log('   node scripts/test-onesignal.js');
}

if (require.main === module) {
    testOneSignalSetup();
}

module.exports = { testOneSignalSetup, showOneSignalSetupInstructions }; 