<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Services\NotificationService;
use App\Notifications\ChatMessageNotification;
use App\Models\Appointment;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔔 Testing Push Notification System\n";
echo "==================================\n\n";

try {
    // Test 1: Check FCM configuration
    echo "1️⃣ Checking FCM Configuration:\n";
    $fcmProjectId = config('services.fcm.project_id');
    $fcmServerKey = config('services.fcm.server_key');
    
    echo "   FCM Project ID: " . ($fcmProjectId ?: '❌ NOT SET') . "\n";
    echo "   FCM Server Key: " . ($fcmServerKey ? '✅ SET' : '❌ NOT SET') . "\n\n";
    
    if (!$fcmProjectId || !$fcmServerKey) {
        echo "❌ FCM configuration is incomplete. Please set FCM_PROJECT_ID and FCM_SERVER_KEY in .env\n";
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
    
    // Test 3: Test notification service
    echo "\n3️⃣ Testing Notification Service:\n";
    $notificationService = new NotificationService();
    
    // Create a test appointment
    $appointment = new Appointment();
    $appointment->id = 'test-appointment-' . time();
    $appointment->appointment_date = now();
    $appointment->patient_id = $user->id;
    $appointment->doctor_id = 1; // Assuming doctor with ID 1 exists
    
    // Test custom notification
    echo "   Sending custom notification...\n";
    $notificationService->sendCustomNotification(
        $user,
        'Test Notification',
        'This is a test push notification from DocAvailable',
        ['type' => 'test', 'timestamp' => now()->toISOString()]
    );
    echo "   ✅ Custom notification sent\n";
    
    // Test 4: Test FCM channel directly
    echo "\n4️⃣ Testing FCM Channel Directly:\n";
    $fcmChannel = new \App\Broadcasting\FcmChannel();
    
    $testNotification = new ChatMessageNotification(
        $user, // sender
        $appointment, // appointment
        'Test message', // message
        'test-message-' . time() // message ID
    );
    
    echo "   Sending test message notification...\n";
    $result = $fcmChannel->send($user, $testNotification);
    
    if ($result) {
        echo "   ✅ FCM notification sent successfully\n";
        echo "   Response: " . json_encode($result) . "\n";
    } else {
        echo "   ❌ FCM notification failed\n";
    }
    
    echo "\n✅ Notification system test completed!\n";
    echo "\nNext steps:\n";
    echo "1. Check your device for the test notification\n";
    echo "2. Check Laravel logs for detailed FCM responses\n";
    echo "3. Verify FCM server key is correct in .env\n";
    
} catch (Exception $e) {
    echo "❌ Error testing notifications: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
