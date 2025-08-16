<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "🔧 FIXING SESSION 25 INCONSISTENCY\n";
echo "==================================\n\n";

try {
    // Get session 25
    $session = TextSession::find(25);
    
    if (!$session) {
        echo "❌ Session 25 not found!\n";
        exit(1);
    }
    
    echo "📋 Current Session 25 State:\n";
    echo "  Status: {$session->status}\n";
    echo "  Started: {$session->started_at}\n";
    echo "  Ended: " . ($session->ended_at ? $session->ended_at : 'Not ended') . "\n";
    echo "  Last Activity: {$session->last_activity_at}\n";
    echo "  Elapsed Minutes (using ended_at): {$session->getElapsedMinutes()}\n";
    echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "\n";
    
    // Check if there's an inconsistency
    if ($session->ended_at && $session->status === 'active') {
        echo "🔧 Found inconsistency: Session has ended_at but status is 'active'\n";
        echo "  This session should be marked as 'ended'\n\n";
        
        // Update status to ended
        $session->update([
            'status' => 'ended'
        ]);
        
        echo "✅ Session 25 status updated to 'ended'\n";
        echo "  New Status: {$session->status}\n";
        echo "  Session should no longer appear in active sessions\n";
        
    } elseif (!$session->ended_at && $session->status === 'active') {
        // Check if session should be ended based on time
        $elapsedMinutes = Carbon::parse($session->started_at)->diffInMinutes(now());
        $totalAllowedMinutes = $session->getTotalAllowedMinutes();
        
        echo "⏰ Time Analysis:\n";
        echo "  Elapsed Minutes: {$elapsedMinutes}\n";
        echo "  Total Allowed Minutes: {$totalAllowedMinutes}\n";
        echo "  Should be ended: " . ($elapsedMinutes >= $totalAllowedMinutes ? 'YES' : 'NO') . "\n";
        
        if ($elapsedMinutes >= $totalAllowedMinutes) {
            echo "🔧 Session has run out of time, ending it...\n";
            
            $session->update([
                'status' => 'ended',
                'ended_at' => now()
            ]);
            
            echo "✅ Session 25 ended due to time limit\n";
        } else {
            echo "ℹ️  Session 25 is still within time limit\n";
        }
    }
    
    // Verify the fix
    echo "\n📱 Verification:\n";
    $activeSessions = TextSession::whereIn('status', ['active', 'waiting_for_doctor'])->count();
    echo "  Total active sessions: {$activeSessions}\n";
    
    $session25 = TextSession::find(25);
    if ($session25 && in_array($session25->status, ['active', 'waiting_for_doctor'])) {
        echo "  ✅ Session 25 is still in active sessions list\n";
    } else {
        echo "  ❌ Session 25 is no longer in active sessions list (correct)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Fix completed!\n";
