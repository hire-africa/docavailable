<?php

/**
 * Check Latest Transaction
 * Check the most recent payment transaction to see if it was processed
 */

require_once 'vendor/autoload.php';

use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Models\User;

echo "🔍 CHECKING LATEST TRANSACTION\n";
echo "==============================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Get the latest payment transaction
    echo "1. LATEST PAYMENT TRANSACTION:\n";
    echo "==============================\n";
    
    $latestTransaction = PaymentTransaction::orderBy('created_at', 'desc')->first();
    
    if ($latestTransaction) {
        echo "Transaction ID: {$latestTransaction->id}\n";
        echo "User ID: {$latestTransaction->user_id}\n";
        echo "Amount: {$latestTransaction->amount}\n";
        echo "Currency: {$latestTransaction->currency}\n";
        echo "Status: {$latestTransaction->status}\n";
        echo "Transaction Reference: {$latestTransaction->transaction_reference}\n";
        echo "Created: {$latestTransaction->created_at}\n";
        echo "Updated: {$latestTransaction->updated_at}\n";
        echo "Metadata: " . json_encode($latestTransaction->metadata, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ No payment transactions found\n\n";
    }
    
    // Get the latest subscription
    echo "2. LATEST SUBSCRIPTION:\n";
    echo "=======================\n";
    
    $latestSubscription = Subscription::orderBy('created_at', 'desc')->first();
    
    if ($latestSubscription) {
        echo "Subscription ID: {$latestSubscription->id}\n";
        echo "User ID: {$latestSubscription->user_id}\n";
        echo "Plan ID: {$latestSubscription->plan_id}\n";
        echo "Status: {$latestSubscription->status}\n";
        echo "Is Active: " . ($latestSubscription->is_active ? 'YES' : 'NO') . "\n";
        echo "Start Date: {$latestSubscription->start_date}\n";
        echo "End Date: {$latestSubscription->end_date}\n";
        echo "Text Sessions Remaining: {$latestSubscription->text_sessions_remaining}\n";
        echo "Voice Calls Remaining: {$latestSubscription->voice_calls_remaining}\n";
        echo "Video Calls Remaining: {$latestSubscription->video_calls_remaining}\n";
        echo "Created: {$latestSubscription->created_at}\n";
        echo "Updated: {$latestSubscription->updated_at}\n";
        echo "Payment Metadata: " . json_encode($latestSubscription->payment_metadata, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ No subscriptions found\n\n";
    }
    
    // Check if the latest transaction has a corresponding subscription
    if ($latestTransaction && $latestSubscription) {
        echo "3. TRANSACTION-SUBSCRIPTION LINK:\n";
        echo "=================================\n";
        
        if ($latestTransaction->user_id === $latestSubscription->user_id) {
            echo "✅ Transaction and subscription are for the same user\n";
            
            // Check if subscription was created after transaction
            if ($latestSubscription->created_at >= $latestTransaction->created_at) {
                echo "✅ Subscription was created after transaction\n";
                echo "✅ Payment processing appears to have worked\n";
            } else {
                echo "❌ Subscription was created before transaction\n";
                echo "❌ Payment processing may have failed\n";
            }
        } else {
            echo "❌ Transaction and subscription are for different users\n";
        }
        
        echo "\n";
    }
    
    // Get all recent transactions (last 5)
    echo "4. RECENT TRANSACTIONS (LAST 5):\n";
    echo "=================================\n";
    
    $recentTransactions = PaymentTransaction::orderBy('created_at', 'desc')->limit(5)->get();
    
    foreach ($recentTransactions as $index => $transaction) {
        echo ($index + 1) . ". Transaction ID: {$transaction->id}\n";
        echo "   User ID: {$transaction->user_id}\n";
        echo "   Amount: {$transaction->amount} {$transaction->currency}\n";
        echo "   Status: {$transaction->status}\n";
        echo "   Reference: {$transaction->transaction_reference}\n";
        echo "   Created: {$transaction->created_at}\n";
        echo "   Metadata: " . json_encode($transaction->metadata, JSON_PRETTY_PRINT) . "\n\n";
    }
    
    // Get all recent subscriptions (last 5)
    echo "5. RECENT SUBSCRIPTIONS (LAST 5):\n";
    echo "==================================\n";
    
    $recentSubscriptions = Subscription::orderBy('created_at', 'desc')->limit(5)->get();
    
    foreach ($recentSubscriptions as $index => $subscription) {
        echo ($index + 1) . ". Subscription ID: {$subscription->id}\n";
        echo "   User ID: {$subscription->user_id}\n";
        echo "   Plan ID: {$subscription->plan_id}\n";
        echo "   Status: {$subscription->status}\n";
        echo "   Is Active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
        echo "   Created: {$subscription->created_at}\n";
        echo "   Payment Metadata: " . json_encode($subscription->payment_metadata, JSON_PRETTY_PRINT) . "\n\n";
    }
    
    echo "🎉 CHECK COMPLETED\n";
    echo "==================\n";
    
} catch (\Exception $e) {
    echo "❌ Check failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
