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

echo "🧪 CREATING TEST SESSION 106\n";
echo "============================\n\n";

try {
    // Get users
    $patient = User::find(15); // Praise Mtosa
    $doctor = User::find(20);  // Kali Mtosa
    
    if (!$patient || !$doctor) {
        echo "❌ Users not found!\n";
        echo "   Patient (ID 15): " . ($patient ? 'FOUND' : 'NOT FOUND') . "\n";
        echo "   Doctor (ID 20): " . ($doctor ? 'FOUND' : 'NOT FOUND') . "\n";
        exit(1);
    }
    
    echo "📋 USERS:\n";
    echo "   Patient: {$patient->first_name} {$patient->last_name} (ID: {$patient->id})\n";
    echo "   Doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";
    
    // Check patient subscription
    $subscription = $patient->subscription;
    if (!$subscription) {
        echo "❌ Patient has no subscription!\n";
        exit(1);
    }
    
    echo "📋 SUBSCRIPTION:\n";
    echo "   Plan: {$subscription->planName}\n";
    echo "   Is active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Total text sessions: {$subscription->totalTextSessions}\n\n";
    
    // Ensure patient has sessions available
    if ($subscription->text_sessions_remaining <= 0) {
        echo "⚠️  Patient has no sessions remaining, adding 3 sessions for testing\n";
        $subscription->increment('text_sessions_remaining', 3);
        $subscription->refresh();
        echo "   New sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    }
    
    // Clear any existing jobs
    echo "🧹 Clearing existing queue jobs...\n";
    $deletedJobs = DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   Deleted {$deletedJobs} existing jobs\n\n";
    
    // Create the test session
    echo "📋 CREATING SESSION 106...\n";
    
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
        'reason' => 'test_session_106'
    ]);
    
    echo "   ✅ Session 106 created successfully!\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n\n";
    
    // Activate the session (simulate doctor sending first message)
    echo "📋 ACTIVATING SESSION 106...\n";
    
    $session->update([
        'status' => 'active',
        'activated_at' => now()
    ]);
    
    echo "   ✅ Session activated!\n";
    echo "   Status: {$session->status}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Total allowed minutes: {$session->getTotalAllowedMinutes()}\n\n";
    
    // Schedule auto-deductions and auto-ending
    echo "📋 SCHEDULING AUTO-DEDUCTIONS...\n";
    
    $session->scheduleAutoDeductions();
    $session->scheduleAutoEndForInsufficientSessions();
    
    echo "   ✅ Auto-deductions scheduled!\n";
    
    // Check if jobs were created
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Queue jobs created: {$jobs}\n";
    
    if ($jobs > 0) {
        echo "   ✅ Jobs were created successfully!\n";
        
        // List the jobs
        $jobList = DB::table('jobs')->where('queue', 'text-sessions')->get();
        foreach ($jobList as $job) {
            $payload = json_decode($job->payload);
            $jobClass = $payload->displayName ?? 'Unknown';
            $jobData = $payload->data ?? [];
            echo "   - {$jobClass}\n";
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
    
    echo "\n🎯 TEST SESSION 106 READY!\n";
    echo "   Session ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Total allowed minutes: {$session->getTotalAllowedMinutes()}\n";
    echo "   Queue jobs: {$jobs}\n";
    echo "\n💡 NEXT STEPS:\n";
    echo "   1. Wait 10+ minutes for auto-deductions\n";
    echo "   2. Check logs for 'Processing X pending queue jobs'\n";
    echo "   3. Check logs for 'Processed auto-deduction for session {$session->id}'\n";
    echo "   4. Monitor session status and subscription sessions remaining\n";
    
} catch (Exception $e) {
    echo "❌ Test session creation failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
