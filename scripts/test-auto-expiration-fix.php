<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🧪 TESTING AUTO-EXPIRATION FIX\n";
echo "==============================\n\n";

try {
    // Find test users
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();
    
    if (!$patient || !$doctor) {
        echo "❌ Need test users\n";
        exit(1);
    }
    
    echo "✅ Using Patient: {$patient->first_name} {$patient->last_name} (ID: {$patient->id})\n";
    echo "✅ Using Doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";
    
    // Create a test session with 1 session remaining (10 minutes)
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'started_at' => now()->subMinutes(5), // Started 5 minutes ago
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'sessions_remaining_before_start' => 1, // 1 session = 10 minutes
        'reason' => 'Auto-expiration test'
    ]);
    
    echo "✅ Created test session ID: {$session->id}\n";
    echo "   Started: 5 minutes ago\n";
    echo "   Sessions remaining: 1 (10 minutes total)\n";
    echo "   Expected duration: 10 minutes\n";
    echo "   Current elapsed: {$session->getElapsedMinutes()} minutes\n";
    echo "   Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "   Has run out of time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n\n";
    
    // Test the auto-expiration command
    echo "🔄 Running auto-expiration command...\n";
    
    // Simulate the command logic
    $waitingExpiredSessions = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
        ->where('started_at', '<=', now()->subSeconds(90))
        ->get();
    
    $timeExpiredSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
        ->get()
        ->filter(function($session) {
            return $session->hasRunOutOfTime();
        });
    
    $allExpiredSessions = $waitingExpiredSessions->merge($timeExpiredSessions);
    
    echo "   Waiting expired sessions: {$waitingExpiredSessions->count()}\n";
    echo "   Time expired sessions: {$timeExpiredSessions->count()}\n";
    echo "   Total expired sessions: {$allExpiredSessions->count()}\n";
    
    // Check if our test session would be incorrectly ended
    $testSessionWouldBeEnded = $allExpiredSessions->contains('id', $session->id);
    echo "   Test session would be ended: " . ($testSessionWouldBeEnded ? 'YES (BUG!)' : 'NO (Correct)') . "\n";
    
    if ($testSessionWouldBeEnded) {
        echo "   ⚠️  BUG: Session would be ended prematurely!\n";
    } else {
        echo "   ✅ FIXED: Session correctly not ended yet\n";
    }
    
    // Test what happens when session actually runs out of time
    echo "\n🔄 Testing when session runs out of time...\n";
    
    // Update session to simulate it started 11 minutes ago (should be expired)
    $session->update(['started_at' => now()->subMinutes(11)]);
    $session->refresh();
    
    echo "   Updated session to start 11 minutes ago\n";
    echo "   Current elapsed: {$session->getElapsedMinutes()} minutes\n";
    echo "   Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "   Has run out of time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
    
    // Test the command again
    $timeExpiredSessions2 = TextSession::where('status', TextSession::STATUS_ACTIVE)
        ->get()
        ->filter(function($session) {
            return $session->hasRunOutOfTime();
        });
    
    $testSessionWouldBeEnded2 = $timeExpiredSessions2->contains('id', $session->id);
    echo "   Test session would be ended: " . ($testSessionWouldBeEnded2 ? 'YES (Correct)' : 'NO (BUG!)') . "\n";
    
    if ($testSessionWouldBeEnded2) {
        echo "   ✅ FIXED: Session correctly identified as expired\n";
    } else {
        echo "   ⚠️  BUG: Session should be ended but wasn't detected!\n";
    }
    
    // Cleanup
    $session->delete();
    echo "\n✅ Test completed and cleaned up\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    exit(1);
}
