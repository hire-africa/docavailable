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

// Note: Auto-deductions and auto-ending for text sessions are now handled by Laravel Queues
// This provides more precise timing and prevents double processing

// Register the ClearActiveSessions command
Artisan::command('sessions:clear-active {--force : Force clear without confirmation}', function () {
    $this->call(\App\Console\Commands\ClearActiveSessions::class);
})->purpose('Clear all active text sessions and their cached messages');
