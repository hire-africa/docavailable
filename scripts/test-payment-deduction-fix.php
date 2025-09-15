<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use App\Services\DoctorPaymentService;
use Carbon\Carbon;

echo "🧪 TESTING PAYMENT & DEDUCTION FIX\n";
echo "==================================\n\n";

// Test 1: Create a session and test auto-deduction
echo "📋 TEST 1: Auto-deduction tracking\n";
echo "-----------------------------------\n";

try {
    // Find test users
    $patient = User::where('user_type', 'patient')->first();
    $doctor = User::where('user_type', 'doctor')->first();
    
    if (!$patient || !$doctor) {
        echo "❌ Need test users\n";
        exit(1);
    }
    
    echo "✅ Using Patient: {$patient->first_name} {$patient->last_name} (ID: {$patient->id})\n";
    echo "✅ Using Doctor: {$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})\n\n";
    
    // Create session with 3 sessions remaining (30 minutes)
    $session = TextSession::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'status' => TextSession::STATUS_ACTIVE,
        'started_at' => now()->subMinutes(25), // 25 minutes ago
        'last_activity_at' => now(),
        'sessions_used' => 0,
        'sessions_remaining_before_start' => 3,
        'auto_deductions_processed' => 0,
        'reason' => 'Payment test'
    ]);
    
    echo "✅ Created test session ID: {$session->id}\n";
    echo "   Started: 25 minutes ago\n";
    echo "   Sessions remaining: 3\n";
    echo "   Auto-deductions processed: 0\n\n";
    
    // Test auto-deduction
    $paymentService = new DoctorPaymentService();
    
    echo "🔄 Running auto-deduction...\n";
    $result1 = $paymentService->processAutoDeduction($session);
    echo "   Result: " . ($result1 ? 'SUCCESS' : 'FAILED') . "\n";
    
    $session->refresh();
    echo "   Auto-deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions used: {$session->sessions_used}\n";
    
    // Test second auto-deduction (should not deduct again)
    echo "\n🔄 Running auto-deduction again...\n";
    $result2 = $paymentService->processAutoDeduction($session);
    echo "   Result: " . ($result2 ? 'SUCCESS' : 'FAILED') . "\n";
    
    $session->refresh();
    echo "   Auto-deductions processed: {$session->auto_deductions_processed}\n";
    echo "   Sessions used: {$session->sessions_used}\n\n";
    
    // Test session end
    echo "📋 TEST 2: Session end payment\n";
    echo "------------------------------\n";
    
    echo "🔄 Ending session...\n";
    $endResult = $paymentService->processSessionEnd($session, true);
    
    echo "   Doctor payment: " . ($endResult['doctor_payment_success'] ? 'SUCCESS' : 'FAILED') . "\n";
    echo "   Patient deduction: " . ($endResult['patient_deduction_success'] ? 'SUCCESS' : 'FAILED') . "\n";
    echo "   Sessions deducted: {$endResult['patient_sessions_deducted']}\n";
    echo "   Doctor payment amount: {$endResult['doctor_payment_amount']}\n";
    echo "   Auto-deductions: {$endResult['auto_deductions']}\n";
    echo "   Manual deduction: {$endResult['manual_deduction']}\n";
    
    if (!empty($endResult['errors'])) {
        echo "   Errors:\n";
        foreach ($endResult['errors'] as $error) {
            echo "     - {$error}\n";
        }
    }
    
    // Cleanup
    $session->delete();
    echo "\n✅ Test completed and cleaned up\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    exit(1);
}
