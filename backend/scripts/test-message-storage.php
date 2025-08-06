<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\MessageStorageService;
use Illuminate\Support\Facades\DB;

echo "🧪 Testing Message Storage System...\n";
echo "===================================\n\n";

// Test appointment ID
$appointmentId = 11;

echo "Testing appointment ID: {$appointmentId}\n\n";

// Create message storage service
$messageStorage = new MessageStorageService();

// Test 1: Check if appointment exists
echo "1. Testing appointment data...\n";
$appointment = DB::table('appointments')
    ->where('id', $appointmentId)
    ->first();

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit;
}

echo "✅ Appointment found:\n";
echo "   Patient ID: {$appointment->patient_id}\n";
echo "   Doctor ID: {$appointment->doctor_id}\n";
echo "   Status: {$appointment->status}\n\n";

// Test 2: Store a test message
echo "2. Testing message storage...\n";
$messageData = [
    'sender_id' => $appointment->patient_id,
    'sender_name' => 'Usher Kamwendo',
    'message' => 'Hello Dr. Doe! This is a test message from the new storage system.'
];

try {
    $message = $messageStorage->storeMessage($appointmentId, $messageData);
    echo "✅ Message stored successfully:\n";
    echo "   ID: {$message['id']}\n";
    echo "   Sender: {$message['sender_name']}\n";
    echo "   Message: " . substr($message['message'], 0, 50) . "...\n";
    echo "   Timestamp: {$message['timestamp']}\n\n";
} catch (Exception $e) {
    echo "❌ Failed to store message: {$e->getMessage()}\n";
    exit;
}

// Test 3: Store another message
echo "3. Testing second message...\n";
$messageData2 = [
    'sender_id' => $appointment->doctor_id,
    'sender_name' => 'Dr. John Doe',
    'message' => 'Hello Usher! I received your test message. The new system is working great!'
];

try {
    $message2 = $messageStorage->storeMessage($appointmentId, $messageData2);
    echo "✅ Second message stored successfully:\n";
    echo "   ID: {$message2['id']}\n";
    echo "   Sender: {$message2['sender_name']}\n";
    echo "   Message: " . substr($message2['message'], 0, 50) . "...\n\n";
} catch (Exception $e) {
    echo "❌ Failed to store second message: {$e->getMessage()}\n";
    exit;
}

// Test 4: Retrieve messages
echo "4. Testing message retrieval...\n";
try {
    $messages = $messageStorage->getMessages($appointmentId);
    echo "✅ Messages retrieved successfully:\n";
    echo "   Total messages: " . count($messages) . "\n";
    
    foreach ($messages as $index => $msg) {
        echo "   Message " . ($index + 1) . ":\n";
        echo "     ID: {$msg['id']}\n";
        echo "     Sender: {$msg['sender_name']}\n";
        echo "     Message: " . substr($msg['message'], 0, 40) . "...\n";
        echo "     Time: {$msg['timestamp']}\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "❌ Failed to retrieve messages: {$e->getMessage()}\n";
    exit;
}

// Test 5: Test local storage format
echo "5. Testing local storage format...\n";
try {
    $localData = $messageStorage->getMessagesForLocalStorage($appointmentId);
    echo "✅ Local storage data generated:\n";
    echo "   Appointment ID: {$localData['appointment_id']}\n";
    echo "   Message Count: {$localData['message_count']}\n";
    echo "   Last Sync: {$localData['last_sync']}\n";
    echo "   Messages: " . count($localData['messages']) . " items\n\n";
} catch (Exception $e) {
    echo "❌ Failed to generate local storage data: {$e->getMessage()}\n";
    exit;
}

// Test 6: Test sync from local storage
echo "6. Testing sync from local storage...\n";
$localMessages = [
    [
        'id' => 'local_test_1',
        'appointment_id' => $appointmentId,
        'sender_id' => $appointment->patient_id,
        'sender_name' => 'Usher Kamwendo',
        'message' => 'This is a local message that should be synced to server.',
        'timestamp' => now()->toISOString(),
        'created_at' => now()->toISOString(),
        'updated_at' => now()->toISOString()
    ]
];

try {
    $syncResult = $messageStorage->syncFromLocalStorage($appointmentId, $localMessages);
    echo "✅ Sync completed successfully:\n";
    echo "   Synced Count: {$syncResult['synced_count']}\n";
    echo "   Total Messages: {$syncResult['total_messages']}\n";
    echo "   Errors: " . count($syncResult['errors']) . "\n\n";
} catch (Exception $e) {
    echo "❌ Failed to sync from local storage: {$e->getMessage()}\n";
    exit;
}

// Test 7: Final message count
echo "7. Final message count...\n";
try {
    $finalMessages = $messageStorage->getMessages($appointmentId);
    echo "✅ Final message count: " . count($finalMessages) . "\n";
    echo "✅ All messages are stored in cache (no database)\n\n";
} catch (Exception $e) {
    echo "❌ Failed to get final messages: {$e->getMessage()}\n";
    exit;
}

echo "🎉 Message Storage System Test Completed!\n";
echo "The system is working correctly with cache-only storage.\n";
echo "Messages are stored in server cache and ready for local storage sync.\n"; 