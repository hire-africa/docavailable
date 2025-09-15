<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TextSession;
use App\Models\User;
use App\Models\DoctorWallet;
use App\Models\WalletTransaction;

echo "�� CHECKING SESSION 81 DETAILED STATUS\n";
echo "=====================================\n\n";

// Check if session exists
$session = TextSession::find(81);

if (!$session) {
    echo "❌ Session 81 does not exist!\n";
    exit(1);
}

echo "✅ Session 81 found:\n";
echo "  ID: {$session->id}\n";
echo "  Status: {$session->status}\n";
echo "  Patient ID: {$session->patient_id}\n";
echo "  Doctor ID: {$session->doctor_id}\n";
echo "  Started At: {$session->started_at}\n";
echo "  Ended At: " . ($session->ended_at ? $session->ended_at : 'NOT SET') . "\n";
echo "  Sessions Remaining Before Start: {$session->sessions_remaining_before_start}\n";
echo "  Sessions Used: {$session->sessions_used}\n";
echo "  Auto Deductions Processed: " . ($session->auto_deductions_processed ? $session->auto_deductions_processed : '0') . "\n\n";

// Check if the users exist
$patient = User::find($session->patient_id);
$doctor = User::find($session->doctor_id);

echo "👥 User Information:\n";
echo "  Patient: " . ($patient ? "{$patient->first_name} {$patient->last_name} (ID: {$patient->id})" : "NOT FOUND") . "\n";
echo "  Doctor: " . ($doctor ? "{$doctor->first_name} {$doctor->last_name} (ID: {$doctor->id})" : "NOT FOUND") . "\n\n";

// Check patient subscription
if ($patient && $patient->subscription) {
    echo "📋 Patient Subscription:\n";
    echo "  Text Sessions Remaining: {$patient->subscription->text_sessions_remaining}\n";
    echo "  Total Text Sessions: {$patient->subscription->total_text_sessions}\n";
    echo "  Status: " . ($patient->subscription->isActive ? 'Active' : 'Inactive') . "\n\n";
} else {
    echo "❌ Patient has no subscription!\n\n";
}

// Check doctor wallet and transactions
if ($doctor) {
    $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
    
    if ($wallet) {
        echo "💰 Doctor Wallet:\n";
        echo "  Balance: {$wallet->balance}\n";
        echo "  Currency: {$wallet->currency}\n\n";
        
        // Check for transactions related to this session
        $transactions = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('session_type', 'text')
            ->where('session_table', 'text_sessions')
            ->where('session_id', $session->id)
            ->get();
        
        echo "💳 Wallet Transactions for Session 81:\n";
        if ($transactions->isEmpty()) {
            echo "  ❌ No transactions found for this session!\n";
        } else {
            foreach ($transactions as $transaction) {
                echo "  ✅ Transaction ID: {$transaction->id}\n";
                echo "     Amount: {$transaction->amount}\n";
                echo "     Type: {$transaction->type}\n";
                echo "     Description: {$transaction->description}\n";
                echo "     Created: {$transaction->created_at}\n\n";
            }
        }
    } else {
        echo "❌ Doctor has no wallet!\n\n";
    }
}

// Calculate what should have been deducted
echo "🧮 Expected Deductions:\n";
$elapsedMinutes = $session->getElapsedMinutes();
$totalAllowedMinutes = $session->getTotalAllowedMinutes();
$remainingTimeMinutes = $session->getRemainingTimeMinutes();
$sessionsToDeduct = $session->getSessionsToDeduct(true); // Manual end

echo "  Elapsed Minutes: {$elapsedMinutes}\n";
echo "  Total Allowed Minutes: {$totalAllowedMinutes}\n";
echo "  Remaining Time Minutes: {$remainingTimeMinutes}\n";
echo "  Sessions To Deduct: {$sessionsToDeduct}\n";
echo "  Auto Deductions: " . floor($elapsedMinutes / 10) . "\n";
echo "  Manual Deduction: 1\n\n";

// Test payment processing
echo "🔧 Testing Payment Processing:\n";
try {
    $paymentService = new \App\Services\DoctorPaymentService();
    $paymentResult = $paymentService->processSessionEnd($session, true);
    
    echo "  Doctor Payment Success: " . ($paymentResult['doctor_payment_success'] ? 'YES' : 'NO') . "\n";
    echo "  Patient Deduction Success: " . ($paymentResult['patient_deduction_success'] ? 'YES' : 'NO') . "\n";
    echo "  Sessions Deducted: {$paymentResult['patient_sessions_deducted']}\n";
    echo "  Doctor Payment Amount: {$paymentResult['doctor_payment_amount']}\n";
    
    if (!empty($paymentResult['errors'])) {
        echo "  Errors:\n";
        foreach ($paymentResult['errors'] as $error) {
            echo "    - {$error}\n";
        }
    }
} catch (\Exception $e) {
    echo "  ❌ Error testing payment processing: {$e->getMessage()}\n";
}

echo "\n✅ Session 81 analysis complete!\n";
