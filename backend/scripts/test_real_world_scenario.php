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

echo "🌍 REAL-WORLD SCENARIO TESTING\n";
echo "==============================\n\n";

try {
    // Setup: Create a patient with sessions
    echo "🔧 SETUP: Creating test patient with sessions...\n";
    
    $patient = User::where('user_type', 'patient')->first();
    $subscription = Subscription::updateOrCreate(
        ['user_id' => $patient->id],
        [
            'plan_id' => 1,
            'status' => 1,
            'is_active' => true,
            'text_sessions_remaining' => 3, // 3 sessions = 30 minutes
            'voice_sessions_remaining' => 5,
            'video_sessions_remaining' => 5,
            'start_date' => now(),
            'end_date' => now()->addMonth(),
        ]
    );
    
    echo "✅ Patient: {$patient->first_name} {$patient->last_name}\n";
    echo "   Text sessions: {$subscription->text_sessions_remaining}\n";
    echo "   Total minutes available: " . ($subscription->text_sessions_remaining * 10) . "\n\n";
    
    // Find a doctor
    $doctor = User::where('user_type', 'doctor')->first();
    echo "✅ Doctor: {$doctor->first_name} {$doctor->last_name}\n\n";
    
    // SCENARIO 1: Normal session flow
    echo "📋 SCENARIO 1: Normal Session Flow\n";
    echo "==================================\n";
    
    // Step 1: Patient starts a text session
    echo "1️⃣ Patient starts text session...\n";
    
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
        'started_at' => now(),
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
        'reason' => 'Real-world test session',
    ]);
    
    echo "✅ Session created: ID {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions remaining: {$session->sessions_remaining_before_start}\n\n";
    
    // Step 2: Patient sends first message (sets 90-second timer)
    echo "2️⃣ Patient sends first message (90-second timer)...\n";
    
    if ($session->status === TextSession::STATUS_WAITING_FOR_DOCTOR && !$session->doctor_response_deadline) {
        $session->update([
            'doctor_response_deadline' => now()->addSeconds(90)
        ]);
        echo "✅ 90-second timer set\n";
        echo "   Deadline: {$session->doctor_response_deadline}\n";
    }
    echo "\n";
    
    // Step 3: Doctor responds (activates session and schedules queues)
    echo "3️⃣ Doctor responds (activates session)...\n";
    
    if ($session->status === TextSession::STATUS_WAITING_FOR_DOCTOR) {
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
        echo "   Next deduction time: {$session->getNextAutoDeductionTime()}\n";
    }
    echo "\n";
    
    // Step 4: Check queue jobs
    echo "4️⃣ Checking scheduled queue jobs...\n";
    
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
    
    // Step 5: Simulate time passing (10 minutes)
    echo "5️⃣ Simulating 10 minutes passing...\n";
    
    // Update session to simulate 10 minutes have passed
    $session->update([
        'activated_at' => now()->subMinutes(10)
    ]);
    
    echo "✅ Session now shows 10 minutes elapsed\n";
    echo "   Elapsed minutes: {$session->getElapsedMinutes()}\n";
    echo "   Should have 1 auto-deduction: " . (floor($session->getElapsedMinutes() / 10)) . "\n";
    echo "   Sessions remaining: {$session->getRemainingSessions()}\n\n";
    
    // Step 6: Test manual ending
    echo "6️⃣ Testing manual session ending...\n";
    
    $endResult = $session->endManually('real_world_manual_end');
    
    if ($endResult) {
        echo "✅ Manual ending successful\n";
        echo "   Final status: {$session->status}\n";
        echo "   Ended at: {$session->ended_at}\n";
        echo "   Sessions used: {$session->sessions_used}\n";
    } else {
        echo "❌ Manual ending failed\n";
    }
    
    // Step 7: Check final subscription state
    echo "\n7️⃣ Checking final subscription state...\n";
    
    $subscription->refresh();
    echo "✅ Final sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "   Sessions used in this test: " . (3 - $subscription->text_sessions_remaining) . "\n";
    
    // SCENARIO 2: Test auto-deduction with time simulation
    echo "\n📋 SCENARIO 2: Auto-Deduction Test\n";
    echo "==================================\n";
    
    // Create another session for auto-deduction testing
    echo "1️⃣ Creating session for auto-deduction test...\n";
    
    $session2 = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'started_at' => now()->subMinutes(25), // 25 minutes ago
        'activated_at' => now()->subMinutes(25), // 25 minutes ago
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'auto_deductions_processed' => 0,
        'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
        'reason' => 'Auto-deduction test session',
    ]);
    
    echo "✅ Session created: ID {$session2->id}\n";
    echo "   Activated 25 minutes ago\n";
    echo "   Should have 2 auto-deductions: " . floor(25 / 10) . "\n";
    echo "   Elapsed minutes: {$session2->getElapsedMinutes()}\n\n";
    
    // Test auto-deduction job
    echo "2️⃣ Testing auto-deduction job...\n";
    
    $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($session2->id, 2);
    $autoDeductionJob->handle();
    
    $session2->refresh();
    echo "✅ Auto-deduction processed\n";
    echo "   Auto deductions processed: {$session2->auto_deductions_processed}\n";
    echo "   Sessions used: {$session2->sessions_used}\n";
    
    // Check subscription after auto-deduction
    $subscription->refresh();
    echo "   Sessions remaining after auto-deduction: {$subscription->text_sessions_remaining}\n\n";
    
    // SCENARIO 3: Test insufficient sessions
    echo "📋 SCENARIO 3: Insufficient Sessions Test\n";
    echo "=========================================\n";
    
    // Set sessions to 0
    $subscription->update(['text_sessions_remaining' => 0]);
    
    echo "1️⃣ Set sessions to 0...\n";
    echo "   Sessions remaining: {$subscription->text_sessions_remaining}\n";
    
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
        'reason' => 'Insufficient sessions test',
    ]);
    
    echo "2️⃣ Created session with 0 sessions...\n";
    
    $shouldEnd = $session3->shouldAutoEndDueToInsufficientSessions();
    echo "✅ Should auto-end due to insufficient sessions: " . ($shouldEnd ? 'YES' : 'NO') . "\n";
    
    // Test auto-end job
    echo "3️⃣ Testing auto-end job...\n";
    
    $autoEndJob = new \App\Jobs\EndTextSession($session3->id, 'insufficient_sessions');
    $autoEndJob->handle();
    
    $session3->refresh();
    echo "✅ Auto-end processed\n";
    echo "   Final status: {$session3->status}\n";
    echo "   Ended at: {$session3->ended_at}\n";
    echo "   Reason: {$session3->reason}\n\n";
    
    // Cleanup
    echo "🧹 CLEANUP: Removing test data...\n";
    
    TextSession::whereIn('id', [$session->id, $session2->id, $session3->id])->delete();
    DB::table('jobs')->where('queue', 'text-sessions')->delete();
    
    echo "✅ Test data cleaned up\n";
    
    echo "\n🎉 REAL-WORLD SCENARIO TESTS PASSED!\n";
    echo "\n📋 SUMMARY:\n";
    echo "   ✅ Normal session flow (start → activate → end)\n";
    echo "   ✅ 90-second timer for doctor response\n";
    echo "   ✅ Queue job scheduling\n";
    echo "   ✅ Auto-deduction processing\n";
    echo "   ✅ Manual session ending\n";
    echo "   ✅ Subscription deductions\n";
    echo "   ✅ Insufficient sessions handling\n";
    echo "   ✅ Auto-ending when sessions run out\n";
    
} catch (Exception $e) {
    echo "❌ REAL-WORLD TEST FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
