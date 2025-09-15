<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "🔧 FIXING INCORRECTLY EXPIRED TEXT SESSIONS\n";
echo "===========================================\n\n";

// Find sessions that are marked as expired but shouldn't be
$expiredSessions = TextSession::where('status', 'expired')->get();

if ($expiredSessions->isEmpty()) {
    echo "✅ No expired sessions found.\n";
    exit(0);
}

echo "Found {$expiredSessions->count()} expired sessions:\n\n";

$fixedCount = 0;

foreach ($expiredSessions as $session) {
    echo "Session ID: {$session->id}\n";
    echo "  Status: {$session->status}\n";
    echo "  Started: {$session->started_at}\n";
    echo "  Doctor Response Deadline: " . ($session->doctor_response_deadline ? $session->doctor_response_deadline : 'NOT SET') . "\n";
    echo "  Activated At: " . ($session->activated_at ? $session->activated_at : 'NOT ACTIVATED') . "\n";
    echo "  Has remaining time: " . ($session->getRemainingTimeMinutes() > 0 ? 'YES' : 'NO') . "\n";
    echo "  Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
    
    // Check if this session should actually be expired
    $shouldBeExpired = false;
    
    if ($session->status === 'waiting_for_doctor') {
        if ($session->doctor_response_deadline) {
            // Patient has sent first message, check if 90 seconds have passed since deadline
            $shouldBeExpired = now()->isAfter($session->doctor_response_deadline);
        } else {
            // Patient hasn't sent first message yet, should not be expired
            $shouldBeExpired = false;
        }
    }
    
    if (!$shouldBeExpired && $session->getRemainingTimeMinutes() > 0) {
        echo "  🔧 FIXING: This session should not be expired!\n";
        
        // Determine the correct status
        if ($session->activated_at) {
            // Session was activated, should be active
            $session->update([
                'status' => 'active',
                'ended_at' => null
            ]);
            echo "  ✅ Updated to 'active' status\n";
        } else {
            // Session is still waiting for doctor
            $session->update([
                'status' => 'waiting_for_doctor',
                'ended_at' => null
            ]);
            echo "  ✅ Updated to 'waiting_for_doctor' status\n";
        }
        
        $fixedCount++;
    } else {
        echo "  ℹ️  Session is correctly expired\n";
    }
    
    echo "\n";
}

echo "✅ Fixed {$fixedCount} incorrectly expired sessions!\n";

// Show summary of all sessions
echo "\n📊 SESSION SUMMARY:\n";
echo "==================\n";

$waitingSessions = TextSession::where('status', 'waiting_for_doctor')->count();
$activeSessions = TextSession::where('status', 'active')->count();
$expiredSessions = TextSession::where('status', 'expired')->count();
$endedSessions = TextSession::where('status', 'ended')->count();

echo "Waiting for doctor: {$waitingSessions}\n";
echo "Active: {$activeSessions}\n";
echo "Expired: {$expiredSessions}\n";
echo "Ended: {$endedSessions}\n";

echo "\n🎯 Next steps:\n";
echo "1. Test creating a new text session\n";
echo "2. Check that it starts with 'waiting_for_doctor' status\n";
echo "3. Verify it doesn't immediately show as expired\n";
echo "4. Test doctor response to activate the session\n";
