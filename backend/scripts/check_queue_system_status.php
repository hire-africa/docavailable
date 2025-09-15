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

echo "🔍 CHECKING QUEUE SYSTEM STATUS\n";
echo "==============================\n\n";

try {
    // Check 1: Queue configuration
    echo "📋 CHECK 1: Queue Configuration\n";
    $defaultConnection = config('queue.default');
    $textSessionsConnection = config('queue.connections.text-sessions');
    echo "   Default connection: {$defaultConnection}\n";
    echo "   Text-sessions connection exists: " . ($textSessionsConnection ? 'YES' : 'NO') . "\n";
    if ($textSessionsConnection) {
        echo "   Text-sessions driver: {$textSessionsConnection['driver']}\n";
        echo "   Text-sessions queue: {$textSessionsConnection['queue']}\n";
    }
    echo "\n";
    
    // Check 2: Jobs table status
    echo "📋 CHECK 2: Jobs Table Status\n";
    $totalJobs = DB::table('jobs')->count();
    $textSessionsJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Total jobs in database: {$totalJobs}\n";
    echo "   Text-sessions jobs: {$textSessionsJobs}\n";
    
    if ($textSessionsJobs > 0) {
        echo "   Recent text-sessions jobs:\n";
        $recentJobs = DB::table('jobs')
            ->where('queue', 'text-sessions')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
        
        foreach ($recentJobs as $job) {
            $payload = json_decode($job->payload);
            $jobClass = $payload->displayName ?? 'Unknown';
            $jobData = $payload->data ?? [];
            $sessionId = $jobData->sessionId ?? 'N/A';
            echo "   - {$jobClass} (Session: {$sessionId}, Created: {$job->created_at})\n";
        }
    }
    echo "\n";
    
    // Check 3: Recent sessions
    echo "📋 CHECK 3: Recent Text Sessions\n";
    $recentSessions = TextSession::orderBy('created_at', 'desc')
        ->limit(5)
        ->get();
    
    foreach ($recentSessions as $session) {
        echo "   Session {$session->id}:\n";
        echo "     Status: {$session->status}\n";
        echo "     Created: {$session->created_at}\n";
        echo "     Activated: {$session->activated_at}\n";
        echo "     Sessions used: {$session->sessions_used}\n";
        echo "     Auto deductions: {$session->auto_deductions_processed}\n";
        echo "     Sessions before start: {$session->sessions_remaining_before_start}\n";
        echo "\n";
    }
    
    // Check 4: Test queue dispatching
    echo "📋 CHECK 4: Testing Queue Dispatching\n";
    try {
        // Try to dispatch a test job
        \App\Jobs\ProcessTextSessionAutoDeduction::dispatch(999, 1)
            ->onConnection('text-sessions');
        echo "   ✅ Test job dispatched successfully\n";
        
        // Check if it was created
        $testJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Jobs after test dispatch: {$testJobs}\n";
        
        // Clean up test job
        DB::table('jobs')->where('queue', 'text-sessions')->delete();
        echo "   ✅ Test job cleaned up\n";
        
    } catch (Exception $e) {
        echo "   ❌ Test job dispatch failed: " . $e->getMessage() . "\n";
    }
    echo "\n";
    
    // Check 5: Middleware status
    echo "📋 CHECK 5: Middleware Status\n";
    $middlewareRegistered = in_array(\App\Http\Middleware\ProcessQueueJobs::class, app('router')->getMiddleware());
    echo "   ProcessQueueJobs middleware registered: " . ($middlewareRegistered ? 'YES' : 'NO') . "\n";
    
    // Check if middleware is in global middleware
    $globalMiddleware = app('router')->getMiddlewareGroups()['web'] ?? [];
    $middlewareInGlobal = in_array(\App\Http\Middleware\ProcessQueueJobs::class, $globalMiddleware);
    echo "   Middleware in global stack: " . ($middlewareInGlobal ? 'YES' : 'NO') . "\n";
    echo "\n";
    
    // Check 6: Cache status for middleware throttling
    echo "📋 CHECK 6: Middleware Cache Status\n";
    $lastProcessing = cache()->get('last_queue_processing');
    echo "   Last queue processing: " . ($lastProcessing ? date('Y-m-d H:i:s', $lastProcessing) : 'NEVER') . "\n";
    echo "\n";
    
    echo "💡 DIAGNOSIS:\n";
    if ($textSessionsJobs > 0) {
        echo "   ✅ Jobs are being created in the queue\n";
        echo "   ❓ But they might not be processed by the middleware\n";
    } else {
        echo "   ❌ No jobs are being created - this is the problem!\n";
        echo "   Possible causes:\n";
        echo "   1. Queue dispatching is failing\n";
        echo "   2. Sessions are not calling scheduleAutoDeductions()\n";
        echo "   3. getTotalAllowedMinutes() is returning 0\n";
    }
    
    echo "\n🔧 RECOMMENDATIONS:\n";
    echo "   1. Check if new sessions are calling scheduleAutoDeductions()\n";
    echo "   2. Verify the middleware is processing jobs\n";
    echo "   3. Test with a completely new session\n";
    
} catch (Exception $e) {
    echo "❌ Check failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
