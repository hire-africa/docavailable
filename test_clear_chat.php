<?php
// Test script to verify clear chat functionality
require_once 'backend/vendor/autoload.php';

use App\Services\MessageStorageService;

// Test the clearMessages method
$messageStorageService = new MessageStorageService();

// Test appointment ID (you can change this)
$testAppointmentId = 1;

echo "🧪 Testing Clear Chat Functionality\n";
echo "=====================================\n\n";

// First, let's add some test messages
echo "1. Adding test messages...\n";
$testMessages = [
    [
        'sender_id' => 1,
        'sender_name' => 'Test User 1',
        'message' => 'Hello, this is a test message 1',
        'message_type' => 'text'
    ],
    [
        'sender_id' => 2,
        'sender_name' => 'Test User 2',
        'message' => 'Hello, this is a test message 2',
        'message_type' => 'text'
    ],
    [
        'sender_id' => 1,
        'sender_name' => 'Test User 1',
        'message' => 'Hello, this is a test message 3',
        'message_type' => 'text'
    ]
];

foreach ($testMessages as $messageData) {
    $result = $messageStorageService->storeMessage($testAppointmentId, $messageData);
    echo "   ✅ Added message: {$messageData['message']}\n";
}

// Check how many messages we have
echo "\n2. Checking message count...\n";
$messages = $messageStorageService->getMessages($testAppointmentId);
echo "   📊 Found " . count($messages) . " messages\n";

// Clear the messages
echo "\n3. Clearing messages...\n";
$clearResult = $messageStorageService->clearMessages($testAppointmentId);
if ($clearResult) {
    echo "   ✅ Messages cleared successfully\n";
} else {
    echo "   ❌ Failed to clear messages\n";
}

// Check message count again
echo "\n4. Checking message count after clear...\n";
$messagesAfterClear = $messageStorageService->getMessages($testAppointmentId);
echo "   📊 Found " . count($messagesAfterClear) . " messages\n";

if (count($messagesAfterClear) === 0) {
    echo "\n🎉 SUCCESS: Chat clear functionality is working correctly!\n";
} else {
    echo "\n❌ FAILED: Messages were not cleared properly\n";
}

echo "\n=====================================\n";
echo "Test completed!\n";
?> 