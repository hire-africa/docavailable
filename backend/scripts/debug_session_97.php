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

use App\Models\TextSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🔍 DEBUGGING SESSION 97\n";
echo "======================\n\n";

try {
    $session = TextSession::with(['patient', 'doctor'])->find(97);
    if (!$session) {
        echo "❌ Session 97 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 97 DETAILS:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Started at: {$session->started_at}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Ended at: {$session->ended_at}\n";
    echo "   Reason: {$session->reason}\n";
    echo "   Last activity: {$session->last_activity_at}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n";
    echo "   Patient: {$session->patient->first_name} {$session->patient->last_name} (ID: {$session->patient->id})\n";
    echo "   Doctor: {$session->doctor->first_name} {$session->doctor->last_name} (ID: {$session->doctor->id})\n\n";
    
    $subscription = $session->patient->subscription;
    echo "📋 SUBSCRIPTION DETAILS:\n";
    echo "   ID: {$subscription->id}\n";
    echo "   Plan: {$subscription->planName}\n";
    echo "   Is active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Total text sessions: {$subscription->totalTextSessions}\n";
    echo "   Start date: {$subscription->start_date}\n";
    echo "   End date: {$subscription->end_date}\n\n";
    
    // Check if session is active
    if ($session->status !== TextSession::STATUS_ACTIVE) {
        echo "❌ Session is NOT active (status: {$session->status})\n";
        echo "   Auto-deductions only work on active sessions\n";
        echo "   This explains why the deduction failed\n\n";
        
        // Check why it's not active
        if ($session->ended_at) {
            echo "   Session was ended at: {$session->ended_at}\n";
            echo "   End reason: {$session->reason}\n";
        } else if (!$session->activated_at) {
            echo "   Session was never activated\n";
        } else {
            echo "   Session status changed to: {$session->status}\n";
        }
    } else {
        echo "✅ Session is active\n";
    }
    
    // Calculate what should have happened
    if ($session->activated_at) {
        $elapsedMinutes = $session->getElapsedMinutes();
        $shouldHaveDeductions = floor($elapsedMinutes / 10);
        
        echo "⏰ TIME CALCULATIONS:\n";
        echo "   Elapsed minutes: {$elapsedMinutes}\n";
        echo "   Should have deductions: {$shouldHaveDeductions}\n";
        echo "   Actual deductions processed: {$session->auto_deductions_processed}\n";
        echo "   Missing deductions: " . ($shouldHaveDeductions - $session->auto_deductions_processed) . "\n";
        echo "   Next deduction time: {$session->getNextAutoDeductionTime()}\n";
        echo "   Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
        echo "   Remaining sessions: {$session->getRemainingSessions()}\n\n";
    }
    
    // Check queue jobs
    echo "📦 QUEUE JOBS:\n";
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    echo "   Found " . $jobs->count() . " jobs in text-sessions queue\n";
    
    if ($jobs->count() > 0) {
        foreach ($jobs as $job) {
            $payload = json_decode($job->payload, true);
            echo "   Job ID: {$job->id}\n";
            echo "   Job class: {$payload['displayName']}\n";
            echo "   Attempts: {$job->attempts}\n";
            echo "   Available at: " . date('Y-m-d H:i:s', $job->available_at) . "\n";
            echo "   Created at: " . date('Y-m-d H:i:s', $job->created_at) . "\n\n";
        }
    }
    
    // Check failed jobs
    $failedJobs = DB::table('failed_jobs')->get();
    echo "📦 FAILED JOBS:\n";
    echo "   Found " . $failedJobs->count() . " failed jobs\n";
    
    if ($failedJobs->count() > 0) {
        foreach ($failedJobs as $failedJob) {
            $payload = json_decode($failedJob->payload, true);
            echo "   Failed Job ID: {$failedJob->id}\n";
            echo "   Job class: {$payload['displayName']}\n";
            echo "   Exception: {$failedJob->exception}\n";
            echo "   Failed at: {$failedJob->failed_at}\n\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ DEBUG FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
