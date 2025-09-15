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
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;

echo "🔍 DEBUGGING SESSION 96\n";
echo "======================\n\n";

try {
    // Get session 96
    $session = TextSession::with(['patient', 'doctor'])->find(96);
    
    if (!$session) {
        echo "❌ Session 96 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 96 DETAILS:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Started at: {$session->started_at}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Ended at: {$session->ended_at}\n";
    echo "   Last activity: {$session->last_activity_at}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n";
    echo "   Reason: {$session->reason}\n";
    echo "   Patient: {$session->patient->first_name} {$session->patient->last_name}\n";
    echo "   Doctor: {$session->doctor->first_name} {$session->doctor->last_name}\n\n";
    
    // Check subscription
    $subscription = $session->patient->subscription;
    echo "📋 SUBSCRIPTION DETAILS:\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Is active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n\n";
    
    // Calculate elapsed time
    $elapsedMinutes = $session->getElapsedMinutes();
    $shouldHaveDeductions = floor($elapsedMinutes / 10);
    
    echo "⏰ TIME CALCULATIONS:\n";
    echo "   Elapsed minutes: {$elapsedMinutes}\n";
    echo "   Should have deductions: {$shouldHaveDeductions}\n";
    echo "   Next deduction time: {$session->getNextAutoDeductionTime()}\n";
    echo "   Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
    echo "   Remaining sessions: {$session->getRemainingSessions()}\n\n";
    
    // Check queue jobs
    echo "📦 QUEUE JOBS:\n";
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    echo "   Found " . $jobs->count() . " jobs in text-sessions queue\n";
    
    foreach ($jobs as $job) {
        $payload = json_decode($job->payload);
        $command = $payload->data->command;
        
        if (strpos($command, 'ProcessTextSessionAutoDeduction') !== false) {
            echo "   📅 Auto-deduction job found\n";
        } elseif (strpos($command, 'EndTextSession') !== false) {
            echo "   ⏰ Auto-end job found\n";
        }
    }
    echo "\n";
    
    // Test manual ending
    echo "🔧 TESTING MANUAL ENDING:\n";
    
    if ($session->status === 'active') {
        $endResult = $session->endManually('debug_test');
        
        if ($endResult) {
            echo "✅ Manual ending successful\n";
            echo "   Final status: {$session->status}\n";
            echo "   Sessions used: {$session->sessions_used}\n";
        } else {
            echo "❌ Manual ending failed\n";
            
            // Check why it failed
            echo "   Checking why manual ending failed...\n";
            
            // Try to get more details
            $session->refresh();
            echo "   Current status: {$session->status}\n";
            echo "   Sessions used: {$session->sessions_used}\n";
            echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
        }
    } else {
        echo "❌ Session is not active (status: {$session->status})\n";
    }
    
    // Check subscription after attempt
    $subscription->refresh();
    echo "\n📋 SUBSCRIPTION AFTER ATTEMPT:\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    
} catch (Exception $e) {
    echo "❌ DEBUG FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
