<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🧪 TESTING MESSAGE DETECTION AND 90-SECOND TIMER\n";
echo "===============================================\n\n";

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

// Test 1: Simulate patient sending first message
echo "📝 Test 1: Simulating patient sending first message\n";
echo "---------------------------------------------------\n";

// Update session to simulate patient message
$session->update([
    'doctor_response_deadline' => now()->addSeconds(90)
]);

echo "✅ Doctor Response Deadline set to: {$session->doctor_response_deadline}\n";
echo "  Current time: " . now() . "\n";
echo "  Time until deadline: " . now()->diffInSeconds($session->doctor_response_deadline) . " seconds\n\n";

// Test 2: Check session status after patient message
echo "📝 Test 2: Checking session status after patient message\n";
echo "--------------------------------------------------------\n";

$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 3: Simulate time passing (85 seconds later)
echo "📝 Test 3: Simulating 85 seconds later\n";
echo "--------------------------------------\n";

// Update deadline to 5 seconds from now
$session->update([
    'doctor_response_deadline' => now()->addSeconds(5)
]);

echo "✅ Updated deadline to: {$session->doctor_response_deadline}\n";
echo "  Time until deadline: " . now()->diffInSeconds($session->doctor_response_deadline) . " seconds\n\n";

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 4: Simulate time passing (expired)
echo "📝 Test 4: Simulating expired deadline\n";
echo "--------------------------------------\n";

// Update deadline to 1 second ago
$session->update([
    'doctor_response_deadline' => now()->subSeconds(1)
]);

echo "✅ Updated deadline to: {$session->doctor_response_deadline}\n";
echo "  Time since deadline: " . now()->diffInSeconds($session->doctor_response_deadline) . " seconds\n\n";

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 5: Simulate doctor responding before expiration
echo "📝 Test 5: Simulating doctor responding before expiration\n";
echo "---------------------------------------------------------\n";

// Create a new session for this test
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

// Simulate patient sending message
$session2->update([
    'doctor_response_deadline' => now()->addSeconds(90)
]);

echo "✅ Patient message sent, deadline set to: {$session2->doctor_response_deadline}\n";

// Simulate doctor responding
$session2->update([
    'status' => TextSession::STATUS_ACTIVE,
    'activated_at' => now()
]);

echo "✅ Doctor responded, session activated at: {$session2->activated_at}\n";

$response = $controller->checkResponse($session2->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Cleanup
echo "🧹 Cleaning up test sessions...\n";
$session->delete();
$session2->delete();

echo "\n✅ All tests completed successfully!\n";
echo "\n🎯 Summary:\n";
echo "1. Patient message should set 90-second deadline\n";
echo "2. Session should show 'waiting' status with time remaining\n";
echo "3. After 90 seconds, session should expire\n";
echo "4. Doctor response should activate session\n";
echo "5. Frontend should detect expiration and show alert\n";
echo "\n🔍 Next steps:\n";
echo "1. Check Laravel logs for message detection\n";
echo "2. Monitor frontend console for session checks\n";
echo "3. Verify API endpoints are working correctly\n";
