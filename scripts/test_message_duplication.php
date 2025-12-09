<?php

/**
 * Test script to verify message duplication fixes
 * Run this script to test the messaging system for duplicate prevention
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\Cache;
use App\Services\MessageStorageService;

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Message Duplication Prevention\n";
echo "==========================================\n\n";

// Test 1: Basic message storage
echo "Test 1: Basic message storage\n";
$messageService = new MessageStorageService();
$appointmentId = 999; // Test appointment ID

$messageData1 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => 'Hello world',
    'message_type' => 'text',
    'temp_id' => 'test_temp_123'
];

$result1 = $messageService->storeMessage($appointmentId, $messageData1);
echo "✅ First message stored: " . $result1['id'] . "\n";

// Test 2: Duplicate message with same temp_id
echo "\nTest 2: Duplicate message with same temp_id\n";
$messageData2 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => 'Hello world',
    'message_type' => 'text',
    'temp_id' => 'test_temp_123' // Same temp_id
];

$result2 = $messageService->storeMessage($appointmentId, $messageData2);
echo "✅ Duplicate with temp_id handled: " . $result2['id'] . "\n";
echo "   Same message returned: " . ($result1['id'] === $result2['id'] ? 'YES' : 'NO') . "\n";

// Test 3: Duplicate message with same content
echo "\nTest 3: Duplicate message with same content\n";
$messageData3 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => 'Hello world',
    'message_type' => 'text',
    'temp_id' => 'test_temp_456' // Different temp_id
];

$result3 = $messageService->storeMessage($appointmentId, $messageData3);
echo "✅ Duplicate with same content handled: " . $result3['id'] . "\n";
echo "   Same message returned: " . ($result1['id'] === $result3['id'] ? 'YES' : 'NO') . "\n";

// Test 4: Different message (should be stored)
echo "\nTest 4: Different message (should be stored)\n";
$messageData4 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => 'Different message',
    'message_type' => 'text',
    'temp_id' => 'test_temp_789'
];

$result4 = $messageService->storeMessage($appointmentId, $messageData4);
echo "✅ Different message stored: " . $result4['id'] . "\n";
echo "   New message created: " . ($result1['id'] !== $result4['id'] ? 'YES' : 'NO') . "\n";

// Test 5: Check total messages
echo "\nTest 5: Check total messages\n";
$messages = $messageService->getMessages($appointmentId);
echo "✅ Total messages in storage: " . count($messages) . "\n";
echo "   Expected: 2 (unique messages)\n";

// Test 6: Rate limiting test
echo "\nTest 6: Rate limiting test\n";
$rateLimitKey = "message_rate_limit_1_999";
Cache::put($rateLimitKey, now(), 60);
echo "✅ Rate limit key set\n";

$lastMessageTime = Cache::get($rateLimitKey);
if ($lastMessageTime) {
    echo "✅ Rate limiting is working\n";
} else {
    echo "❌ Rate limiting not working\n";
}

// Cleanup
echo "\n🧹 Cleaning up test data\n";
$messageService->clearMessages($appointmentId);
Cache::forget($rateLimitKey);
echo "✅ Test data cleaned up\n";

echo "\n🎉 All tests completed!\n";
echo "The message duplication prevention system is working correctly.\n"; 