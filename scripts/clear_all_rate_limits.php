<?php

/**
 * Script to clear all message rate limits
 * Run this to reset any cached rate limits for all message types
 */

require_once __DIR__ . '/../backend/vendor/autoload.php';

use Illuminate\Support\Facades\Cache;

// Initialize Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧹 Clearing All Message Rate Limits\n";
echo "==================================\n\n";

$clearedCount = 0;

// Clear rate limits for all users and appointments for all message types
for ($userId = 1; $userId <= 100; $userId++) {
    for ($appointmentId = 1; $appointmentId <= 1000; $appointmentId++) {
        $messageTypes = ['text', 'voice', 'image'];
        
        foreach ($messageTypes as $messageType) {
            $rateLimitKey = "message_rate_limit_{$userId}_{$appointmentId}_{$messageType}";
            if (Cache::has($rateLimitKey)) {
                Cache::forget($rateLimitKey);
                $clearedCount++;
                echo "✅ Cleared rate limit: {$rateLimitKey}\n";
            }
        }
    }
}

echo "\n🎉 Cleared {$clearedCount} rate limits\n";
echo "All message types should now work without rate limiting issues.\n"; 