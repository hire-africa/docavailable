<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "🔍 INVESTIGATING SESSION 25 AUTO-ENDING\n";
echo "=======================================\n\n";

try {
    // Get session 25
    $session = TextSession::find(25);
    
    if (!$session) {
        echo "❌ Session 25 not found!\n";
        exit(1);
    }
    
    echo "📋 Session 25 Timeline:\n";
    echo "  Started: {$session->started_at}\n";
    echo "  Ended: " . ($session->ended_at ? $session->ended_at : 'Not ended') . "\n";
    echo "  Last Activity: {$session->last_activity_at}\n";
    echo "  Status: {$session->status}\n";
    echo "  Sessions Remaining Before Start: {$session->sessions_remaining_before_start}\n";
    echo "  Sessions Used: {$session->sessions_used}\n";
    echo "\n";
    
    // Calculate what should have happened
    $startedAt = Carbon::parse($session->started_at);
    $endedAt = $session->ended_at ? Carbon::parse($session->ended_at) : null;
    $totalAllowedMinutes = $session->sessions_remaining_before_start * 10;
    
    echo "⏰ Expected vs Actual:\n";
    echo "  Expected Duration: {$totalAllowedMinutes} minutes\n";
    if ($endedAt) {
        $actualDuration = $startedAt->diffInMinutes($endedAt);
        echo "  Actual Duration: {$actualDuration} minutes\n";
        echo "  Duration Difference: " . ($totalAllowedMinutes - $actualDuration) . " minutes shorter than expected\n";
    }
    echo "\n";
    
    // Check if this was a 90-second doctor response timeout
    echo "🔍 Possible Causes:\n";
    
    // 1. Check if it was waiting for doctor and timed out
    if ($session->status === 'expired' || ($endedAt && $startedAt->diffInSeconds($endedAt) <= 90)) {
        echo "  1. ⚠️  DOCTOR RESPONSE TIMEOUT: Session may have expired waiting for doctor's first reply (90 seconds)\n";
        echo "     - Started: {$startedAt}\n";
        echo "     - Ended: {$endedAt}\n";
        echo "     - Duration: " . $startedAt->diffInSeconds($endedAt) . " seconds\n";
        echo "     - This would happen if doctor didn't reply within 90 seconds\n";
    }
    
    // 2. Check if auto-expiration system ran incorrectly
    if ($endedAt && $startedAt->diffInMinutes($endedAt) < $totalAllowedMinutes) {
        echo "  2. ⚠️  AUTO-EXPIRATION BUG: Session ended prematurely by auto-expiration system\n";
        echo "     - Should have lasted: {$totalAllowedMinutes} minutes\n";
        echo "     - Actually lasted: " . $startedAt->diffInMinutes($endedAt) . " minutes\n";
        echo "     - This suggests a bug in the auto-expiration logic\n";
    }
    
    // 3. Check if it was manually ended
    echo "  3. ℹ️  MANUAL END: Check if session was manually ended by user or system\n";
    
    // 4. Check if there were any messages sent
    echo "  4. ℹ️  MESSAGE ACTIVITY: Check if any messages were sent during the session\n";
    
    echo "\n";
    
    // Check the auto-expiration logic
    echo "🔧 Auto-Expiration Logic Check:\n";
    $elapsedMinutes = $startedAt->diffInMinutes(now());
    $shouldAutoEnd = $elapsedMinutes >= $totalAllowedMinutes;
    echo "  Current elapsed time: {$elapsedMinutes} minutes\n";
    echo "  Should auto-end now: " . ($shouldAutoEnd ? 'YES' : 'NO') . "\n";
    echo "  But it ended at: " . ($endedAt ? $endedAt->diffInMinutes($startedAt) . " minutes" : "Not ended") . "\n";
    
    if ($endedAt && $startedAt->diffInMinutes($endedAt) < $totalAllowedMinutes) {
        echo "  ⚠️  This suggests the auto-expiration system has a bug!\n";
    }
    
    echo "\n";
    
    // Check if this is a pattern with other sessions
    echo "📊 Checking Other Sessions for Similar Issues:\n";
    $recentSessions = TextSession::where('started_at', '>=', now()->subDays(1))
        ->where('ended_at', 'IS NOT', null)
        ->get();
    
    $prematureEnds = 0;
    foreach ($recentSessions as $recentSession) {
        $sessionStarted = Carbon::parse($recentSession->started_at);
        $sessionEnded = Carbon::parse($recentSession->ended_at);
        $expectedDuration = $recentSession->sessions_remaining_before_start * 10;
        $actualDuration = $sessionStarted->diffInMinutes($sessionEnded);
        
        if ($actualDuration < $expectedDuration && $recentSession->status !== 'expired') {
            $prematureEnds++;
            echo "  - Session {$recentSession->id}: Expected {$expectedDuration}min, got {$actualDuration}min\n";
        }
    }
    
    if ($prematureEnds > 0) {
        echo "  ⚠️  Found {$prematureEnds} sessions that ended prematurely!\n";
    } else {
        echo "  ✅ No other premature endings found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Investigation completed!\n";
