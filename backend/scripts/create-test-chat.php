<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🔍 Checking users in database...\n";
echo "===============================\n\n";

// Get all users
$users = User::all(['id', 'first_name', 'last_name', 'email', 'user_type']);

foreach ($users as $user) {
    echo "ID: {$user->id} | Name: {$user->first_name} {$user->last_name} | Type: {$user->user_type} | Email: {$user->email}\n";
}

echo "\n";

// Find Usher Kamwendo (patient) and John Doe (doctor)
$usher = User::where('first_name', 'Usher')->where('last_name', 'Kamwendo')->first();
$john = User::where('first_name', 'John')->where('last_name', 'Doe')->first();

if (!$usher) {
    echo "❌ Usher Kamwendo not found. Creating patient account...\n";
    $usher = User::create([
        'first_name' => 'Usher',
        'last_name' => 'Kamwendo',
        'email' => 'usher.kamwendo@test.com',
        'password' => bcrypt('password123'),
        'user_type' => 'patient',
        'email_verified_at' => now(),
    ]);
    echo "✅ Created Usher Kamwendo (ID: {$usher->id})\n";
} else {
    echo "✅ Found Usher Kamwendo (ID: {$usher->id})\n";
}

if (!$john) {
    echo "❌ John Doe not found. Creating doctor account...\n";
    $john = User::create([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'email' => 'john.doe@test.com',
        'password' => bcrypt('password123'),
        'user_type' => 'doctor',
        'email_verified_at' => now(),
        'is_approved' => true,
    ]);
    echo "✅ Created John Doe (ID: {$john->id})\n";
} else {
    echo "✅ Found John Doe (ID: {$john->id})\n";
}

echo "\n";

// Create a test appointment
echo "📅 Creating test appointment...\n";
$appointmentId = DB::table('appointments')->insertGetId([
    'patient_id' => $usher->id,
    'doctor_id' => $john->id,
    'appointment_date' => '2025-07-22',
    'appointment_time' => '14:00',
    'appointment_type' => 'text',
    'duration_minutes' => 30,
    'status' => 1, // 1 = confirmed
    'created_at' => now(),
    'updated_at' => now(),
]);

echo "✅ Created appointment (ID: {$appointmentId})\n";

// Create a chat room for this appointment
echo "\n💬 Creating chat room...\n";
$chatRoomId = DB::table('chat_rooms')->insertGetId([
    'name' => "Appointment #{$appointmentId} - Usher Kamwendo & Dr. John Doe",
    'type' => 'private',
    'created_at' => now(),
    'updated_at' => now(),
]);

echo "✅ Created chat room (ID: {$chatRoomId})\n";

// Add participants to the chat room
DB::table('chat_room_participants')->insert([
    [
        'chat_room_id' => $chatRoomId,
        'user_id' => $usher->id,
        'role' => 'member',
        'joined_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ],
    [
        'chat_room_id' => $chatRoomId,
        'user_id' => $john->id,
        'role' => 'member',
        'joined_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]
]);

echo "✅ Added participants to chat room\n";

// Create test chat messages
echo "\n💬 Creating test chat messages...\n";

$messages = [
    [
        'chat_room_id' => $chatRoomId,
        'sender_id' => $john->id,
        'type' => 'text',
        'content' => 'Hello Usher! How can I help you today?',
        'created_at' => now()->subMinutes(10),
        'updated_at' => now()->subMinutes(10),
    ],
    [
        'chat_room_id' => $chatRoomId,
        'sender_id' => $usher->id,
        'type' => 'text',
        'content' => 'Hi Dr. Doe! I have some questions about my symptoms.',
        'created_at' => now()->subMinutes(8),
        'updated_at' => now()->subMinutes(8),
    ],
    [
        'chat_room_id' => $chatRoomId,
        'sender_id' => $john->id,
        'type' => 'text',
        'content' => 'Of course! Please describe your symptoms in detail.',
        'created_at' => now()->subMinutes(6),
        'updated_at' => now()->subMinutes(6),
    ],
    [
        'chat_room_id' => $chatRoomId,
        'sender_id' => $usher->id,
        'type' => 'text',
        'content' => 'I\'ve been experiencing headaches and fatigue for the past few days.',
        'created_at' => now()->subMinutes(4),
        'updated_at' => now()->subMinutes(4),
    ],
    [
        'chat_room_id' => $chatRoomId,
        'sender_id' => $john->id,
        'type' => 'text',
        'content' => 'I understand. Let\'s discuss this further. How severe are the headaches?',
        'created_at' => now()->subMinutes(2),
        'updated_at' => now()->subMinutes(2),
    ],
];

foreach ($messages as $message) {
    DB::table('chat_messages')->insert($message);
    echo "✅ Added message: " . ($message['sender_id'] == $john->id ? 'Dr. John Doe' : 'Usher Kamwendo') . " - \"{$message['content']}\"\n";
}

echo "\n🎉 Test chat created successfully!\n";
echo "================================\n";
echo "Appointment ID: {$appointmentId}\n";
echo "Patient: Usher Kamwendo (ID: {$usher->id})\n";
echo "Doctor: John Doe (ID: {$john->id})\n";
echo "Messages: " . count($messages) . "\n";
echo "\nYou can now test the chat by:\n";
echo "1. Logging in as Usher Kamwendo (usher@gmail.com / password123)\n";
echo "2. Going to Messages tab\n";
echo "3. Clicking on the appointment to open chat\n";
echo "4. Or logging in as John Doe (johndoe@gmail.com / password123)\n"; 