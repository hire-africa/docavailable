<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🌍 TESTING REAL-WORLD FLOW\n";
echo "===========================\n\n";

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
    'reason' => 'Test real-world flow'
]);

echo "✅ Created session: ID {$session->id}\n";
echo "  Initial Status: {$session->status}\n\n";

// Simulate the real-world scenario where the deadline is set to a few seconds ago
echo "📝 Simulating session with deadline that just passed\n";
$session->update([
    'doctor_response_deadline' => now()->subSeconds(5) // Deadline passed 5 seconds ago
]);

echo "  Doctor Response Deadline set to: {$session->doctor_response_deadline}\n";
echo "  Current time: " . now() . "\n";
echo "  Status: {$session->status}\n\n";

// Check session status - this should show expired
$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Now simulate the doctor responding AFTER the deadline has passed
echo "📝 Simulating doctor responding after deadline passed\n";
$session->update([
    'status' => TextSession::STATUS_ACTIVE,
    'activated_at' => now()
]);

echo "  Session activated:\n";
echo "    Status: {$session->status}\n";
echo "    Activated At: {$session->activated_at}\n";
echo "    Doctor Response Deadline: {$session->doctor_response_deadline}\n\n";

// Check session status again - this should show active
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Test the scenario where the session is checked immediately after activation
echo "📝 Testing immediate check after activation\n";
// Refresh the session from database to ensure we have the latest data
$session->refresh();

$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Check Response Result (after refresh):\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Cleanup
$session->delete();
echo "✅ Test completed and cleaned up\n";
