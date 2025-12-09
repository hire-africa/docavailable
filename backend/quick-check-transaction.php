<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING LATEST TRANSACTION\n";
echo "==============================\n\n";

try {
    // Get latest payment transaction
    $transaction = App\Models\PaymentTransaction::orderBy('created_at', 'desc')->first();
    
    if ($transaction) {
        echo "✅ LATEST TRANSACTION FOUND:\n";
        echo "ID: {$transaction->id}\n";
        echo "User ID: {$transaction->user_id}\n";
        echo "Amount: {$transaction->amount} {$transaction->currency}\n";
        echo "Status: {$transaction->status}\n";
        echo "Reference: {$transaction->transaction_reference}\n";
        echo "Created: {$transaction->created_at}\n";
        echo "Metadata: " . json_encode($transaction->metadata, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ NO TRANSACTIONS FOUND\n\n";
    }
    
    // Get latest subscription
    $subscription = App\Models\Subscription::orderBy('created_at', 'desc')->first();
    
    if ($subscription) {
        echo "✅ LATEST SUBSCRIPTION FOUND:\n";
        echo "ID: {$subscription->id}\n";
        echo "User ID: {$subscription->user_id}\n";
        echo "Plan ID: {$subscription->plan_id}\n";
        echo "Status: {$subscription->status}\n";
        echo "Is Active: " . ($subscription->is_active ? 'YES' : 'NO') . "\n";
        echo "Created: {$subscription->created_at}\n";
        echo "Payment Metadata: " . json_encode($subscription->payment_metadata, JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo "❌ NO SUBSCRIPTIONS FOUND\n\n";
    }
    
    // Check if they match
    if ($transaction && $subscription) {
        if ($transaction->user_id === $subscription->user_id) {
            echo "✅ Transaction and subscription are for the same user\n";
            if ($subscription->created_at >= $transaction->created_at) {
                echo "✅ Subscription was created after transaction - PAYMENT PROCESSED!\n";
            } else {
                echo "❌ Subscription was created before transaction - PAYMENT NOT PROCESSED!\n";
            }
        } else {
            echo "❌ Transaction and subscription are for different users\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
