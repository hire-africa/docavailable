<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\MessageStorageService;

// Initialize Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Message Replies...\n\n";

$messageStorageService = new MessageStorageService();
$appointmentId = 1; // Test appointment ID
$senderId = 1;
$senderName = "Test User";

echo "1. Creating original message...\n";
$originalMessage = $messageStorageService->createReplyMessage(
    $appointmentId,
    "Hello, how are you?",
    'text',
    $senderId,
    $senderName,
    '', // No reply to
    '', // No reply message
    null
);
echo "   Original message created: " . ($originalMessage ? '✅ Success' : '❌ Failed') . "\n";
echo "   Message ID: " . ($originalMessage['id'] ?? 'N/A') . "\n\n";

if ($originalMessage) {
    echo "2. Creating reply message...\n";
    $replyMessage = $messageStorageService->createReplyMessage(
        $appointmentId,
        "I'm doing great, thanks!",
        'text',
        2, // Different sender
        "Reply User",
        $originalMessage['id'],
        $originalMessage['message'],
        null
    );
    echo "   Reply message created: " . ($replyMessage ? '✅ Success' : '❌ Failed') . "\n";
    echo "   Reply to ID: " . ($replyMessage['reply_to_id'] ?? 'N/A') . "\n";
    echo "   Reply to message: " . ($replyMessage['reply_to_message'] ?? 'N/A') . "\n\n";

    echo "3. Getting all messages...\n";
    $messages = $messageStorageService->getMessages($appointmentId);
    echo "   Total messages: " . count($messages) . "\n";
    
    foreach ($messages as $message) {
        echo "   - Message: " . substr($message['message'], 0, 30) . "...";
        if (isset($message['reply_to_id']) && $message['reply_to_id']) {
            echo " (Reply to: " . substr($message['reply_to_message'], 0, 20) . "...)";
        }
        echo "\n";
    }
    echo "\n";

    echo "4. Testing get specific message...\n";
    $retrievedMessage = $messageStorageService->getMessage($appointmentId, $originalMessage['id']);
    echo "   Message retrieved: " . ($retrievedMessage ? '✅ Success' : '❌ Failed') . "\n";
    echo "   Message content: " . ($retrievedMessage['message'] ?? 'N/A') . "\n\n";
}

echo "✅ Reply tests completed!\n"; 