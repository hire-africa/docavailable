<?php

/**
 * Script to clear voice message rate limits
 * Run this to reset any cached rate limits for voice messages
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\Cache;

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧹 Clearing Voice Message Rate Limits\n";
echo "=====================================\n\n";

// Clear all voice message rate limits
$keys = Cache::get('cache_keys', []);
$clearedCount = 0;

// Clear rate limits for all users and appointments for voice messages
for ($userId = 1; $userId <= 100; $userId++) {
    for ($appointmentId = 1; $appointmentId <= 1000; $appointmentId++) {
        $rateLimitKey = "message_rate_limit_{$userId}_{$appointmentId}_voice";
        if (Cache::has($rateLimitKey)) {
            Cache::forget($rateLimitKey);
            $clearedCount++;
            echo "✅ Cleared rate limit: {$rateLimitKey}\n";
        }
    }
}

echo "\n🎉 Cleared {$clearedCount} voice message rate limits\n";
echo "Voice messages should now work without rate limiting issues.\n"; 