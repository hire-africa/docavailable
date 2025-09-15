<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔍 Checking chat_messages table structure...\n";
echo "==========================================\n\n";

// Get table columns
$columns = Schema::getColumnListing('chat_messages');
echo "Columns in chat_messages table:\n";
foreach ($columns as $col) {
    echo "- $col\n";
}

echo "\n";

// Check existing messages
echo "📝 Existing chat messages:\n";
$messages = DB::table('chat_messages')->get();
echo "Total messages: " . count($messages) . "\n\n";

foreach ($messages as $message) {
    echo "ID: {$message->id} | Chat Room: {$message->chat_room_id} | Sender: {$message->sender_id} | Type: {$message->type} | Content: " . substr($message->content, 0, 50) . "...\n";
}

echo "\n";

// Check chat rooms
echo "🏠 Existing chat rooms:\n";
$chatRooms = DB::table('chat_rooms')->get();
echo "Total chat rooms: " . count($chatRooms) . "\n\n";

foreach ($chatRooms as $room) {
    echo "ID: {$room->id} | Name: {$room->name} | Type: {$room->type}\n";
}

echo "\n";

// Check chat room participants
echo "👥 Chat room participants:\n";
$participants = DB::table('chat_room_participants')->get();
echo "Total participants: " . count($participants) . "\n\n";

foreach ($participants as $participant) {
    echo "Room: {$participant->chat_room_id} | User: {$participant->user_id} | Role: {$participant->role}\n";
} 