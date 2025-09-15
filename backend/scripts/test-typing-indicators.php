<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Support\Facades\Cache;
use App\Services\MessageStorageService;

// Initialize Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Typing Indicators...\n\n";

$messageStorageService = new MessageStorageService();
$appointmentId = 1; // Test appointment ID
$userId = 1;
$userName = "Test User";

echo "1. Testing start typing...\n";
$result = $messageStorageService->startTyping($appointmentId, $userId, $userName);
echo "   Result: " . ($result['success'] ? '✅ Success' : '❌ Failed') . "\n";
echo "   Message: " . $result['message'] . "\n";
echo "   Typing users: " . count($result['typing_users']) . "\n\n";

echo "2. Testing get typing users...\n";
$typingUsers = $messageStorageService->getTypingUsers($appointmentId);
echo "   Found " . count($typingUsers) . " typing users\n";
foreach ($typingUsers as $user) {
    echo "   - User ID: {$user['user_id']}, Name: {$user['user_name']}\n";
}
echo "\n";

echo "3. Testing stop typing...\n";
$result = $messageStorageService->stopTyping($appointmentId, $userId);
echo "   Result: " . ($result['success'] ? '✅ Success' : '❌ Failed') . "\n";
echo "   Message: " . $result['message'] . "\n";
echo "   Remaining typing users: " . count($result['typing_users']) . "\n\n";

echo "4. Testing get typing users after stop...\n";
$typingUsers = $messageStorageService->getTypingUsers($appointmentId);
echo "   Found " . count($typingUsers) . " typing users\n\n";

echo "5. Testing multiple users typing...\n";
$messageStorageService->startTyping($appointmentId, 1, "User 1");
$messageStorageService->startTyping($appointmentId, 2, "User 2");
$messageStorageService->startTyping($appointmentId, 3, "User 3");

$typingUsers = $messageStorageService->getTypingUsers($appointmentId);
echo "   Found " . count($typingUsers) . " typing users\n";
foreach ($typingUsers as $user) {
    echo "   - User ID: {$user['user_id']}, Name: {$user['user_name']}\n";
}
echo "\n";

echo "6. Testing auto-expiry (waiting 35 seconds)...\n";
echo "   Waiting for typing indicators to expire...\n";
sleep(35);

$typingUsers = $messageStorageService->getTypingUsers($appointmentId);
echo "   After expiry: Found " . count($typingUsers) . " typing users\n\n";

echo "✅ Typing indicator tests completed!\n"; 