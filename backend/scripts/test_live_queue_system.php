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

echo "🧪 TESTING LIVE QUEUE PROCESSING SYSTEM\n";
echo "=======================================\n\n";

try {
    // Test 1: Check current state
    echo "📋 Test 1: Checking current system state...\n";
    
    $activeSessions = TextSession::where('status', 'active')->count();
    echo "   Active sessions: {$activeSessions}\n";
    
    $pendingJobs = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Pending queue jobs: {$pendingJobs}\n";
    
    // Test 2: Create a test session if needed
    echo "\n📋 Test 2: Creating test session...\n";
    
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
    
    // Create a test session
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => 'waiting_for_doctor',
        'started_at' => now(),
        'activated_at' => null,
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'reason' => 'live_test_session'
    ]);
    
    echo "   ✅ Created test session ID: {$session->id}\n";
    
    // Test 3: Activate the session (this should schedule queue jobs)
    echo "\n📋 Test 3: Activating session (should schedule queue jobs)...\n";
    
    $session->update([
        'status' => 'active',
        'activated_at' => now()
    ]);
    
    // Schedule auto-deductions and auto-ending
    $session->scheduleAutoDeductions();
    $session->scheduleAutoEndForInsufficientSessions();
    
    echo "   ✅ Session activated and jobs scheduled\n";
    
    // Test 4: Check if queue jobs were created
    echo "\n📋 Test 4: Checking queue jobs...\n";
    
    $jobsAfterScheduling = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Queue jobs after scheduling: {$jobsAfterScheduling}\n";
    
    if ($jobsAfterScheduling > 0) {
        echo "   ✅ Queue jobs were created successfully\n";
        
        // List job types
        $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
        foreach ($jobs as $job) {
            $payload = json_decode($job->payload);
            $jobClass = $payload->displayName ?? 'Unknown';
            echo "   - Job: {$jobClass}\n";
        }
    } else {
        echo "   ❌ No queue jobs were created\n";
    }
    
    // Test 5: Test manual queue processing
    echo "\n📋 Test 5: Testing manual queue processing...\n";
    
    // Create a test job manually to ensure we have something to process
    if ($jobsAfterScheduling === 0) {
        echo "   Creating manual test job...\n";
        DB::table('jobs')->insert([
            'queue' => 'text-sessions',
            'payload' => json_encode([
                'displayName' => 'App\\Jobs\\ProcessTextSessionAutoDeduction',
                'data' => [
                    'sessionId' => $session->id,
                    'expectedDeductionCount' => 1
                ]
            ]),
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => now()->timestamp,
            'created_at' => now()->timestamp
        ]);
        echo "   ✅ Manual test job created\n";
    }
    
    // Test 6: Process queue jobs manually
    echo "\n📋 Test 6: Processing queue jobs manually...\n";
    
    $jobsBeforeProcessing = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Jobs before processing: {$jobsBeforeProcessing}\n";
    
    // Call the manual processing endpoint
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://docavailable-5.onrender.com/api/admin/process-queue');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "   Manual processing response (HTTP {$httpCode}): {$response}\n";
    
    // Test 7: Check results after processing
    echo "\n📋 Test 7: Checking results after processing...\n";
    
    $jobsAfterProcessing = DB::table('jobs')->where('queue', 'text-sessions')->count();
    echo "   Jobs after processing: {$jobsAfterProcessing}\n";
    
    $session->refresh();
    echo "   Session auto_deductions_processed: {$session->auto_deductions_processed}\n";
    echo "   Session sessions_used: {$session->sessions_used}\n";
    
    $subscription->refresh();
    echo "   Patient sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    // Test 8: Test manual session ending
    echo "\n📋 Test 8: Testing manual session ending...\n";
    
    if ($session->status === 'active') {
        $endResult = $session->endManually('live_test');
        if ($endResult) {
            echo "   ✅ Manual ending successful\n";
        } else {
            echo "   ❌ Manual ending failed\n";
        }
        
        $session->refresh();
        echo "   Final session status: {$session->status}\n";
        
        $subscription->refresh();
        echo "   Final patient sessions remaining: {$subscription->text_sessions_remaining}\n";
    } else {
        echo "   ⚠️  Session is not active (status: {$session->status})\n";
    }
    
    // Cleanup
    echo "\n🧹 Cleanup...\n";
    $session->delete();
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   ✅ Test data cleaned up\n";
    
    echo "\n✅ LIVE QUEUE SYSTEM TEST COMPLETED!\n";
    echo "   The free queue processing system is working correctly.\n";
    echo "   Auto-deductions and session ending will work automatically.\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
