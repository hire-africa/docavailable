<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use Illuminate\Support\Facades\Cache;

echo "🧹 Ending Active Text Sessions\n";
echo "==============================\n\n";

// Get all active sessions
$activeSessions = TextSession::whereIn('status', ['active', 'waiting_for_doctor'])->get();

if ($activeSessions->isEmpty()) {
    echo "✅ No active sessions found.\n";
    exit(0);
}

echo "Found {$activeSessions->count()} active sessions:\n\n";

foreach ($activeSessions as $session) {
    echo "- Session ID: {$session->id}\n";
    echo "  Status: {$session->status}\n";
    echo "  Patient: {$session->patient->first_name} {$session->patient->last_name}\n";
    echo "  Doctor: {$session->doctor->first_name} {$session->doctor->last_name}\n";
    echo "  Started: {$session->started_at}\n\n";
}

echo "Ending sessions...\n";

$clearedCount = 0;

foreach ($activeSessions as $session) {
    try {
        // Clear cached messages for this session
        $cacheKey = "text_session_messages_{$session->id}";
        Cache::forget($cacheKey);
        
        // Update session status to ended
        $session->update([
            'status' => 'ended',
            'ended_at' => now(),
            'last_activity_at' => now()
        ]);

        echo "✅ Ended session {$session->id}\n";
        $clearedCount++;
    } catch (Exception $e) {
        echo "❌ Failed to end session {$session->id}: {$e->getMessage()}\n";
    }
}

// Clear any remaining cache keys
echo "\nClearing cache keys...\n";
$cacheKeys = Cache::get('text_session_cache_keys', []);
foreach ($cacheKeys as $key) {
    Cache::forget($key);
}
Cache::forget('text_session_cache_keys');

echo "\n✅ Successfully ended {$clearedCount} active sessions!\n";
echo "You can now start new sessions for testing.\n"; 