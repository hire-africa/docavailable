<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🐛 DEBUGGING SESSION TIMING\n";
echo "===========================\n\n";

// Get a test patient and doctor
$patient = User::where('user_type', 'patient')->first();
$doctor = User::where('user_type', 'doctor')->first();

if (!$patient || !$doctor) {
    echo "❌ Need both patient and doctor users for testing\n";
    exit(1);
}

// Create a test session
$session = TextSession::create([
    'patient_id' => $patient->id,
    'doctor_id' => $doctor->id,
    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
    'started_at' => now(),
    'last_activity_at' => now(),
    'sessions_used' => 0,
    'sessions_remaining_before_start' => 10,
    'reason' => 'Debug test session'
]);

echo "✅ Created session: ID {$session->id}\n\n";

// Test 1: Set deadline to 90 seconds from now
echo "📝 Test 1: Setting deadline to 90 seconds from now\n";
$deadline = now()->addSeconds(90);
$session->update(['doctor_response_deadline' => $deadline]);

echo "  Deadline set to: {$session->doctor_response_deadline}\n";
echo "  Current time: " . now() . "\n";
echo "  Time until deadline: " . now()->diffInSeconds($deadline) . " seconds\n\n";

// Test 2: Check the timing calculation
echo "📝 Test 2: Manual timing calculation\n";
$currentTime = now();
$timeRemaining = max(0, $session->doctor_response_deadline->diffInSeconds($currentTime));

echo "  Current time: {$currentTime}\n";
echo "  Deadline: {$session->doctor_response_deadline}\n";
echo "  Time remaining: {$timeRemaining} seconds\n";
echo "  Should expire: " . ($timeRemaining <= 0 ? 'YES' : 'NO') . "\n\n";

// Test 3: Call the controller method
echo "📝 Test 3: Calling controller checkResponse method\n";
$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse($session->id);
$responseData = json_decode($response->getContent(), true);

echo "  Controller response:\n";
echo "    Status: {$responseData['status']}\n";
echo "    Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "    Message: {$responseData['message']}\n\n";

// Cleanup
$session->delete();
echo "✅ Test completed and cleaned up\n";
