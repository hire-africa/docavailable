<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Broadcasting\FcmChannel;
use App\Notifications\ChatMessageNotification;
use App\Models\Appointment;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔔 Testing FCM V1 with fix (array_map('strval'))\n";
echo "===============================================\n\n";

try {
    // 1. Get a test user or create one
    $user = User::whereNotNull('push_token')->first();
    if (!$user) {
        echo "Creating temporary test user...\n";
        $user = new User();
        $user->id = 999999;
        $user->first_name = "Test";
        $user->last_name = "User";
        $user->push_token = "fcm_test_token_placeholder";
        $user->push_notifications_enabled = true;
    }

    echo "Using User ID: {$user->id}\n";
    echo "Push Token: " . substr($user->push_token, 0, 15) . "...\n\n";

    // 2. Mock an appointment
    $appointment = new Appointment();
    $appointment->id = 123;
    $appointment->appointment_date = now();

    // 3. Create notification
    $notification = new ChatMessageNotification(
        $user,
        $appointment,
        "Test message at " . now(),
        "msg_" . uniqid()
    );

    // 4. Send via FcmChannel
    $channel = new FcmChannel();
    echo "Sending notification...\n";
    $result = $channel->send($user, $notification);

    if ($result) {
        echo "\n✅ SUCCESS! Notification payload accepted by FCM.\n";
        echo "Result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "\n❌ FAILED. Check storage/logs/laravel.log for details.\n";
    }

} catch (\Exception $e) {
    echo "\n❌ EXCEPTION: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
