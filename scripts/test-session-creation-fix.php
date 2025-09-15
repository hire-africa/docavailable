<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use Carbon\Carbon;

echo "🧪 TESTING SESSION CREATION FIX\n";
echo "===============================\n\n";

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
    
    // Create a test session using the same logic as the controller
    $sessionsRemaining = 1; // 1 session = 10 minutes
    
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
        'started_at' => now(),
        'last_activity_at' => now(),
        'sessions_used' => 0, // FIXED: Start with 0 sessions used
        'sessions_remaining_before_start' => $sessionsRemaining,
        'reason' => 'Session creation test'
    ]);
    
    echo "✅ Created test session ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions Used: {$session->sessions_used}\n";
    echo "   Sessions Remaining Before Start: {$session->sessions_remaining_before_start}\n";
    echo "   Elapsed Minutes: {$session->getElapsedMinutes()}\n";
    echo "   Total Allowed Minutes: {$session->getTotalAllowedMinutes()}\n";
    echo "   Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "   Remaining Sessions: {$session->getRemainingSessions()}\n";
    echo "   Has Run Out of Time: " . ($session->hasRunOutOfTime() ? 'YES (BUG!)' : 'NO (Correct)') . "\n";
    echo "   Should Auto End: " . ($session->shouldAutoEnd() ? 'YES (BUG!)' : 'NO (Correct)') . "\n\n";
    
    // Test if this session would be incorrectly ended by auto-expiration
    echo "🔄 Testing auto-expiration logic...\n";
    
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
    
    $testSessionWouldBeEnded = $allExpiredSessions->contains('id', $session->id);
    echo "   Test session would be ended: " . ($testSessionWouldBeEnded ? 'YES (BUG!)' : 'NO (Correct)') . "\n";
    
    if ($testSessionWouldBeEnded) {
        echo "   ⚠️  BUG: New session would be ended immediately!\n";
    } else {
        echo "   ✅ FIXED: New session correctly not ended\n";
    }
    
    // Test what happens after 5 minutes
    echo "\n🔄 Testing after 5 minutes...\n";
    
    // Update session to simulate it started 5 minutes ago
    $session->update(['started_at' => now()->subMinutes(5)]);
    $session->refresh();
    
    echo "   Updated session to start 5 minutes ago\n";
    echo "   Elapsed Minutes: {$session->getElapsedMinutes()}\n";
    echo "   Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "   Remaining Sessions: {$session->getRemainingSessions()}\n";
    echo "   Has Run Out of Time: " . ($session->hasRunOutOfTime() ? 'YES (BUG!)' : 'NO (Correct)') . "\n";
    
    // Test auto-expiration again
    $timeExpiredSessions2 = TextSession::where('status', TextSession::STATUS_ACTIVE)
        ->get()
        ->filter(function($session) {
            return $session->hasRunOutOfTime();
        });
    
    $testSessionWouldBeEnded2 = $timeExpiredSessions2->contains('id', $session->id);
    echo "   Test session would be ended: " . ($testSessionWouldBeEnded2 ? 'YES (BUG!)' : 'NO (Correct)') . "\n";
    
    if ($testSessionWouldBeEnded2) {
        echo "   ⚠️  BUG: Session would be ended after 5 minutes!\n";
    } else {
        echo "   ✅ FIXED: Session correctly not ended after 5 minutes\n";
    }
    
    // Cleanup
    $session->delete();
    echo "\n✅ Test completed and cleaned up\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    exit(1);
}
