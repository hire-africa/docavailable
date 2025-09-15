<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Bootstrap Laravel
$app = Application::configure(basePath: __DIR__ . '/../')
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\TextSession;

echo "🔍 CURRENT SYSTEM STATE\n";
echo "======================\n\n";

// Check users
echo "👥 USERS:\n";
$users = User::select('id', 'first_name', 'last_name', 'user_type')->get();
foreach ($users as $user) {
    echo "   {$user->id}: {$user->first_name} {$user->last_name} ({$user->user_type})\n";
}
echo "\n";

// Check subscriptions
echo "📋 SUBSCRIPTIONS:\n";
$subscriptions = Subscription::with('user')->get();
foreach ($subscriptions as $sub) {
    echo "   User: {$sub->user->first_name} {$sub->user->last_name}\n";
    echo "   Text sessions: {$sub->text_sessions_remaining}\n";
    echo "   Voice sessions: {$sub->voice_sessions_remaining}\n";
    echo "   Video sessions: {$sub->video_sessions_remaining}\n";
    echo "   Active: " . ($sub->is_active ? 'YES' : 'NO') . "\n";
    echo "   ---\n";
}
echo "\n";

// Check active text sessions
echo "💬 ACTIVE TEXT SESSIONS:\n";
$activeSessions = TextSession::where('status', 'active')->with(['patient', 'doctor'])->get();
foreach ($activeSessions as $session) {
    echo "   Session {$session->id}:\n";
    echo "   Patient: {$session->patient->first_name} {$session->patient->last_name}\n";
    echo "   Doctor: {$session->doctor->first_name} {$session->doctor->last_name}\n";
    echo "   Started: {$session->started_at}\n";
    echo "   Activated: {$session->activated_at}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   ---\n";
}
echo "\n";

// Check queue jobs
echo "📦 QUEUE JOBS:\n";
$jobs = \Illuminate\Support\Facades\DB::table('jobs')->where('queue', 'text-sessions')->get();
echo "   Found " . $jobs->count() . " jobs in text-sessions queue\n";
foreach ($jobs as $job) {
    $payload = json_decode($job->payload);
    $command = $payload->data->command;
    echo "   Job: " . substr($command, 0, 100) . "...\n";
}
echo "\n";

echo "✅ State check completed!\n";
