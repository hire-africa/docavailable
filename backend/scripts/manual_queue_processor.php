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

echo "⚡ MANUAL QUEUE PROCESSOR\n";
echo "========================\n";
echo "Time: " . now() . "\n\n";

try {
    // Get all pending jobs
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    
    if ($jobs->count() === 0) {
        echo "✅ No pending jobs found\n";
        exit(0);
    }
    
    echo "📦 Found {$jobs->count()} pending jobs\n\n";
    
    $processedCount = 0;
    $failedCount = 0;
    
    foreach ($jobs as $job) {
        try {
            $payload = json_decode($job->payload);
            
            // Extract job class and data
            $jobClass = $payload->displayName ?? 'Unknown';
            $jobData = $payload->data ?? [];
            
            echo "🔄 Processing job: {$jobClass}\n";
            
            // Process based on job class
            if (strpos($jobClass, 'ProcessTextSessionAutoDeduction') !== false) {
                $sessionId = $jobData->sessionId ?? null;
                $expectedDeductionCount = $jobData->expectedDeductionCount ?? 1;
                
                if ($sessionId) {
                    $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($sessionId, $expectedDeductionCount);
                    $autoDeductionJob->handle();
                    echo "   ✅ Auto-deduction processed for session {$sessionId}\n";
                    $processedCount++;
                }
                
            } elseif (strpos($jobClass, 'EndTextSession') !== false) {
                $sessionId = $jobData->sessionId ?? null;
                $reason = $jobData->reason ?? 'time_expired';
                
                if ($sessionId) {
                    $autoEndJob = new \App\Jobs\EndTextSession($sessionId, $reason);
                    $autoEndJob->handle();
                    echo "   ✅ Auto-end processed for session {$sessionId} (reason: {$reason})\n";
                    $processedCount++;
                }
                
            } else {
                echo "   ⚠️  Unknown job type: {$jobClass}\n";
                $failedCount++;
            }
            
            // Delete the processed job
            DB::table('jobs')->where('id', $job->id)->delete();
            
        } catch (Exception $e) {
            echo "   ❌ Failed to process job: " . $e->getMessage() . "\n";
            $failedCount++;
        }
    }
    
    echo "\n📊 PROCESSING SUMMARY:\n";
    echo "   ✅ Successfully processed: {$processedCount}\n";
    echo "   ❌ Failed: {$failedCount}\n";
    echo "   📦 Total jobs: " . $jobs->count() . "\n";
    
    // Check for any active sessions that might need attention
    $activeSessions = TextSession::where('status', 'active')->count();
    if ($activeSessions > 0) {
        echo "\n💡 Found {$activeSessions} active sessions\n";
        echo "   Run this script every 5-10 minutes to process auto-deductions\n";
    }
    
} catch (Exception $e) {
    echo "❌ MANUAL PROCESSOR FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
