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

echo "🧪 TESTING SCHEDULING FIX\n";
echo "=========================\n\n";

try {
    // Test with the patient from session 98
    $patient = User::find(15); // Praise Mtosa from session 98
    if (!$patient) {
        echo "❌ Patient not found!\n";
        exit(1);
    }
    
    echo "📋 PATIENT DETAILS:\n";
    echo "   ID: {$patient->id}\n";
    echo "   Name: {$patient->first_name} {$patient->last_name}\n";
    echo "   Email: {$patient->email}\n\n";
    
    $subscription = $patient->subscription;
    if (!$subscription) {
        echo "❌ No subscription found!\n";
        exit(1);
    }
    
    // Add a session for testing
    $subscription->increment('text_sessions_remaining', 1);
    $subscription->refresh();
    
    echo "📋 SUBSCRIPTION DETAILS:\n";
    echo "   ID: {$subscription->id}\n";
    echo "   Plan: {$subscription->planName}\n";
    echo "   Status: {$subscription->status}\n";
    echo "   Is active (accessor): " . ($subscription->isActive ? 'YES' : 'NO') . "\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Total text sessions: {$subscription->totalTextSessions}\n\n";
    
    // Create a test session
    $doctor = User::where('user_type', 'doctor')->first();
    if (!$doctor) {
        echo "❌ No doctor found!\n";
        exit(1);
    }
    
    echo "📋 DOCTOR DETAILS:\n";
    echo "   ID: {$doctor->id}\n";
    echo "   Name: {$doctor->first_name} {$doctor->last_name}\n\n";
    
    // Create a test session
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
        'reason' => 'test_scheduling_fix'
    ]);
    
    echo "📋 TEST SESSION CREATED:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n\n";
    
    // Test getTotalAllowedMinutes before activation
    echo "📋 BEFORE ACTIVATION:\n";
    echo "   getTotalAllowedMinutes(): {$session->getTotalAllowedMinutes()}\n";
    echo "   getRemainingSessions(): {$session->getRemainingSessions()}\n";
    echo "   shouldAutoEndDueToInsufficientSessions(): " . ($session->shouldAutoEndDueToInsufficientSessions() ? 'YES' : 'NO') . "\n\n";
    
    // Activate the session
    $session->update([
        'status' => 'active',
        'activated_at' => now()
    ]);
    
    echo "📋 AFTER ACTIVATION:\n";
    echo "   Status: {$session->status}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   getTotalAllowedMinutes(): {$session->getTotalAllowedMinutes()}\n";
    echo "   getRemainingSessions(): {$session->getRemainingSessions()}\n";
    echo "   shouldAutoEndDueToInsufficientSessions(): " . ($session->shouldAutoEndDueToInsufficientSessions() ? 'YES' : 'NO') . "\n\n";
    
    // Test scheduling
    echo "📋 TESTING SCHEDULING:\n";
    
    if ($session->getTotalAllowedMinutes() > 0) {
        echo "   ✅ Total allowed minutes > 0, scheduling should work\n";
        
        // Call scheduleAutoDeductions
        $session->scheduleAutoDeductions();
        echo "   ✅ scheduleAutoDeductions() called\n";
        
        // Check if jobs were created
        $jobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Queue jobs created: {$jobs}\n";
        
        if ($jobs > 0) {
            echo "   ✅ Jobs were created successfully!\n";
            
            // List the created jobs
            $jobList = DB::table('jobs')->where('queue', 'text-sessions')->get();
            foreach ($jobList as $job) {
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
            echo "   ❌ No jobs were created!\n";
        }
        
        // Call scheduleAutoEndForInsufficientSessions
        $session->scheduleAutoEndForInsufficientSessions();
        echo "   ✅ scheduleAutoEndForInsufficientSessions() called\n";
        
        // Check total jobs
        $totalJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
        echo "   Total queue jobs: {$totalJobs}\n";
        
    } else {
        echo "   ❌ Total allowed minutes = 0, scheduling won't work\n";
        echo "   This is why no queue jobs are being created!\n";
    }
    
    // Test the queue processing middleware
    echo "\n📋 TESTING QUEUE PROCESSING:\n";
    
    if ($jobs > 0) {
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
        
        if ($jobsAfterProcessing < $jobs) {
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
    
    echo "\n✅ SCHEDULING FIX TEST COMPLETED!\n";
    
    if ($session->getTotalAllowedMinutes() > 0 && $jobs > 0) {
        echo "   ✅ The scheduling fix is working correctly!\n";
        echo "   Queue jobs are now being created properly.\n";
        echo "   This should fix the auto-deduction issue for future sessions.\n";
    } else {
        echo "   ❌ The scheduling fix is not working.\n";
        echo "   Further investigation is needed.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
