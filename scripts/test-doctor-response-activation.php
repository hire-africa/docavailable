<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🐛 DEBUGGING DOCTOR RESPONSE ACTIVATION\n";
echo "=======================================\n\n";

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
    'reason' => 'Test doctor response activation'
]);

echo "✅ Created session: ID {$session->id}\n";
echo "  Initial Status: {$session->status}\n\n";

// Simulate patient sending first message
echo "📝 Step 1: Simulating patient sending first message\n";
$session->update([
    'doctor_response_deadline' => now()->addSeconds(90)
]);

echo "  Doctor Response Deadline set to: {$session->doctor_response_deadline}\n";
echo "  Status: {$session->status}\n\n";

// Check session status after patient message
$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Simulate doctor responding
echo "📝 Step 2: Simulating doctor responding\n";
$session->update([
    'status' => TextSession::STATUS_ACTIVE,
    'activated_at' => now()
]);

echo "  Session activated:\n";
echo "    Status: {$session->status}\n";
echo "    Activated At: {$session->activated_at}\n";
echo "    Doctor Response Deadline: {$session->doctor_response_deadline}\n\n";

// Check session status after doctor response
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Test what happens if we simulate the session being checked after the deadline
echo "📝 Step 3: Testing what happens after deadline passes\n";
$session->update([
    'doctor_response_deadline' => now()->subSeconds(91) // Set deadline to 91 seconds ago
]);

echo "  Updated deadline to: {$session->doctor_response_deadline}\n";
echo "  Current status: {$session->status}\n\n";

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Cleanup
$session->delete();
echo "✅ Test completed and cleaned up\n";
