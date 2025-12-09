<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Bootstrap Laravel
$app = Application::configure(basePath: __DIR__ . '/..')
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
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🔍 DEBUGGING SESSION 98\n";
echo "======================\n\n";

try {
    $session = TextSession::with(['patient', 'doctor'])->find(98);
    if (!$session) {
        echo "❌ Session 98 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 98 DETAILS:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Started at: {$session->started_at}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Ended at: {$session->ended_at}\n";
    echo "   Reason: {$session->reason}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
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
    
    // Calculate what should have happened
    if ($session->activated_at) {
        $elapsedMinutes = $session->getElapsedMinutes();
        $shouldHaveDeductions = floor($elapsedMinutes / 10);
        
        echo "⏰ TIME CALCULATIONS:\n";
        echo "   Elapsed minutes: {$elapsedMinutes}\n";
        echo "   Should have deductions: {$shouldHaveDeductions}\n";
        echo "   Actual deductions processed: {$session->auto_deductions_processed}\n";
        echo "   Sessions used: {$session->sessions_used}\n";
        echo "   Missing deductions: " . ($shouldHaveDeductions - $session->auto_deductions_processed) . "\n\n";
    }
    
    // Check if there were any queue jobs for this session
    echo "📦 QUEUE JOBS FOR SESSION 98:\n";
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    $sessionJobs = [];
    
    foreach ($jobs as $job) {
        $payload = json_decode($job->payload);
        $jobData = $payload->data ?? [];
        $sessionId = $jobData->sessionId ?? null;
        
        if ($sessionId == 98) {
            $sessionJobs[] = $job;
        }
    }
    
    echo "   Found " . count($sessionJobs) . " jobs for session 98\n";
    
    if (count($sessionJobs) > 0) {
        foreach ($sessionJobs as $job) {
            $payload = json_decode($job->payload);
            $jobClass = $payload->displayName ?? 'Unknown';
            $jobData = $payload->data ?? [];
            echo "   - Job: {$jobClass}\n";
            echo "     Session ID: {$jobData->sessionId}\n";
            if (isset($jobData->expectedDeductionCount)) {
                echo "     Expected deductions: {$jobData->expectedDeductionCount}\n";
            }
            if (isset($jobData->reason)) {
                echo "     Reason: {$jobData->reason}\n";
            }
        }
    } else {
        echo "   No pending jobs found for session 98\n";
    }
    
    echo "\n🔧 DIAGNOSIS:\n";
    
    if ($session->auto_deductions_processed == 0 && $session->sessions_used == 0) {
        echo "   ❌ PROBLEM: No deductions were processed during the session\n";
        echo "   Possible causes:\n";
        echo "   1. Queue jobs were not created when session was activated\n";
        echo "   2. Queue jobs were created but not processed\n";
        echo "   3. Manual ending bypassed the deduction logic\n";
    } elseif ($session->auto_deductions_processed > 0 && $session->sessions_used == 0) {
        echo "   ⚠️  PROBLEM: Auto-deductions were processed but no sessions were used\n";
        echo "   This suggests the deduction logic worked but didn't update the session count\n";
    } elseif ($session->sessions_used > 0) {
        echo "   ✅ Sessions were used: {$session->sessions_used}\n";
        echo "   But auto-deductions processed: {$session->auto_deductions_processed}\n";
    }
    
    // Check if manual ending was used
    if ($session->reason === 'manual_end' || $session->reason === 'manual_end_fixed') {
        echo "\n🔧 MANUAL ENDING ANALYSIS:\n";
        echo "   Session was ended manually (reason: {$session->reason})\n";
        echo "   Manual ending should deduct 1 additional session\n";
        echo "   Total sessions that should be used: " . ($session->auto_deductions_processed + 1) . "\n";
        echo "   Actual sessions used: {$session->sessions_used}\n";
    }
    
    echo "\n💡 RECOMMENDATIONS:\n";
    echo "   1. Check if queue jobs were created when session 98 was activated\n";
    echo "   2. Verify that the queue processing middleware is working\n";
    echo "   3. Test the manual ending logic\n";
    echo "   4. Consider reprocessing missing deductions if needed\n";
    
} catch (Exception $e) {
    echo "❌ Debug failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
