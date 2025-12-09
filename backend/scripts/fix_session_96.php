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

echo "🔧 FIXING SESSION 96\n";
echo "===================\n\n";

try {
    // Get session 96
    $session = TextSession::with(['patient', 'doctor'])->find(96);
    
    if (!$session) {
        echo "❌ Session 96 not found!\n";
        exit(1);
    }
    
    echo "📋 SESSION 96 CURRENT STATE:\n";
    echo "   Status: {$session->status}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Elapsed minutes: {$session->getElapsedMinutes()}\n";
    
    $subscription = $session->patient->subscription;
    echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    
    // Calculate how many deductions should have been processed
    $elapsedMinutes = $session->getElapsedMinutes();
    $shouldHaveDeductions = floor($elapsedMinutes / 10);
    
    echo "⏰ CALCULATIONS:\n";
    echo "   Elapsed minutes: {$elapsedMinutes}\n";
    echo "   Should have deductions: {$shouldHaveDeductions}\n";
    echo "   Current deductions processed: {$session->auto_deductions_processed}\n\n";
    
    if ($shouldHaveDeductions > $session->auto_deductions_processed) {
        $deductionsToProcess = $shouldHaveDeductions - $session->auto_deductions_processed;
        
        echo "🔄 PROCESSING {$deductionsToProcess} MISSING DEDUCTIONS...\n";
        
        // Process the missing deductions
        $autoDeductionJob = new \App\Jobs\ProcessTextSessionAutoDeduction($session->id, $shouldHaveDeductions);
        $autoDeductionJob->handle();
        
        $session->refresh();
        $subscription->refresh();
        
        echo "✅ DEDUCTIONS PROCESSED\n";
        echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
        echo "   Sessions used: {$session->sessions_used}\n";
        echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n\n";
    } else {
        echo "✅ No missing deductions to process\n\n";
    }
    
    // Clear all pending queue jobs for this session
    echo "🧹 CLEARING PENDING QUEUE JOBS...\n";
    $deletedJobs = DB::table('jobs')->where('queue', 'text-sessions')->delete();
    echo "   Deleted {$deletedJobs} pending jobs\n\n";
    
    // Test manual ending now
    if ($session->status === 'active') {
        echo "🔧 TESTING MANUAL ENDING:\n";
        
        $endResult = $session->endManually('fix_session_96');
        
        if ($endResult) {
            echo "✅ Manual ending successful!\n";
            echo "   Final status: {$session->status}\n";
            echo "   Sessions used: {$session->sessions_used}\n";
        } else {
            echo "❌ Manual ending still failed\n";
            
            // Let's check why it's failing
            echo "   Debugging manual ending failure...\n";
            
            // Check if there are any issues with the session
            $session->refresh();
            echo "   Current status: {$session->status}\n";
            echo "   Sessions used: {$session->sessions_used}\n";
            echo "   Auto deductions processed: {$session->auto_deductions_processed}\n";
            
            // Check subscription
            $subscription->refresh();
            echo "   Subscription sessions remaining: {$subscription->text_sessions_remaining}\n";
            echo "   Subscription is active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
        }
        
        $subscription->refresh();
        echo "   Final subscription sessions remaining: {$subscription->text_sessions_remaining}\n";
    }
    
} catch (Exception $e) {
    echo "❌ FIX FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
