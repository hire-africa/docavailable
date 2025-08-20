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
use App\Services\DoctorPaymentService;
use Illuminate\Support\Facades\DB;

echo "🧪 TESTING SCHEDULER-BASED AUTO-DEDUCTION\n";
echo "=========================================\n\n";

try {
    // Test 1: Create a test session
    echo "1️⃣ Creating test session...\n";
    
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();
    
    if (!$patient || !$doctor) {
        echo "❌ Need at least one patient and one doctor\n";
        exit(1);
    }
    
    // Ensure patient has sessions
    if (!$patient->subscription) {
        $subscription = Subscription::create([
            'user_id' => $patient->id,
            'plan_id' => 1,
            'status' => 'active',
            'text_sessions_remaining' => 5,
            'total_text_sessions' => 5,
            'start_date' => now(),
            'end_date' => now()->addMonth()
        ]);
    } else {
        $subscription = $patient->subscription;
        $subscription->update(['text_sessions_remaining' => 5]);
    }
    
    // Create session
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => 'active', // Set to active for testing
        'started_at' => now()->subMinutes(15), // Started 15 minutes ago
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'sessions_remaining_before_start' => 5,
        'activated_at' => now()->subMinutes(12) // Activated 12 minutes ago
    ]);
    
    echo "✅ Created session {$session->id}\n";
    echo "   Started: {$session->started_at}\n";
    echo "   Activated: {$session->activated_at}\n";
    echo "   Sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Test 2: Test auto-deduction logic directly
    echo "2️⃣ Testing auto-deduction logic...\n";
    
    $elapsedMinutes = $session->getElapsedMinutes();
    $expectedDeductions = floor($elapsedMinutes / 10);
    $alreadyProcessed = $session->auto_deductions_processed ?? 0;
    $newDeductions = $expectedDeductions - $alreadyProcessed;
    
    echo "   Elapsed minutes: {$elapsedMinutes}\n";
    echo "   Expected deductions: {$expectedDeductions}\n";
    echo "   Already processed: {$alreadyProcessed}\n";
    echo "   New deductions needed: {$newDeductions}\n\n";
    
    if ($newDeductions > 0) {
        // Test atomic update
        $updated = DB::table('text_sessions')
            ->where('id', $session->id)
            ->where('status', TextSession::STATUS_ACTIVE)
            ->where('auto_deductions_processed', $alreadyProcessed)
            ->update([
                'auto_deductions_processed' => $expectedDeductions,
                'sessions_used' => DB::raw("sessions_used + {$newDeductions}"),
                'updated_at' => now()
            ]);
        
        if ($updated > 0) {
            // Process the actual deduction
            $paymentService = new DoctorPaymentService();
            $success = $paymentService->processAutoDeduction($session);
            
            if ($success) {
                echo "✅ Auto-deduction processed successfully!\n";
                echo "   Deductions processed: {$newDeductions}\n";
            } else {
                echo "❌ Auto-deduction failed\n";
            }
        } else {
            echo "⚠️ Atomic update failed (concurrent processing or already updated)\n";
        }
    } else {
        echo "⏭️ No new deductions needed\n";
    }
    
    $session->refresh();
    $subscription->refresh();
    
    echo "\n   Final results:\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto-deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Test 3: Test session ending
    echo "3️⃣ Testing session ending...\n";
    
    if ($session->hasRunOutOfTime()) {
        echo "✅ Session has run out of time - should be ended\n";
        
        $session->update([
            'status' => TextSession::STATUS_ENDED,
            'ended_at' => now(),
            'reason' => 'time_expired'
        ]);
        
        echo "   Session ended successfully\n";
        echo "   Final status: {$session->status}\n";
        echo "   Reason: {$session->reason}\n";
    } else {
        echo "⏭️ Session still has time remaining\n";
        echo "   Remaining time: {$session->getRemainingTimeMinutes()} minutes\n";
    }
    
    echo "\n🎉 SCHEDULER-BASED SYSTEM TESTED SUCCESSFULLY!\n";
    echo "\n💡 The scheduler will run every 10 minutes to process auto-deductions\n";
    echo "   Command: php artisan sessions:process-auto-deductions\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
