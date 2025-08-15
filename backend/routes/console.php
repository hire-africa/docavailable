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

// Schedule expired text session processing to run every minute
Schedule::command('sessions:process-expired-text-sessions')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Schedule appointment session processing to run every 5 minutes
Schedule::command('sessions:process-appointment-sessions')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Schedule auto-deductions for text sessions to run every 10 minutes
Schedule::command('sessions:process-auto-deductions')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Register the ClearActiveSessions command
Artisan::command('sessions:clear-active {--force : Force clear without confirmation}', function () {
    $this->call(\App\Console\Commands\ClearActiveSessions::class);
})->purpose('Clear all active text sessions and their cached messages');
