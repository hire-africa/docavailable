<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;

echo "📋 LISTING ACTIVE TEXT SESSIONS\n";
echo "===============================\n\n";

// Get all text sessions
$sessions = TextSession::orderBy('created_at', 'desc')->limit(10)->get();

if ($sessions->isEmpty()) {
    echo "❌ No text sessions found!\n";
    exit(1);
}

echo "✅ Found " . $sessions->count() . " recent text sessions:\n\n";

foreach ($sessions as $session) {
    $patient = User::find($session->patient_id);
    $doctor = User::find($session->doctor_id);
    
    $patientName = $patient ? "{$patient->first_name} {$patient->last_name}" : "Unknown";
    $doctorName = $doctor ? "{$doctor->first_name} {$doctor->last_name}" : "Unknown";
    
    echo "Session ID: {$session->id}\n";
    echo "  Status: {$session->status}\n";
    echo "  Patient: {$patientName} (ID: {$session->patient_id})\n";
    echo "  Doctor: {$doctorName} (ID: {$session->doctor_id})\n";
    echo "  Started: {$session->started_at}\n";
    echo "  Last Activity: {$session->last_activity_at}\n";
    echo "  Sessions Remaining: {$session->sessions_remaining_before_start}\n";
    echo "  Sessions Used: {$session->sessions_used}\n";
    echo "  Max Duration: " . ($session->max_duration_minutes ? $session->max_duration_minutes . " min" : "NULL") . "\n";
    
    if ($session->doctor_response_deadline) {
        $timeRemaining = max(0, $session->doctor_response_deadline->timestamp - now()->timestamp);
        echo "  Doctor Response Deadline: {$session->doctor_response_deadline} (Remaining: {$timeRemaining}s)\n";
    } else {
        echo "  Doctor Response Deadline: NOT SET\n";
    }
    
    if ($session->activated_at) {
        echo "  Activated: {$session->activated_at}\n";
    }
    
    if ($session->ended_at) {
        echo "  Ended: {$session->ended_at}\n";
    }
    
    // Calculate time metrics
    $elapsedMinutes = $session->getElapsedMinutes();
    $totalAllowedMinutes = $session->getTotalAllowedMinutes();
    $remainingTimeMinutes = $session->getRemainingTimeMinutes();
    
    echo "  Elapsed: {$elapsedMinutes} min, Allowed: {$totalAllowedMinutes} min, Remaining: {$remainingTimeMinutes} min\n";
    echo "  Should Auto-End: " . ($session->shouldAutoEnd() ? 'YES' : 'NO') . "\n";
    echo "  Has Run Out of Time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
    echo "\n";
}

echo "✅ Session listing complete!\n";

