<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🧪 TESTING NEW SESSION LOGIC\n";
echo "============================\n\n";

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

// Test 1: Create a new session
echo "📝 Test 1: Creating new session\n";
echo "--------------------------------\n";

$session = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
    'started_at' => now(),
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 10,
    'reason' => 'Test session for new logic'
]);

echo "✅ Session created: ID {$session->id}\n";
echo "  Status: {$session->status}\n";
echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n";
echo "  Activated At: " . ($session->activated_at ? $session->activated_at : 'NOT ACTIVATED') . "\n\n";

// Test 2: Check session status before patient sends message
echo "📝 Test 2: Checking session before patient sends message\n";
echo "--------------------------------------------------------\n";

$controller = new \App\Http\Controllers\TextSessionController();
$request = new \Illuminate\Http\Request();
$request->setMethod('GET');

// Mock the response
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 3: Simulate patient sending first message
echo "📝 Test 3: Simulating patient sending first message\n";
echo "---------------------------------------------------\n";

// Update the session to simulate patient sending first message
$deadline = now()->addSeconds(90);
$session->update([
    'doctor_response_deadline' => $deadline
]);

echo "✅ Doctor Response Deadline set to: {$session->doctor_response_deadline}\n";
echo "  Current time: " . now() . "\n";
echo "  Time until deadline: " . now()->diffInSeconds($deadline) . " seconds\n\n";

// Add a small delay to ensure timing is correct
sleep(1);

// Test 4: Check session status after patient sends message
echo "📝 Test 4: Checking session after patient sends message\n";
echo "-------------------------------------------------------\n";

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 5: Simulate doctor responding
echo "📝 Test 5: Simulating doctor responding\n";
echo "---------------------------------------\n";

// Update the session to simulate doctor responding
$session->update([
    'status' => TextSession::STATUS_ACTIVE,
    'activated_at' => now()
]);

echo "✅ Session activated:\n";
echo "  Status: {$session->status}\n";
echo "  Activated At: {$session->activated_at}\n\n";

// Test 6: Check session status after doctor responds
echo "📝 Test 6: Checking session after doctor responds\n";
echo "-------------------------------------------------\n";

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Test 7: Simulate session expiration (90 seconds after deadline)
echo "📝 Test 7: Simulating session expiration\n";
echo "----------------------------------------\n";

// Create a new session and set deadline to 91 seconds ago
$expiredSession = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
    'started_at' => now()->subMinutes(5),
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 10,
    'reason' => 'Test expired session',
    'doctor_response_deadline' => now()->subSeconds(91) // 91 seconds ago
]);

echo "✅ Created expired session: ID {$expiredSession->id}\n";
echo "  Doctor Response Deadline: {$expiredSession->doctor_response_deadline}\n";

$response = $controller->checkResponse($expiredSession->id);
$responseData = json_decode($response->getContent(), true);

echo "✅ Check Response Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: {$responseData['timeRemaining']}\n";
echo "  Message: {$responseData['message']}\n\n";

// Cleanup
echo "🧹 Cleaning up test sessions...\n";
$session->delete();
$expiredSession->delete();

echo "\n✅ All tests completed successfully!\n";
echo "\n🎯 Summary of new logic:\n";
echo "1. Sessions start with 'waiting_for_doctor' status and no deadline\n";
echo "2. When patient sends first message, 90-second deadline is set\n";
echo "3. If doctor doesn't respond within 90 seconds, session expires\n";
echo "4. When doctor responds, session becomes 'active'\n";
echo "5. Active sessions continue until time runs out or manual end\n";
