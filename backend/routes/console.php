<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule text session message cleanup to run every hour
Schedule::command('text-sessions:cleanup-messages')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Schedule appointment session processing to run every 5 minutes
Schedule::command('sessions:process-appointment-sessions')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// NEW: Schedule auto-deductions for text sessions every 10 minutes
Schedule::command('sessions:process-auto-deductions')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// NEW: Cleanup stale call connections every minute
Schedule::command('calls:cleanup-stale-connections')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// PRODUCTION-SAFE: Promote missed call connections (fallback for queue reliability)
// Catches calls that missed the queue job due to queue being down
Schedule::command('calls:promote-missed-connections')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Enhanced: Expire appointments every 30 minutes
Schedule::command('appointments:expire')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Process subscription expirations and apply 30-day plan roll-over rules
// Runs daily to check and update subscription statuses
Schedule::command('subscriptions:process-expirations')
    ->daily()
    ->withoutOverlapping()
    ->runInBackground();

// Note: Auto-ending for text sessions is handled by the existing ProcessExpiredTextSessions command
// This provides reliable session ending without queue complexity

// Register the ClearActiveSessions command
Artisan::command('sessions:clear-active {--force : Force clear without confirmation}', function () {
    $this->call(\App\Console\Commands\ClearActiveSessions::class);
})->purpose('Clear all active text sessions and their cached messages');

// NEW: Activate scheduled sessions every minute
Schedule::command('sessions:activate-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// NEW: Activate booked appointments when their scheduled time arrives
Schedule::command('appointments:activate-booked')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// HEARTBEAT: Verify scheduler is running
Schedule::call(function () {
    \Illuminate\Support\Facades\Cache::put('scheduler_heartbeat', now()->toDateTimeString(), 120);
})->everyMinute();
