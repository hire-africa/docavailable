<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing message flow for session 68...\n";

try {
    // Get user 15 (patient)
    $user = \App\Models\User::find(15);
    if (!$user) {
        echo "❌ User 15 not found\n";
        exit(1);
    }
    
    echo "✅ Using user: " . $user->first_name . " " . $user->last_name . "\n";
    
    // Authenticate the user
    \Illuminate\Support\Facades\Auth::login($user);
    echo "✅ User authenticated\n";
    
    // Test the MessageStorageService
    $messageService = app(\App\Services\MessageStorageService::class);
    echo "✅ MessageStorageService instantiated\n";
    
    // Get current messages
    $messages = $messageService->getMessages(68);
    echo "✅ Current messages count: " . count($messages) . "\n";
    
    if (!empty($messages)) {
        echo "Latest message:\n";
        $latest = end($messages);
        echo "  ID: " . ($latest['id'] ?? 'unknown') . "\n";
        echo "  Message: " . ($latest['message'] ?? 'unknown') . "\n";
        echo "  Sender: " . ($latest['sender_name'] ?? 'unknown') . "\n";
        echo "  Created: " . ($latest['created_at'] ?? 'unknown') . "\n";
        echo "  Delivery Status: " . ($latest['delivery_status'] ?? 'unknown') . "\n";
    }
    
    // Test storing a new message
    $messageData = [
        'sender_id' => 15,
        'sender_name' => 'Test User',
        'message' => 'Test message from PHP script - ' . date('H:i:s'),
        'message_type' => 'text',
        'temp_id' => 'test_php_' . time()
    ];
    
    $message = $messageService->storeMessage(68, $messageData);
    echo "✅ New message stored\n";
    echo "  Message ID: " . ($message['id'] ?? 'unknown') . "\n";
    echo "  Temp ID: " . ($message['temp_id'] ?? 'unknown') . "\n";
    
    // Get messages again to verify
    $messagesAfter = $messageService->getMessages(68);
    echo "✅ Messages count after storing: " . count($messagesAfter) . "\n";
    
    if (count($messagesAfter) > count($messages)) {
        echo "✅ Message was successfully added to storage\n";
    } else {
        echo "❌ Message was not added to storage\n";
    }
    
} catch (Exception $e) {
    echo "❌ Exception: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
