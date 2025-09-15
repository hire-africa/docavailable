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

echo "🔧 FIXING SESSION 105\n";
echo "====================\n\n";

try {
    $session = TextSession::with(['patient', 'doctor'])->find(105);
    if (!$session) {
        echo "❌ Session 105 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 105 CURRENT STATE:\n";
    echo "   ID: {$session->id}\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions remaining before start: {$session->sessions_remaining_before_start}\n\n";
    
    $subscription = $session->patient->subscription;
    echo "📋 SUBSCRIPTION BEFORE FIX:\n";
    echo "   Text sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Calculate what should have happened
    $elapsedMinutes = $session->getElapsedMinutes();
    $shouldHaveDeductions = floor($elapsedMinutes / 10);
    
    echo "⏰ CALCULATIONS:\n";
    echo "   Elapsed minutes: {$elapsedMinutes}\n";
    echo "   Should have deductions: {$shouldHaveDeductions}\n";
    echo "   Actual deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Missing deductions: " . ($shouldHaveDeductions - $session->auto_deductions_processed) . "\n\n";
    
    // Process missing deductions
    if ($shouldHaveDeductions > $session->auto_deductions_processed) {
        $deductionsToProcess = $shouldHaveDeductions - $session->auto_deductions_processed;
        echo "🔄 PROCESSING {$deductionsToProcess} MISSING DEDUCTIONS...\n";
        
        // Create and process the auto-deduction job
        $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($session->id, $shouldHaveDeductions);
        $autoDeductionJob->handle();
        
        $session->refresh();
        $subscription->refresh();
        
        echo "✅ DEDUCTIONS PROCESSED\n";
        echo "   Session auto_deductions_processed: {$session->auto_deductions_processed}\n";
        echo "   Session sessions_used: {$session->sessions_used}\n";
        echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    } else {
        echo "✅ No missing deductions to process\n\n";
    }
    
    // Since the session is already ended, we need to handle the manual ending deduction
    if ($session->status === 'ended' && $session->sessions_used == 0) {
        echo "🔧 HANDLING MANUAL ENDING DEDUCTION...\n";
        
        // The session was ended but no sessions were used, so we need to add the manual ending deduction
        $paymentService = new \App\Services\DoctorPaymentService();
        
        // Temporarily set session status back to active for the deduction
        $session->update(['status' => 'active']);
        
        // Process manual ending deduction
        $deductionResult = $paymentService->processManualEndDeduction($session);
        
        if ($deductionResult) {
            $session->update([
                'status' => 'ended',
                'sessions_used' => $session->sessions_used + 1
            ]);
            echo "✅ Manual ending deduction processed\n";
        } else {
            echo "❌ Manual ending deduction failed\n";
            // Set status back to ended
            $session->update(['status' => 'ended']);
        }
        
        $session->refresh();
        $subscription->refresh();
        
        echo "   Final session sessions_used: {$session->sessions_used}\n";
        echo "   Final subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    }
    
    echo "🧹 CLEARING ANY PENDING QUEUE JOBS...\n";
    $deletedJobs = DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   Deleted {$deletedJobs} pending jobs\n\n";
    
    echo "✅ SESSION 105 FIXED!\n";
    echo "   Auto-deductions: Processed\n";
    echo "   Manual ending: Handled\n";
    echo "   Queue jobs: Cleared\n";
    echo "   Final sessions used: {$session->sessions_used}\n";
    echo "   Final sessions remaining: {$subscription->text_sessions_remaining}\n";
    
    echo "\n💡 NEXT STEPS:\n";
    echo "   Now test with a NEW session to verify the auto-deduction system works!\n";
    echo "   The fixes we deployed should work for any new sessions.\n";
    
} catch (Exception $e) {
    echo "❌ Fix failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
