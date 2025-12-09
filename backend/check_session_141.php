<?php

require_once 'vendor/autoload.php';

use App\Models\TextSession;
use App\Models\User;
use App\Services\DoctorPaymentService;

// Initialize Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING SESSION 141 - AUTO-DETECTION DIAGNOSIS\n";
echo "==================================================\n\n";

try {
    // 1. Get session 141
    $session = TextSession::with(['patient', 'doctor', 'patient.subscription'])->find(141);
    
    if (!$session) {
        echo "❌ Session 141 not found!\n";
        return;
    }
    
    echo "📋 SESSION 141 DETAILS:\n";
    echo "=======================\n";
    echo "Session ID: {$session->id}\n";
    echo "Status: {$session->status}\n";
    echo "Started at: {$session->started_at}\n";
    echo "Activated at: " . ($session->activated_at ? $session->activated_at : 'NOT ACTIVATED') . "\n";
    echo "Ended at: " . ($session->ended_at ? $session->ended_at : 'NOT ENDED') . "\n";
    echo "Last activity: {$session->last_activity_at}\n";
    echo "Sessions used: {$session->sessions_used}\n";
    echo "Auto deductions processed: " . ($session->auto_deductions_processed ? $session->auto_deductions_processed : '0') . "\n";
    echo "Sessions remaining before start: {$session->sessions_remaining_before_start}\n";
    
    // Patient details
    if ($session->patient) {
        echo "\n👤 PATIENT DETAILS:\n";
        echo "Patient ID: {$session->patient->id}\n";
        echo "Patient Name: {$session->patient->name}\n";
        echo "Patient Email: {$session->patient->email}\n";
        
        if ($session->patient->subscription) {
            echo "Subscription Active: " . ($session->patient->subscription->is_active ? 'YES' : 'NO') . "\n";
            echo "Text Sessions Remaining: {$session->patient->subscription->text_sessions_remaining}\n";
            echo "Subscription Activated: {$session->patient->subscription->activated_at}\n";
            echo "Subscription Expires: {$session->patient->subscription->expires_at}\n";
        } else {
            echo "❌ No subscription found for patient!\n";
        }
    } else {
        echo "❌ No patient found for session!\n";
    }
    
    // Doctor details
    if ($session->doctor) {
        echo "\n👨‍⚕️ DOCTOR DETAILS:\n";
        echo "Doctor ID: {$session->doctor->id}\n";
        echo "Doctor Name: {$session->doctor->name}\n";
        echo "Doctor Email: {$session->doctor->email}\n";
    } else {
        echo "❌ No doctor found for session!\n";
    }
    
    // 2. Calculate elapsed time and expected deductions
    echo "\n⏰ TIME ANALYSIS:\n";
    echo "================\n";
    
    $elapsedMinutes = $session->getElapsedMinutes();
    $expectedDeductions = floor($elapsedMinutes / 10);
    $actualDeductions = $session->auto_deductions_processed ?? 0;
    
    echo "Elapsed minutes since activation: {$elapsedMinutes}\n";
    echo "Expected auto-deductions: {$expectedDeductions}\n";
    echo "Actual auto-deductions processed: {$actualDeductions}\n";
    echo "Missing deductions: " . ($expectedDeductions - $actualDeductions) . "\n";
    
    // 3. Check session status details
    echo "\n🔍 SESSION STATUS ANALYSIS:\n";
    echo "==========================\n";
    
    $statusDetails = $session->getSessionStatusDetails();
    echo "Should auto end: " . ($session->shouldAutoEnd() ? 'YES' : 'NO') . "\n";
    echo "Should auto end insufficient sessions: " . ($session->shouldAutoEndDueToInsufficientSessions() ? 'YES' : 'NO') . "\n";
    echo "Has run out of time: " . ($session->hasRunOutOfTime() ? 'YES' : 'NO') . "\n";
    echo "Remaining time minutes: {$session->getRemainingTimeMinutes()}\n";
    echo "Total allowed minutes: {$session->getTotalAllowedMinutes()}\n";
    
    // 4. Check why auto-deductions haven't happened
    if ($expectedDeductions > $actualDeductions) {
        echo "\n⚠️  AUTO-DEDUCTION ISSUE DETECTED!\n";
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
        if ($session->patient && $session->patient->subscription) {
            if ($session->patient->subscription->text_sessions_remaining <= 0) {
                echo "❌ Patient has no sessions remaining\n";
                echo "   Auto-deductions cannot happen with 0 sessions\n";
            }
        }
        
        // Check if subscription is active
        if ($session->patient && $session->patient->subscription && !$session->patient->subscription->is_active) {
            echo "❌ Patient subscription is not active\n";
            echo "   Auto-deductions cannot happen with inactive subscription\n";
        }
        
        echo "\n";
    }
    
    // 5. Test manual auto-deduction
    echo "🧪 TESTING MANUAL AUTO-DEDUCTION:\n";
    echo "=================================\n";
    
    $paymentService = new DoctorPaymentService();
    $result = $paymentService->processAutoDeduction($session);
    
    echo "Manual auto-deduction result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n";
    
    if ($result) {
        echo "✅ Auto-deduction processed successfully\n";
        
        // Refresh session data
        $session->refresh();
        if ($session->patient && $session->patient->subscription) {
            $session->patient->subscription->refresh();
        }
        
        echo "Updated sessions used: {$session->sessions_used}\n";
        echo "Updated auto deductions processed: {$session->auto_deductions_processed}\n";
        if ($session->patient && $session->patient->subscription) {
            echo "Updated sessions remaining: {$session->patient->subscription->text_sessions_remaining}\n";
        }
    } else {
        echo "❌ Auto-deduction failed\n";
    }
    
    // 6. Test the checkResponse endpoint
    echo "\n🧪 TESTING CHECK-RESPONSE ENDPOINT:\n";
    echo "===================================\n";
    
    // Authenticate as the patient
    auth()->login($session->patient);
    
    $controller = new \App\Http\Controllers\TextSessionController();
    $response = $controller->checkResponse($session->id);
    $responseData = json_decode($response->getContent(), true);
    
    echo "Check-response result:\n";
    echo "  Status: {$responseData['status']}\n";
    echo "  Message: {$responseData['message']}\n";
    echo "  Success: " . ($responseData['success'] ? 'true' : 'false') . "\n";
    
    // Refresh session after check-response
    $session->refresh();
    if ($session->patient && $session->patient->subscription) {
        $session->patient->subscription->refresh();
    }
    
    echo "After check-response:\n";
    echo "  Sessions used: {$session->sessions_used}\n";
    echo "  Auto deductions processed: {$session->auto_deductions_processed}\n";
    if ($session->patient && $session->patient->subscription) {
        echo "  Sessions remaining: {$session->patient->subscription->text_sessions_remaining}\n";
    }
    
    echo "\n🎉 SESSION 141 DIAGNOSIS COMPLETED!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
