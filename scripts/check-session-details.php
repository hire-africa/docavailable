<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;

echo "🔍 CHECKING SESSION DETAILS\n";
echo "===========================\n\n";

// Get session ID from command line argument or use default
$sessionId = $argv[1] ?? 72;

echo "📋 Analyzing Session ID: {$sessionId}\n";
echo "=====================================\n\n";

// Check if session exists
$session = TextSession::find($sessionId);

if (!$session) {
    echo "❌ Session {$sessionId} does not exist!\n";
    exit(1);
}

echo "✅ Session {$sessionId} found:\n";
echo "  ID: {$session->id}\n";
echo "  Status: {$session->status}\n";
echo "  Patient ID: {$session->patient_id}\n";
echo "  Doctor ID: {$session->doctor_id}\n";
echo "  Started At: {$session->started_at}\n";
echo "  Last Activity: {$session->last_activity_at}\n";
echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n";
echo "  Activated At: " . ($session->activated_at ? $session->activated_at : 'NOT SET') . "\n";
echo "  Ended At: " . ($session->ended_at ? $session->ended_at : 'NOT SET') . "\n";
echo "  Sessions Remaining Before Start: {$session->sessions_remaining_before_start}\n";
echo "  Sessions Used: {$session->sessions_used}\n";
echo "  Max Duration Minutes: " . ($session->max_duration_minutes ? $session->max_duration_minutes : 'NULL') . "\n\n";

// Check if the users exist
$patient = User::find($session->patient_id);
$doctor = User::find($session->doctor_id);

echo "👥 User Information:\n";
echo "  Patient: " . ($patient ? "{$patient->first_name} {$patient->last_name} (ID: {$patient->id})" : "NOT FOUND") . "\n";
echo "  Doctor: " . ($doctor ? "{$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})" : "NOT FOUND") . "\n\n";

// Calculate time metrics
echo "⏰ Time Calculations:\n";
echo "=====================\n";

$elapsedMinutes = $session->getElapsedMinutes();
$totalAllowedMinutes = $session->getTotalAllowedMinutes();
$remainingTimeMinutes = $session->getRemainingTimeMinutes();
$remainingSessions = $session->getRemainingSessions();

echo "  Elapsed Minutes: {$elapsedMinutes}\n";
echo "  Total Allowed Minutes: {$totalAllowedMinutes}\n";
echo "  Remaining Time Minutes: {$remainingTimeMinutes}\n";
echo "  Remaining Sessions: {$remainingSessions}\n";

// Check if session should auto-end
$shouldAutoEnd = $session->shouldAutoEnd();
$hasRunOutOfTime = $session->hasRunOutOfTime();

echo "  Should Auto-End: " . ($shouldAutoEnd ? 'YES' : 'NO') . "\n";
echo "  Has Run Out of Time: " . ($hasRunOutOfTime ? 'YES' : 'NO') . "\n\n";

// Check doctor response deadline
if ($session->doctor_response_deadline) {
    $currentTime = now();
    $deadline = $session->doctor_response_deadline;
    $timeRemaining = max(0, $deadline->timestamp - $currentTime->timestamp);
    
    echo "⏱️  Doctor Response Timer:\n";
    echo "========================\n";
    echo "  Current Time: {$currentTime}\n";
    echo "  Deadline: {$deadline}\n";
    echo "  Time Remaining: {$timeRemaining} seconds\n";
    echo "  Is Expired: " . ($timeRemaining <= 0 ? 'YES' : 'NO') . "\n\n";
}

// Test the session status check
echo "🔍 Testing Session Status Check:\n";
echo "================================\n";

$controller = new \App\Http\Controllers\TextSessionController();
$response = $controller->checkResponse($sessionId);
$responseData = json_decode($response->getContent(), true);

echo "✅ Session Status Check Result:\n";
echo "  Status: {$responseData['status']}\n";
echo "  Time Remaining: " . ($responseData['timeRemaining'] ?? 'null') . "\n";
echo "  Message: {$responseData['message']}\n";
echo "  Remaining Time Minutes: " . ($responseData['remainingTimeMinutes'] ?? 'null') . "\n";
echo "  Remaining Sessions: " . ($responseData['remainingSessions'] ?? 'null') . "\n\n";

// Analysis
echo "🎯 Analysis:\n";
echo "============\n";

if ($session->status === 'waiting_for_doctor') {
    if (!$session->doctor_response_deadline) {
        echo "✅ Session is waiting for doctor with no deadline set\n";
        echo "   This means no patient messages have been detected yet\n";
    } else {
        $timeRemaining = max(0, $session->doctor_response_deadline->timestamp - now()->timestamp);
        if ($timeRemaining <= 0) {
            echo "⚠️  Session should have expired (90-second timer)\n";
            echo "   Doctor response deadline has passed\n";
            echo "   Time since deadline: " . abs($timeRemaining) . " seconds\n";
        } else {
            echo "✅ Session is waiting for doctor response\n";
            echo "   Time remaining: {$timeRemaining} seconds\n";
        }
    }
} elseif ($session->status === 'active') {
    if ($remainingTimeMinutes <= 0) {
        echo "⚠️  Active session should have ended (duration timer)\n";
        echo "   Session has run out of time\n";
        echo "   Elapsed: {$elapsedMinutes} minutes, Allowed: {$totalAllowedMinutes} minutes\n";
    } else {
        echo "✅ Session is active with time remaining\n";
        echo "   Time remaining: {$remainingTimeMinutes} minutes\n";
    }
} else {
    echo "ℹ️  Session status: {$session->status}\n";
}

echo "\n✅ Session analysis complete!\n";

