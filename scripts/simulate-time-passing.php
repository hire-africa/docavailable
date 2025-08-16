<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Carbon\Carbon;

echo "⏰ Simulating Time Passing for Auto-End Test\n";
echo "============================================\n\n";

// Get the session ID from command line argument
$sessionId = $argv[1] ?? null;

if (!$sessionId) {
    echo "❌ Please provide a session ID as an argument\n";
    echo "Usage: php scripts/simulate-time-passing.php <session_id>\n";
    exit(1);
}

try {
    // Find the session
    $session = TextSession::find($sessionId);
    
    if (!$session) {
        echo "❌ Session {$sessionId} not found\n";
        exit(1);
    }

    echo "📋 Session Details:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Started at: {$session->started_at}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n";
    echo "   Remaining time minutes: {$session->getRemainingTimeMinutes()}\n";
    echo "   Remaining sessions: {$session->getRemainingSessions()}\n\n";

    // Calculate how much time to add to make the session expire
    $totalAllowedMinutes = $session->getTotalAllowedMinutes();
    $elapsedMinutes = $session->getElapsedMinutes();
    $minutesToAdd = $totalAllowedMinutes - $elapsedMinutes + 1; // Add 1 extra minute to ensure expiration

    echo "⏰ Simulating time passing...\n";
    echo "   Total allowed minutes: {$totalAllowedMinutes}\n";
    echo "   Elapsed minutes: {$elapsedMinutes}\n";
    echo "   Minutes to add: {$minutesToAdd}\n\n";

    // Update the started_at timestamp to simulate time passing
    $newStartedAt = $session->started_at->subMinutes($minutesToAdd);
    $session->update(['started_at' => $newStartedAt]);

    echo "✅ Updated session started_at to: {$newStartedAt}\n\n";

    // Refresh the session and show updated details
    $session->refresh();
    
    echo "📋 Updated Session Details:\n";
    echo "   Started at: {$session->started_at}\n";
    echo "   Remaining time minutes: {$session->getRemainingTimeMinutes()}\n";
    echo "   Remaining sessions: {$session->getRemainingSessions()}\n";
    echo "   Has run out of time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n\n";

    if ($session->hasRunOutOfTime()) {
        echo "🎯 Session should now auto-end!\n";
        echo "   - Frontend will detect this within 30 seconds\n";
        echo "   - Backend scheduled command will also process it\n";
        echo "   - Session should be marked as 'ended'\n";
    } else {
        echo "⚠️  Session has not run out of time yet\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Time simulation completed!\n";

