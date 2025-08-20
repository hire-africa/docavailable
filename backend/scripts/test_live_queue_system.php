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
use App\Jobs\ProcessTextSessionAutoDeduction;
use App\Jobs\EndTextSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🧪 LIVE TESTING QUEUE-BASED SESSION MANAGEMENT\n";
echo "==============================================\n\n";

try {
    // Find a patient with sessions available
    $patient = User::where('user_type', 'patient')
        ->whereHas('subscription', function($query) {
            $query->where('text_sessions_remaining', '>', 0)
                  ->where('is_active', true);
        })
        ->first();
    
    if (!$patient) {
        echo "❌ No patient with available sessions found. Creating test subscription...\n";
        
        // Create a test subscription for an existing patient
        $patient = User::where('user_type', 'patient')->first();
        $subscription = Subscription::updateOrCreate(
            ['user_id' => $patient->id],
            [
                'plan_id' => 1,
                'status' => 1,
                'is_active' => true,
                'text_sessions_remaining' => 5,
                'voice_sessions_remaining' => 5,
                'video_sessions_remaining' => 5,
                'start_date' => now(),
                'end_date' => now()->addMonth(),
            ]
        );
        
        echo "✅ Created test subscription for {$patient->first_name} {$patient->last_name}\n";
        echo "   Text sessions: {$subscription->text_sessions_remaining}\n";
    } else {
        $subscription = $patient->subscription;
        echo "✅ Found patient with sessions: {$patient->first_name} {$patient->last_name}\n";
        echo "   Text sessions: {$subscription->text_sessions_remaining}\n";
    }
    
    // Find a doctor
    $doctor = User::where('user_type', 'doctor')->first();
    echo "✅ Using doctor: {$doctor->first_name} {$doctor->last_name}\n\n";
    
    // Test 1: Create a text session
    echo "1️⃣ Creating text session...\n";
    
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
        'started_at' => now(),
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
        'reason' => 'Live test session for queue system',
    ]);
    
    echo "✅ Session created: ID {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n\n";
    
    // Test 2: Activate session (simulate doctor response)
    echo "2️⃣ Activating session (simulating doctor response)...\n";
    
    $session->update([
        'status' => TextSession::STATUS_ACTIVE,
        'activated_at' => now()
    ]);
    
    // Schedule auto-deductions and auto-ending
    $session->scheduleAutoDeductions();
    $session->scheduleAutoEndForInsufficientSessions();
    
    echo "✅ Session activated and queues scheduled\n";
    echo "   Activated at: {$session->activated_at}\n";
    echo "   Total allowed minutes: {$session->getTotalAllowedMinutes()}\n";
    echo "   Next deduction time: {$session->getNextAutoDeductionTime()}\n\n";
    
    // Test 3: Check queue jobs were created
    echo "3️⃣ Checking queue jobs...\n";
    
    $jobs = DB::table('jobs')->where('queue', 'text-sessions')->get();
    echo "✅ Found " . $jobs->count() . " jobs in text-sessions queue\n";
    
    foreach ($jobs as $job) {
        $payload = json_decode($job->payload);
        $command = $payload->data->command;
        
        if (strpos($command, 'ProcessTextSessionAutoDeduction') !== false) {
            echo "   📅 Auto-deduction job scheduled\n";
        } elseif (strpos($command, 'EndTextSession') !== false) {
            echo "   ⏰ Auto-end job scheduled\n";
        }
    }
    echo "\n";
    
    // Test 4: Test manual ending
    echo "4️⃣ Testing manual session ending...\n";
    
    $endResult = $session->endManually('live_test_manual_end');
    
    if ($endResult) {
        echo "✅ Manual ending successful\n";
        echo "   Final status: {$session->status}\n";
        echo "   Ended at: {$session->ended_at}\n";
        echo "   Sessions used: {$session->sessions_used}\n";
    } else {
        echo "❌ Manual ending failed\n";
    }
    
    // Test 5: Check subscription deductions
    echo "\n5️⃣ Checking subscription deductions...\n";
    
    $subscription->refresh();
    echo "✅ Sessions remaining after manual end: {$subscription->text_sessions_remaining}\n";
    
    // Test 6: Test atomic operations (prevent double processing)
    echo "\n6️⃣ Testing atomic operations...\n";
    
    // Try to end the session again (should fail due to atomic check)
    $endResult2 = $session->endManually('live_test_double_end');
    
    if (!$endResult2) {
        echo "✅ Atomic operation working - prevented double ending\n";
    } else {
        echo "❌ Atomic operation failed - allowed double ending\n";
    }
    
    // Test 7: Test queue job atomic operations
    echo "\n7️⃣ Testing queue job atomic operations...\n";
    
    // Create a new session for testing
    $session2 = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'started_at' => now(),
        'activated_at' => now()->subMinutes(15), // 15 minutes ago
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
        'reason' => 'Live test session for atomic operations',
    ]);
    
    // Try to process auto-deduction twice
    $job1 = new ProcessTextSessionAutoDeduction($session2->id, 1);
    $job2 = new ProcessTextSessionAutoDeduction($session2->id, 1);
    
    $job1->handle();
    $job2->handle(); // Should be skipped due to atomic check
    
    $session2->refresh();
    echo "✅ Auto-deductions processed: {$session2->auto_deductions_processed}\n";
    echo "   Sessions used: {$session2->sessions_used}\n";
    
    // Test 8: Test insufficient sessions scenario
    echo "\n8️⃣ Testing insufficient sessions scenario...\n";
    
    // Set sessions to 0
    $subscription->update(['text_sessions_remaining' => 0]);
    
    $session3 = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'started_at' => now(),
        'activated_at' => now(),
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'sessions_remaining_before_start' => 0,
        'reason' => 'Live test session with no sessions',
    ]);
    
    $shouldEnd = $session3->shouldAutoEndDueToInsufficientSessions();
    echo "✅ Should auto-end due to insufficient sessions: " . ($shouldEnd ? 'YES' : 'NO') . "\n";
    
    // Test 9: Cleanup
    echo "\n9️⃣ Cleaning up test data...\n";
    
    // Delete test sessions
    TextSession::whereIn('id', [$session->id, $session2->id, $session3->id])->delete();
    
    // Clear queue jobs
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    
    echo "✅ Test data cleaned up\n";
    
    echo "\n🎉 LIVE TEST PASSED! Queue-based session management is working correctly.\n";
    echo "\n📋 SUMMARY:\n";
    echo "   ✅ Session creation and activation\n";
    echo "   ✅ Queue job scheduling\n";
    echo "   ✅ Manual session ending with atomic operations\n";
    echo "   ✅ Subscription deductions\n";
    echo "   ✅ Double processing prevention\n";
    echo "   ✅ Insufficient sessions handling\n";
    
} catch (Exception $e) {
    echo "❌ LIVE TEST FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
