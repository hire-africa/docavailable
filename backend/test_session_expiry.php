<?php

/**
 * Test script to verify session expiry database update
 * Run with: php test_session_expiry.php <session_id>
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

if ($argc < 2) {
    echo "Usage: php test_session_expiry.php <session_id>\n";
    exit(1);
}

$sessionId = $argv[1];

echo "Testing session expiry for session ID: {$sessionId}\n\n";

try {
    // Get the session
    $session = DB::table('text_sessions')->where('id', $sessionId)->first();
    
    if (!$session) {
        echo "❌ Session not found!\n";
        exit(1);
    }
    
    echo "📊 Current session status:\n";
    echo "  ID: {$session->id}\n";
    echo "  Status: {$session->status}\n";
    echo "  Started at: {$session->started_at}\n";
    echo "  Ended at: " . ($session->ended_at ?? 'NULL') . "\n";
    echo "  Doctor response deadline: " . ($session->doctor_response_deadline ?? 'NULL') . "\n";
    echo "\n";
    
    // Test update
    echo "🔄 Attempting to update session to expired...\n";
    
    $updateResult = DB::table('text_sessions')
        ->where('id', $sessionId)
        ->update([
            'status' => 'expired',
            'ended_at' => now(),
            'updated_at' => now()
        ]);
    
    echo "  Update result: " . ($updateResult ? "✅ Success ({$updateResult} row(s) affected)" : "❌ Failed") . "\n\n";
    
    // Verify update
    $updatedSession = DB::table('text_sessions')->where('id', $sessionId)->first();
    
    echo "📊 Updated session status:\n";
    echo "  ID: {$updatedSession->id}\n";
    echo "  Status: {$updatedSession->status}\n";
    echo "  Started at: {$updatedSession->started_at}\n";
    echo "  Ended at: " . ($updatedSession->ended_at ?? 'NULL') . "\n";
    echo "  Updated at: {$updatedSession->updated_at}\n";
    echo "\n";
    
    if ($updatedSession->status === 'expired') {
        echo "✅ Session successfully updated to expired!\n";
    } else {
        echo "❌ Session status did not change to expired!\n";
        echo "   Current status: {$updatedSession->status}\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "   Trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
