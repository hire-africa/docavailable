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

echo "⚡ PROCESSING PENDING QUEUE JOBS\n";
echo "================================\n\n";

try {
    // Get session 96
    $session = TextSession::with(['patient', 'doctor'])->find(96);
    
    if (!$session) {
        echo "❌ Session 96 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 96 BEFORE PROCESSING:\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Elapsed minutes: {$session->getElapsedMinutes()}\n";
    
    $subscription = $session->patient->subscription;
    echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Get all pending jobs
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    echo "📦 FOUND {$jobs->count()} PENDING JOBS\n\n";
    
    $processedCount = 0;
    
    foreach ($jobs as $job) {
        $payload = json_decode($job->payload);
        $command = $payload->data->command;
        
        echo "🔄 Processing job: " . substr($command, 0, 50) . "...\n";
        
        try {
            // Process the job
            if (strpos($command, 'ProcessTextSessionAutoDeduction') !== false) {
                // Extract session ID and deduction count from command
                preg_match('/ProcessTextSessionAutoDeduction\((\d+), (\d+)\)/', $command, $matches);
                if (count($matches) >= 3) {
                    $sessionId = $matches[1];
                    $deductionCount = $matches[2];
                    
                    echo "   Auto-deduction job for session {$sessionId}, count {$deductionCount}\n";
                    
                    $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($sessionId, $deductionCount);
                    $autoDeductionJob->handle();
                    
                    echo "   ✅ Auto-deduction processed\n";
                    $processedCount++;
                }
            } elseif (strpos($command, 'EndTextSession') !== false) {
                // Extract session ID and reason from command
                preg_match('/EndTextSession\((\d+), \'([^\']+)\'\)/', $command, $matches);
                if (count($matches) >= 3) {
                    $sessionId = $matches[1];
                    $reason = $matches[2];
                    
                    echo "   Auto-end job for session {$sessionId}, reason: {$reason}\n";
                    
                    $autoEndJob = new \App\Jobs\EndTextSession($sessionId, $reason);
                    $autoEndJob->handle();
                    
                    echo "   ✅ Auto-end processed\n";
                    $processedCount++;
                }
            }
            
            // Delete the processed job
            DB::table('jobs')->where('id', $job->id)->delete();
            
        } catch (Exception $e) {
            echo "   ❌ Failed to process job: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n✅ PROCESSED {$processedCount} JOBS\n\n";
    
    // Check session after processing
    $session->refresh();
    $subscription->refresh();
    
    echo "📋 SESSION 96 AFTER PROCESSING:\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Test manual ending now
    if ($session->status === 'active') {
        echo "🔧 TESTING MANUAL ENDING AFTER PROCESSING:\n";
        
        $endResult = $session->endManually('after_queue_processing');
        
        if ($endResult) {
            echo "✅ Manual ending successful!\n";
            echo "   Final status: {$session->status}\n";
            echo "   Sessions used: {$session->sessions_used}\n";
        } else {
            echo "❌ Manual ending still failed\n";
        }
        
        $subscription->refresh();
        echo "   Final subscription sessions remaining: {$subscription->text_sessions_remaining}\n";
    }
    
} catch (Exception $e) {
    echo "❌ PROCESSING FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
