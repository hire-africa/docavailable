<?php

/**
 * Check Payment Status and Subscription Activation
 */

require_once 'vendor/autoload.php';

use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Models\User;

echo "🔍 CHECKING PAYMENT STATUS\n";
echo "==========================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Check recent payment transactions
    echo "1. Recent Payment Transactions:\n";
    echo "--------------------------------\n";
    $transactions = PaymentTransaction::orderBy('created_at', 'desc')->take(10)->get();
    
    if ($transactions->count() > 0) {
        foreach ($transactions as $transaction) {
            echo "ID: {$transaction->id}\n";
            echo "User ID: {$transaction->user_id}\n";
            echo "Amount: {$transaction->amount} {$transaction->currency}\n";
            echo "Status: {$transaction->status}\n";
            echo "Gateway: {$transaction->gateway}\n";
            echo "Reference: {$transaction->reference}\n";
            echo "Created: {$transaction->created_at}\n";
            echo "Metadata: " . json_encode($transaction->metadata) . "\n";
            echo "---\n";
        }
    } else {
        echo "❌ No payment transactions found\n";
    }
    
    // Check recent subscriptions
    echo "\n2. Recent Subscriptions:\n";
    echo "------------------------\n";
    $subscriptions = Subscription::orderBy('created_at', 'desc')->take(10)->get();
    
    if ($subscriptions->count() > 0) {
        foreach ($subscriptions as $subscription) {
            echo "ID: {$subscription->id}\n";
            echo "User ID: {$subscription->user_id}\n";
            echo "Plan ID: {$subscription->plan_id}\n";
            echo "Status: {$subscription->status}\n";
            echo "Is Active: " . ($subscription->is_active ? 'Yes' : 'No') . "\n";
            echo "Payment Status: {$subscription->payment_status}\n";
            echo "Text Sessions: {$subscription->text_sessions_remaining}\n";
            echo "Created: {$subscription->created_at}\n";
            echo "---\n";
        }
    } else {
        echo "❌ No subscriptions found\n";
    }
    
    // Check for failed payments
    echo "\n3. Failed Payment Analysis:\n";
    echo "---------------------------\n";
    $failedPayments = PaymentTransaction::where('status', '!=', 'completed')->get();
    
    if ($failedPayments->count() > 0) {
        echo "Found {$failedPayments->count()} non-completed payments:\n";
        foreach ($failedPayments as $payment) {
            echo "- Transaction {$payment->id}: {$payment->status} (User: {$payment->user_id})\n";
        }
    } else {
        echo "✅ All payments are completed\n";
    }
    
    // Check for users without active subscriptions
    echo "\n4. Users Without Active Subscriptions:\n";
    echo "--------------------------------------\n";
    $usersWithoutSubs = User::whereDoesntHave('subscription', function($query) {
        $query->where('is_active', true);
    })->where('role', 'patient')->get();
    
    if ($usersWithoutSubs->count() > 0) {
        echo "Found {$usersWithoutSubs->count()} patients without active subscriptions:\n";
        foreach ($usersWithoutSubs as $user) {
            echo "- User {$user->id}: {$user->email} ({$user->name})\n";
        }
    } else {
        echo "✅ All patients have active subscriptions\n";
    }
    
    echo "\n🎯 DIAGNOSIS COMPLETE\n";
    echo "====================\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
