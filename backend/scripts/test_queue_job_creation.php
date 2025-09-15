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

echo "🧪 TESTING QUEUE JOB CREATION\n";
echo "=============================\n\n";

try {
    // Test 1: Create a test session
    echo "📋 Test 1: Creating test session...\n";
    
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();
    
    if (!$patient || !$doctor) {
        echo "   ❌ Need both patient and doctor users for testing\n";
        exit(1);
    }
    
    // Check if patient has sessions available
    $subscription = $patient->subscription;
    if (!$subscription || $subscription->text_sessions_remaining <= 0) {
        echo "   ⚠️  Patient has no sessions remaining, adding 3 sessions for testing\n";
        $subscription->increment('text_sessions_remaining', 3);
        $subscription->refresh();
    }
    
    echo "   Patient sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    // Create a test session in waiting_for_doctor status
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => 'waiting_for_doctor',
        'started_at' => now(),
        'activated_at' => null,
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
        'reason' => 'test_queue_job_creation'
    ]);
    
    echo "   ✅ Created test session ID: {$session->id}\n";
    echo "   Status: {$session->status}\n\n";
    
    // Test 2: Check queue jobs before activation
    echo "📋 Test 2: Checking queue jobs before activation...\n";
    $jobsBefore = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Queue jobs before activation: {$jobsBefore}\n\n";
    
    // Test 3: Activate the session (simulate doctor sending first message)
    echo "📋 Test 3: Activating session (simulating doctor message)...\n";
    
    $session->update([
        'status' => 'active',
        'activated_at' => now()
    ]);
    
    echo "   ✅ Session activated\n";
    echo "   Status: {$session->status}\n";
    echo "   Activated at: {$session->activated_at}\n\n";
    
    // Test 4: Call scheduleAutoDeductions manually
    echo "📋 Test 4: Calling scheduleAutoDeductions()...\n";
    
    try {
        $session->scheduleAutoDeductions();
        echo "   ✅ scheduleAutoDeductions() called successfully\n";
    } catch (Exception $e) {
        echo "   ❌ scheduleAutoDeductions() failed: " . $e->getMessage() . "\n";
    }
    
    // Test 5: Call scheduleAutoEndForInsufficientSessions
    echo "📋 Test 5: Calling scheduleAutoEndForInsufficientSessions()...\n";
    
    try {
        $session->scheduleAutoEndForInsufficientSessions();
        echo "   ✅ scheduleAutoEndForInsufficientSessions() called successfully\n";
    } catch (Exception $e) {
        echo "   ❌ scheduleAutoEndForInsufficientSessions() failed: " . $e->getMessage() . "\n";
    }
    
    // Test 6: Check queue jobs after scheduling
    echo "📋 Test 6: Checking queue jobs after scheduling...\n";
    $jobsAfter = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Queue jobs after scheduling: {$jobsAfter}\n";
    
    if ($jobsAfter > $jobsBefore) {
        echo "   ✅ Queue jobs were created successfully!\n";
        
        // List the created jobs
        $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
        foreach ($jobs as $job) {
            $payload = json_decode($job->payload);
            $jobClass = $payload->displayName ?? 'Unknown';
            $jobData = $payload->data ?? [];
            echo "   - Job: {$jobClass}\n";
            if (isset($jobData->sessionId)) {
                echo "     Session ID: {$jobData->sessionId}\n";
            }
            if (isset($jobData->expectedDeductionCount)) {
                echo "     Expected deductions: {$jobData->expectedDeductionCount}\n";
            }
            if (isset($jobData->reason)) {
                echo "     Reason: {$jobData->reason}\n";
            }
        }
    } else {
        echo "   ❌ No queue jobs were created!\n";
        echo "   This indicates a problem with the scheduling logic.\n";
    }
    
    // Test 7: Test the queue processing middleware
    echo "\n📋 Test 7: Testing queue processing middleware...\n";
    
    if ($jobsAfter > 0) {
        $middleware = new \App\Http\Middleware\ProcessQueueJobs();
        $request = \Illuminate\Http\Request::create('/test', 'GET');
        
        // Use reflection to call the private method
        $reflection = new ReflectionClass($middleware);
        $method = $reflection->getMethod('processPendingQueueJobs');
        $method->setAccessible(true);
        
        $method->invoke($middleware);
        
        echo "   ✅ Middleware processing completed\n";
        
        // Check if jobs were processed
        $jobsAfterProcessing = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Jobs after processing: {$jobsAfterProcessing}\n";
        
        if ($jobsAfterProcessing < $jobsAfter) {
            echo "   ✅ Jobs were processed successfully!\n";
        } else {
            echo "   ⚠️  Jobs were not processed (might be due to timing restrictions)\n";
        }
    } else {
        echo "   ⚠️  No jobs to process\n";
    }
    
    // Cleanup
    echo "\n🧹 Cleanup...\n";
    $session->delete();
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   ✅ Test data cleaned up\n";
    
    echo "\n✅ QUEUE JOB CREATION TEST COMPLETED!\n";
    
    if ($jobsAfter > $jobsBefore) {
        echo "   The queue job creation is working correctly.\n";
        echo "   The issue with session 98 might be that the activation logic wasn't triggered.\n";
    } else {
        echo "   ❌ Queue job creation is NOT working!\n";
        echo "   This needs to be fixed for the auto-deduction system to work.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
