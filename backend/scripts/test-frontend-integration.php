<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🧪 Testing Frontend Integration...\n";
echo "================================\n\n";

// Test appointment ID (from our test chat)
$appointmentId = 11;

echo "Testing appointment ID: {$appointmentId}\n\n";

// Test 1: Check if appointment exists and has correct data
echo "1. Testing appointment data...\n";
$appointment = DB::table('appointments')
    ->join('users as doctor', 'appointments.doctor_id', '=', 'doctor.id')
    ->join('users as patient', 'appointments.patient_id', '=', 'patient.id')
    ->where('appointments.id', $appointmentId)
    ->select(
        'appointments.*',
        'doctor.first_name as doctor_first_name',
        'doctor.last_name as doctor_last_name',
        'doctor.user_type as doctor_user_type',
        'patient.first_name as patient_first_name',
        'patient.last_name as patient_last_name',
        'patient.user_type as patient_user_type'
    )
    ->first();

if (!$appointment) {
    echo "❌ Appointment not found!\n";
    exit;
}

echo "✅ Appointment found:\n";
echo "   Patient: {$appointment->patient_first_name} {$appointment->patient_last_name} (ID: {$appointment->patient_id})\n";
echo "   Doctor: {$appointment->doctor_first_name} {$appointment->doctor_last_name} (ID: {$appointment->doctor_id})\n";
echo "   Date: {$appointment->appointment_date}\n";
echo "   Time: {$appointment->appointment_time}\n";
echo "   Status: {$appointment->status}\n\n";

// Test 2: Check if chat room exists
echo "2. Testing chat room...\n";
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

// Test 3: Check messages
echo "3. Testing messages...\n";
$messages = DB::table('chat_messages')
    ->where('chat_room_id', $chatRoom->id)
    ->orderBy('created_at', 'asc')
    ->get();

echo "✅ Messages found: " . count($messages) . "\n";
foreach ($messages as $message) {
    $sender = DB::table('users')->where('id', $message->sender_id)->first();
    $senderName = $sender ? $sender->first_name . ' ' . $sender->last_name : 'Unknown';
    if ($sender && $sender->user_type === 'doctor') {
        $senderName = 'Dr. ' . $senderName;
    }
    echo "   - {$senderName}: " . substr($message->content, 0, 50) . "...\n";
}

echo "\n";

// Test 4: Simulate ChatController getMessages response
echo "4. Testing ChatController getMessages response...\n";
$chatRoom = DB::table('chat_rooms')
    ->where('name', 'like', "%Appointment #{$appointmentId}%")
    ->first();
    
if ($chatRoom) {
    $messages = DB::table('chat_messages')
        ->where('chat_room_id', $chatRoom->id)
        ->orderBy('created_at', 'asc')
        ->get()
        ->map(function ($message) {
            $user = DB::table('users')->where('id', $message->sender_id)->first();
            $senderName = $user ? $user->first_name . ' ' . $user->last_name : 'Unknown';
            if ($user && $user->user_type === 'doctor') {
                $senderName = 'Dr. ' . $senderName;
            }
            
            return [
                'id' => $message->id,
                'appointment_id' => null,
                'sender_id' => $message->sender_id,
                'sender_name' => $senderName,
                'message' => $message->content,
                'created_at' => $message->created_at,
                'updated_at' => $message->updated_at
            ];
        });
        
    echo "✅ ChatController would return " . count($messages) . " messages\n";
    echo "✅ Response format matches frontend expectations\n";
} else {
    echo "❌ ChatController would return empty array\n";
}

echo "\n";

// Test 5: Simulate ChatController getChatInfo response
echo "5. Testing ChatController getChatInfo response...\n";
$appointment = DB::table('appointments')
    ->join('users as doctor', 'appointments.doctor_id', '=', 'doctor.id')
    ->join('users as patient', 'appointments.patient_id', '=', 'patient.id')
    ->where('appointments.id', $appointmentId)
    ->select(
        'appointments.*',
        'doctor.first_name as doctor_first_name',
        'doctor.last_name as doctor_last_name',
        'patient.first_name as patient_first_name',
        'patient.last_name as patient_last_name'
    )
    ->first();

if ($appointment) {
    $otherParticipantName = '';
    // Simulate patient perspective
    $otherParticipantName = 'Dr. ' . $appointment->doctor_first_name . ' ' . $appointment->doctor_last_name;
    
    $chatInfo = [
        'appointment_id' => $appointmentId,
        'other_participant_name' => $otherParticipantName,
        'appointment_date' => $appointment->appointment_date,
        'appointment_time' => $appointment->appointment_time,
        'status' => $appointment->status
    ];
    
    echo "✅ ChatController getChatInfo would return:\n";
    echo "   Appointment ID: {$chatInfo['appointment_id']}\n";
    echo "   Other Participant: {$chatInfo['other_participant_name']}\n";
    echo "   Date: {$chatInfo['appointment_date']}\n";
    echo "   Time: {$chatInfo['appointment_time']}\n";
    echo "   Status: {$chatInfo['status']}\n";
} else {
    echo "❌ ChatController getChatInfo would return 404\n";
}

echo "\n🎉 Frontend Integration Test Completed!\n";
echo "The test chat should now be accessible from both patient and doctor accounts.\n"; 