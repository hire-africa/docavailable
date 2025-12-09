<?php

/**
 * Test script to verify voice message duplicate detection fix
 * Run this script to test that multiple voice messages can be sent
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

use App\Services\MessageStorageService;

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🎤 Testing Voice Message Duplicate Detection Fix\n";
echo "================================================\n\n";

$messageService = new MessageStorageService();
$appointmentId = 999; // Test appointment ID

// Test 1: First voice message
echo "Test 1: First voice message\n";
$voiceMessageData1 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => '🎤 Voice message',
    'message_type' => 'voice',
    'media_url' => 'https://example.com/voice1.m4a',
    'temp_id' => 'voice_temp_123'
];

$result1 = $messageService->storeMessage($appointmentId, $voiceMessageData1);
echo "✅ First voice message stored: " . $result1['id'] . "\n";
echo "   Media URL: " . $result1['media_url'] . "\n";

// Test 2: Second voice message with different media URL (should be stored)
echo "\nTest 2: Second voice message with different media URL\n";
$voiceMessageData2 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => '🎤 Voice message', // Same message text
    'message_type' => 'voice',
    'media_url' => 'https://example.com/voice2.m4a', // Different media URL
    'temp_id' => 'voice_temp_456'
];

$result2 = $messageService->storeMessage($appointmentId, $voiceMessageData2);
echo "✅ Second voice message stored: " . $result2['id'] . "\n";
echo "   Media URL: " . $result2['media_url'] . "\n";
echo "   Different message: " . ($result1['id'] !== $result2['id'] ? 'YES' : 'NO') . "\n";

// Test 3: Third voice message with same media URL (should be duplicate)
echo "\nTest 3: Third voice message with same media URL (should be duplicate)\n";
$voiceMessageData3 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => '🎤 Voice message',
    'message_type' => 'voice',
    'media_url' => 'https://example.com/voice1.m4a', // Same media URL as first
    'temp_id' => 'voice_temp_789'
];

$result3 = $messageService->storeMessage($appointmentId, $voiceMessageData3);
echo "✅ Third voice message result: " . $result3['id'] . "\n";
echo "   Is duplicate (same as first): " . ($result1['id'] === $result3['id'] ? 'YES' : 'NO') . "\n";

// Test 4: Fourth voice message with different media URL (should be stored)
echo "\nTest 4: Fourth voice message with different media URL\n";
$voiceMessageData4 = [
    'sender_id' => 1,
    'sender_name' => 'Test User',
    'message' => '🎤 Voice message',
    'message_type' => 'voice',
    'media_url' => 'https://example.com/voice3.m4a', // Different media URL
    'temp_id' => 'voice_temp_101'
];

$result4 = $messageService->storeMessage($appointmentId, $voiceMessageData4);
echo "✅ Fourth voice message stored: " . $result4['id'] . "\n";
echo "   Media URL: " . $result4['media_url'] . "\n";
echo "   Different message: " . ($result1['id'] !== $result4['id'] && $result2['id'] !== $result4['id'] ? 'YES' : 'NO') . "\n";

// Test 5: Check total messages
echo "\nTest 5: Check total messages\n";
$messages = $messageService->getMessages($appointmentId);
echo "✅ Total messages in storage: " . count($messages) . "\n";
echo "   Expected: 3 (unique voice messages with different media URLs)\n";

// Test 6: Verify unique media URLs
echo "\nTest 6: Verify unique media URLs\n";
$mediaUrls = array_unique(array_column($messages, 'media_url'));
echo "✅ Unique media URLs: " . count($mediaUrls) . "\n";
echo "   Media URLs: " . implode(', ', $mediaUrls) . "\n";

// Cleanup
echo "\n🧹 Cleaning up test data\n";
$messageService->clearMessages($appointmentId);
echo "✅ Test data cleaned up\n";

echo "\n🎉 Voice message duplicate detection test completed!\n";
echo "The fix should now allow multiple voice messages with different media URLs.\n"; 