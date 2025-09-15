<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Services\DoctorPaymentService;

echo "🔍 INVESTIGATING SESSION 84\n";
echo "==========================\n\n";

// Find session 84
$session = TextSession::find(84);

if (!$session) {
    echo "❌ Session 84 not found!\n";
    exit(1);
}

echo "✅ Session 84 found!\n\n";

// Get detailed session status
$statusDetails = $session->getSessionStatusDetails();

echo "📊 SESSION DETAILS:\n";
echo "==================\n";
echo "Session ID: {$statusDetails['session_id']}\n";
echo "Status: {$statusDetails['status']}\n";
echo "Started at: {$statusDetails['started_at']}\n";
echo "Activated at: {$statusDetails['activated_at']}\n";
echo "Ended at: " . ($statusDetails['ended_at'] ?? 'NOT ENDED') . "\n";
echo "Elapsed minutes: {$statusDetails['elapsed_minutes']}\n";
echo "Total allowed minutes: {$statusDetails['total_allowed_minutes']}\n";
echo "Remaining time minutes: {$statusDetails['remaining_time_minutes']}\n";
echo "Sessions remaining before start: {$statusDetails['sessions_remaining_before_start']}\n";
echo "Sessions used: {$statusDetails['sessions_used']}\n";
echo "Auto deductions processed: {$statusDetails['auto_deductions_processed']}\n";
echo "Remaining sessions: {$statusDetails['remaining_sessions']}\n";
echo "Has run out of time: " . ($statusDetails['has_run_out_of_time'] ? 'YES' : 'NO') . "\n";
echo "Should auto end: " . ($statusDetails['should_auto_end'] ? 'YES' : 'NO') . "\n";
echo "Should auto end insufficient sessions: " . ($statusDetails['should_auto_end_insufficient_sessions'] ? 'YES' : 'NO') . "\n";
echo "Next deduction time: " . ($statusDetails['next_deduction_time'] ?? 'N/A') . "\n";
echo "Time until next deduction: {$statusDetails['time_until_next_deduction']} minutes\n\n";

// Check patient subscription
$patient = $session->patient;
if ($patient && $patient->subscription) {
    $subscription = $patient->subscription;
    echo "👤 PATIENT SUBSCRIPTION:\n";
    echo "========================\n";
    echo "Patient ID: {$patient->id}\n";
    echo "Patient Name: {$patient->first_name} {$patient->last_name}\n";
    echo "Subscription ID: {$subscription->id}\n";
    echo "Subscription Status: {$subscription->status}\n";
    echo "Is Active: " . ($subscription->isActive ? 'YES' : 'NO') . "\n";
    echo "Text Sessions Remaining: {$subscription->text_sessions_remaining}\n";
    echo "Total Text Sessions: {$subscription->total_text_sessions}\n\n";
} else {
    echo "❌ Patient has no subscription!\n\n";
}

// Check if session should have deductions
echo "🔍 DEDUCTION ANALYSIS:\n";
echo "=====================\n";

$elapsedMinutes = $session->getElapsedMinutes();
$expectedAutoDeductions = floor($elapsedMinutes / 10);
$actualAutoDeductions = $session->auto_deductions_processed ?? 0;

echo "Elapsed minutes: {$elapsedMinutes}\n";
echo "Expected auto-deductions: {$expectedAutoDeductions}\n";
echo "Actual auto-deductions processed: {$actualAutoDeductions}\n";
echo "Missing auto-deductions: " . ($expectedAutoDeductions - $actualAutoDeductions) . "\n\n";

// Check why auto-deductions haven't happened
if ($expectedAutoDeductions > $actualAutoDeductions) {
    echo "⚠️  AUTO-DEDUCTION ISSUE DETECTED!\n";
    echo "================================\n";
    
    // Check if session is active
    if ($session->status !== TextSession::STATUS_ACTIVE) {
        echo "❌ Session is not active (status: {$session->status})\n";
        echo "   Auto-deductions only happen for active sessions\n";
    }
    
    // Check if session has been activated
    if (!$session->activated_at) {
        echo "❌ Session has not been activated yet\n";
        echo "   Auto-deductions only start from activation point\n";
    }
    
    // Check if patient has sessions remaining
    if ($patient && $patient->subscription) {
        if ($patient->subscription->text_sessions_remaining <= 0) {
            echo "❌ Patient has no sessions remaining\n";
            echo "   Auto-deductions cannot happen with 0 sessions\n";
        }
    }
    
    // Check if subscription is active
    if ($patient && $patient->subscription && !$patient->subscription->isActive) {
        echo "❌ Patient subscription is not active\n";
        echo "   Auto-deductions cannot happen with inactive subscription\n";
    }
    
    echo "\n";
}

// Test manual auto-deduction
echo "🧪 TESTING MANUAL AUTO-DEDUCTION:\n";
echo "=================================\n";

$paymentService = new DoctorPaymentService();
$result = $paymentService->processAutoDeduction($session);

echo "Manual auto-deduction result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n";

if ($result) {
    echo "✅ Auto-deduction processed successfully\n";
    
    // Refresh session data
    $session->refresh();
    $newStatusDetails = $session->getSessionStatusDetails();
    
    echo "Updated auto deductions processed: {$newStatusDetails['auto_deductions_processed']}\n";
    echo "Updated sessions used: {$newStatusDetails['sessions_used']}\n";
    
    if ($patient && $patient->subscription) {
        $patient->subscription->refresh();
        echo "Updated sessions remaining: {$patient->subscription->text_sessions_remaining}\n";
    }
} else {
    echo "❌ Auto-deduction failed\n";
    echo "   This could be due to insufficient sessions or inactive subscription\n";
}

echo "\n🎯 DIAGNOSIS COMPLETE\n";
