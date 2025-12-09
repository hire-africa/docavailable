const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';

async function testFcmV1Setup() {
    console.log('🧪 Testing FCM V1 API Setup...\n');

    try {
        // Test 1: Check if service account file exists
        console.log('1️⃣ Checking service account file...');
        const fs = require('fs');
        const serviceAccountPath = './storage/app/firebase-service-account.json';
        
        if (fs.existsSync(serviceAccountPath)) {
            console.log('✅ Service account file found');
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            console.log(`   Project ID: ${serviceAccount.project_id}`);
            console.log(`   Client Email: ${serviceAccount.client_email}`);
        } else {
            console.log('❌ Service account file not found');
            console.log('   Please download from Firebase Console → Project Settings → Service accounts');
            console.log('   Save as: backend/storage/app/firebase-service-account.json');
            return;
        }

        // Test 2: Check environment variables
        console.log('\n2️⃣ Checking environment variables...');
        const envResponse = await axios.get(`${BASE_URL}/test-env`);
        console.log('✅ Environment check completed');

        // Test 3: Test notification sending
        console.log('\n3️⃣ Testing notification sending...');
        const testResponse = await axios.post(`${BASE_URL}/test-notification`, {
            user_id: 1, // Replace with actual user ID
            message: 'Test FCM V1 notification'
        });
        
        console.log('✅ Test notification sent');
        console.log('   Response:', testResponse.data);

        console.log('\n🎉 FCM V1 Setup Test Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Send a chat message to trigger real notification');
        console.log('2. Check Laravel logs for FCM V1 API responses');
        console.log('3. Verify notification appears on device');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 You may need to create the test endpoints first');
        }
    }
}

// Create test endpoints if they don't exist
async function createTestEndpoints() {
    console.log('🔧 Creating test endpoints...');
    
    // This would typically be done in Laravel routes
    console.log('   Add these routes to backend/routes/api.php:');
    console.log(`
    Route::get('/test-env', function() {
        return response()->json([
            'fcm_project_id' => config('services.fcm.project_id'),
            'service_account_exists' => file_exists(storage_path('app/firebase-service-account.json'))
        ]);
    });
    
    Route::post('/test-notification', function(Request $request) {
        $user = User::find($request->user_id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        
        $user->notify(new ChatMessageNotification(
            'Test Sender',
            $request->message,
            'test-appointment-id'
        ));
        
        return response()->json(['message' => 'Test notification sent']);
    });
    `);
}

if (require.main === module) {
    testFcmV1Setup();
} 