<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "🔧 FIXING TEXT SESSION 25\n";
echo "==========================\n\n";

try {
    // Get session 25
    $session = TextSession::find(25);
    
    if (!$session) {
        echo "❌ Session 25 not found!\n";
        exit(1);
    }
    
    echo "📋 Current Session 25 Status:\n";
    echo "  Status: {$session->status}\n";
    echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "  Has Run Out of Time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
    echo "\n";
    
    // Check if this session should be active
    if ($session->getRemainingTimeMinutes() > 0 && $session->status === 'expired') {
        echo "🔧 Fixing session status...\n";
        
        // Update status to active since it has time remaining
        $session->update([
            'status' => 'active',
            'last_activity_at' => now()
        ]);
        
        echo "✅ Session 25 updated to 'active' status\n";
        echo "  New Status: {$session->status}\n";
        echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
        echo "  Should now show in active sessions: YES\n";
        
    } else {
        echo "ℹ️  Session 25 doesn't need fixing\n";
        echo "  Status: {$session->status}\n";
        echo "  Remaining Time: {$session->getRemainingTimeMinutes()} minutes\n";
    }
    
    // Verify the fix
    echo "\n📱 Verification:\n";
    $activeSessions = TextSession::whereIn('status', ['active', 'waiting_for_doctor'])->count();
    echo "  Total active sessions: {$activeSessions}\n";
    
    $session25 = TextSession::find(25);
    if ($session25 && in_array($session25->status, ['active', 'waiting_for_doctor'])) {
        echo "  ✅ Session 25 is now in active sessions list\n";
    } else {
        echo "  ❌ Session 25 is not in active sessions list\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Fix completed!\n";
