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

echo "🔍 DEBUGGING SCHEDULING ISSUE\n";
echo "============================\n\n";

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
    
    echo "📋 SUBSCRIPTION DETAILS:\n";
    echo "   ID: {$subscription->id}\n";
    echo "   Plan: {$subscription->planName}\n";
    echo "   Status: {$subscription->status}\n";
    echo "   Is active (accessor): " . ($subscription->isActive ? 'YES' : 'NO') . "\n";
    echo "   Is active (raw): " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Total text sessions: {$subscription->totalTextSessions}\n";
    echo "   Start date: {$subscription->start_date}\n";
    echo "   End date: {$subscription->end_date}\n\n";
    
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
        'reason' => 'debug_scheduling_issue'
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
    
    // Cleanup
    echo "\n🧹 Cleanup...\n";
    $session->delete();
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   ✅ Test data cleaned up\n";
    
    echo "\n💡 DIAGNOSIS:\n";
    if ($session->getTotalAllowedMinutes() == 0) {
        echo "   The issue is that getTotalAllowedMinutes() returns 0.\n";
        echo "   This happens when:\n";
        echo "   1. Subscription is not active\n";
        echo "   2. No sessions remaining\n";
        echo "   3. Patient has no subscription\n";
        echo "\n   For session 98, the patient had 1 session remaining,\n";
        echo "   so getTotalAllowedMinutes() should return 10 (1 * 10).\n";
        echo "   If it returned 0, that explains why no queue jobs were created.\n";
    } else {
        echo "   getTotalAllowedMinutes() is working correctly.\n";
        echo "   The issue might be elsewhere in the scheduling logic.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Debug failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
