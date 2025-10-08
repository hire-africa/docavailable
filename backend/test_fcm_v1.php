<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Services\NotificationService;
use App\Notifications\ChatMessageNotification;
use App\Models\Appointment;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔔 Testing FCM V1 API Implementation\n";
echo "====================================\n\n";

try {
    // Test 1: Check FCM V1 configuration
    echo "1️⃣ Checking FCM V1 Configuration:\n";
    $fcmProjectId = config('services.fcm.project_id');
    $serviceAccountJson = config('services.fcm.service_account_json');
    $credentialsPath = config('services.fcm.credentials_path');
    
    echo "   FCM Project ID: " . ($fcmProjectId ?: '❌ NOT SET') . "\n";
    echo "   Service Account JSON: " . ($serviceAccountJson ? '✅ SET' : '❌ NOT SET') . "\n";
    echo "   Credentials Path: " . ($credentialsPath ?: '❌ NOT SET') . "\n";
    echo "   Credentials File Exists: " . (file_exists($credentialsPath) ? '✅ YES' : '❌ NO') . "\n\n";
    
    if (!$fcmProjectId || (!$serviceAccountJson && !file_exists($credentialsPath))) {
        echo "❌ FCM V1 configuration is incomplete. Please:\n";
        echo "   1. Set FCM_PROJECT_ID in .env\n";
        echo "   2. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env (preferred for production)\n";
        echo "   3. OR place service account JSON file at: {$credentialsPath}\n";
        exit(1);
    }
    
    // Test 2: Find a user with push token
    echo "2️⃣ Finding User with Push Token:\n";
    $user = User::whereNotNull('push_token')
                ->where('push_notifications_enabled', true)
                ->first();
    
    if (!$user) {
        echo "   ❌ No user found with push token and notifications enabled\n";
        echo "   Creating test user...\n";
        
        $user = User::create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'user_type' => 'patient',
            'push_token' => 'test_token_' . time(),
            'push_notifications_enabled' => true,
        ]);
        echo "   ✅ Test user created with ID: {$user->id}\n";
    } else {
        echo "   ✅ Found user: {$user->first_name} {$user->last_name} (ID: {$user->id})\n";
        echo "   Push Token: " . substr($user->push_token, 0, 20) . "...\n";
    }
    
    // Test 3: Test FCM V1 channel directly
    echo "\n3️⃣ Testing FCM V1 Channel Directly:\n";
    $fcmChannel = new \App\Broadcasting\FcmChannel();
    
    // Create a test appointment
    $appointment = new Appointment();
    $appointment->id = 'test-appointment-' . time();
    $appointment->appointment_date = now();
    $appointment->patient_id = $user->id;
    $appointment->doctor_id = 1;
    
    $testNotification = new ChatMessageNotification(
        $user, // sender
        $appointment, // appointment
        'Test FCM V1 message', // message
        'test-message-' . time() // message ID
    );
    
    echo "   Sending test message notification via FCM V1...\n";
    $result = $fcmChannel->send($user, $testNotification);
    
    if ($result) {
        echo "   ✅ FCM V1 notification sent successfully\n";
        echo "   Response: " . json_encode($result) . "\n";
    } else {
        echo "   ❌ FCM V1 notification failed\n";
    }
    
    echo "\n✅ FCM V1 API test completed!\n";
    echo "\nNext steps:\n";
    echo "1. Check your device for the test notification\n";
    echo "2. Check Laravel logs for detailed FCM V1 responses\n";
    echo "3. Verify service account JSON is correctly placed\n";
    
} catch (Exception $e) {
    echo "❌ Error testing FCM V1: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
