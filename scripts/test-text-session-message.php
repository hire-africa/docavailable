<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use App\Http\Controllers\ChatController;
use Illuminate\Http\Request;

echo "🧪 TESTING TEXT SESSION MESSAGE DETECTION\n";
echo "=========================================\n\n";

// Get a test patient and doctor
$patient = User::where('user_type', 'patient')->first();
$doctor = User::where('user_type', 'doctor')->first();

if (!$patient || !$doctor) {
    echo "❌ Need both patient and doctor users for testing\n";
    exit(1);
}

echo "✅ Found test users:\n";
echo "  Patient: {$patient->first_name} {$patient->last_name} (ID: {$patient->id})\n";
echo "  Doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";

// Create a test session
$session = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
    'started_at' => now(),
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 10,
    'reason' => 'Message detection test'
]);

echo "✅ Created test session: ID {$session->id}\n";
echo "  Status: {$session->status}\n";
echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n\n";

// Test sending a message as patient
echo "📝 Test: Sending message as patient\n";
echo "-----------------------------------\n";

// Create a mock request
$request = new Request();
$request->merge([
    'message' => 'Hello doctor, this is a test message',
    'message_type' => 'text',
    'temp_id' => 'test_patient_message_' . time()
]);

// Set the authenticated user (patient)
auth()->login($patient);

// Create ChatController instance with dependencies
$messageStorageService = app(\App\Services\MessageStorageService::class);
$chatController = new ChatController($messageStorageService);

// Call the sendMessage method with text session ID
$appointmentId = 'text_session_' . $session->id;

echo "📤 Sending message to: {$appointmentId}\n";
echo "  Message: {$request->message}\n";
echo "  Sender: {$patient->first_name} {$patient->last_name} (ID: {$patient->id})\n\n";

try {
    $response = $chatController->sendMessage($request, $appointmentId);
    $responseData = json_decode($response->getContent(), true);
    
    echo "✅ Message sent successfully!\n";
    echo "  Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    // Check if the session was updated
    $session->refresh();
    echo "📊 Session after message:\n";
    echo "  Status: {$session->status}\n";
    echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n";
    echo "  Last Activity: {$session->last_activity_at}\n\n";
    
} catch (Exception $e) {
    echo "❌ Error sending message: " . $e->getMessage() . "\n";
    echo "  File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
}

// Test sending a message as doctor
echo "📝 Test: Sending message as doctor\n";
echo "----------------------------------\n";

// Create a new session for doctor test
$session2 = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
    'started_at' => now(),
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 10,
    'reason' => 'Doctor response test'
]);

echo "✅ Created second test session: ID {$session2->id}\n";

// Set deadline first (simulate patient already sent message)
$session2->update([
    'doctor_response_deadline' => now()->addSeconds(90)
]);

echo "✅ Set deadline to: {$session2->doctor_response_deadline}\n";

// Create a mock request for doctor
$request2 = new Request();
$request2->merge([
    'message' => 'Hello patient, I am responding',
    'message_type' => 'text',
    'temp_id' => 'test_doctor_message_' . time()
]);

// Set the authenticated user (doctor)
auth()->login($doctor);

// Call the sendMessage method with text session ID
$appointmentId2 = 'text_session_' . $session2->id;

echo "📤 Sending message to: {$appointmentId2}\n";
echo "  Message: {$request2->message}\n";
echo "  Sender: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";

try {
    $response2 = $chatController->sendMessage($request2, $appointmentId2);
    $responseData2 = json_decode($response2->getContent(), true);
    
    echo "✅ Message sent successfully!\n";
    echo "  Response: " . json_encode($responseData2, JSON_PRETTY_PRINT) . "\n\n";
    
    // Check if the session was activated
    $session2->refresh();
    echo "📊 Session after doctor message:\n";
    echo "  Status: {$session2->status}\n";
    echo "  Activated At: " . ($session2->activated_at ? $session2->activated_at : 'NOT SET') . "\n";
    echo "  Last Activity: {$session2->last_activity_at}\n\n";
    
} catch (Exception $e) {
    echo "❌ Error sending message: " . $e->getMessage() . "\n";
    echo "  File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
}

// Cleanup
echo "🧹 Cleaning up test sessions...\n";
$session->delete();
$session2->delete();

echo "\n✅ All tests completed!\n";
echo "\n🔍 Check the Laravel logs for message detection entries:\n";
echo "  tail -f backend/storage/logs/laravel.log | grep -E '(Text session message received|Patient message detected|Doctor message detected|90-second timer started|Session activated)'\n";
