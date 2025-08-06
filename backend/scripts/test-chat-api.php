<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🧪 Testing Chat API endpoints...\n";
echo "===============================\n\n";

// Test appointment ID (from our test chat)
$appointmentId = 11;

echo "Testing appointment ID: {$appointmentId}\n\n";

// Check if appointment exists
$appointment = DB::table('appointments')->where('id', $appointmentId)->first();
if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit;
}

echo "✅ Appointment found:\n";
echo "   Patient ID: {$appointment->patient_id}\n";
echo "   Doctor ID: {$appointment->doctor_id}\n";
echo "   Date: {$appointment->appointment_date}\n";
echo "   Time: {$appointment->appointment_time}\n\n";

// Check if chat room exists
$chatRoom = DB::table('chat_rooms')
    ->where('name', 'like', "%Appointment #{$appointmentId}%")
    ->first();

if (!$chatRoom) {
    echo "❌ Chat room not found!\n";
    exit;
}

echo "✅ Chat room found:\n";
echo "   ID: {$chatRoom->id}\n";
echo "   Name: {$chatRoom->name}\n\n";

// Check messages
$messages = DB::table('chat_messages')
    ->where('chat_room_id', $chatRoom->id)
    ->orderBy('created_at', 'asc')
    ->get();

echo "✅ Messages found: " . count($messages) . "\n";
foreach ($messages as $message) {
    $sender = DB::table('users')->where('id', $message->sender_id)->first();
    $senderName = $sender ? $sender->first_name . ' ' . $sender->last_name : 'Unknown';
    echo "   - {$senderName}: " . substr($message->content, 0, 50) . "...\n";
}

echo "\n";

// Test the ChatController logic
echo "🔍 Testing ChatController logic...\n";

// Simulate getMessages method
$chatRoom = DB::table('chat_rooms')
    ->where('name', 'like', "%Appointment #{$appointmentId}%")
    ->first();
    
if ($chatRoom) {
    $messages = DB::table('chat_messages')
        ->where('chat_room_id', $chatRoom->id)
        ->orderBy('created_at', 'asc')
        ->get();
        
    echo "✅ ChatController would return " . count($messages) . " messages\n";
    
    // Transform messages to expected format
    foreach ($messages as $message) {
        $user = DB::table('users')->where('id', $message->sender_id)->first();
        $senderName = $user ? $user->first_name . ' ' . $user->last_name : 'Unknown';
        if ($user && $user->user_type === 'doctor') {
            $senderName = 'Dr. ' . $senderName;
        }
        
        echo "   - {$senderName}: {$message->content}\n";
    }
} else {
    echo "❌ ChatController would return empty array\n";
}

echo "\n🎉 Test completed!\n"; 