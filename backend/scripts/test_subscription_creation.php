<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\User;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\PaymentTransaction;

// Test subscription creation
$user = User::find(11); // Use the user from your subscription data
$plan = Plan::find(5); // Use the plan from your subscription data

if (!$user || !$plan) {
    echo "User or Plan not found\n";
    exit;
}

// Create a test payment transaction
$transaction = PaymentTransaction::create([
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'TEST_REF_' . time(),
    'amount' => 50.00,
    'currency' => 'USD',
    'status' => 'completed',
    'payment_method' => 'mobile_money',
    'gateway' => 'paychangu',
    'webhook_data' => [
        'meta' => [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
        ]
    ]
]);

// Test subscription creation
$subscription = Subscription::updateOrCreate(
    ['user_id' => $user->id],
    [
        'start_date' => now(),
        'end_date' => now()->addDays(30),
        'plan_id' => $plan->id,
        'plan_name' => $plan->name,
        'plan_price' => $plan->price,
        'plan_currency' => $plan->currency,
        'text_sessions_remaining' => $plan->text_sessions ?? 10,
        'voice_calls_remaining' => $plan->voice_calls ?? 2,
        'video_calls_remaining' => $plan->video_calls ?? 1,
        'total_text_sessions' => $plan->text_sessions ?? 10,
        'total_voice_calls' => $plan->voice_calls ?? 2,
        'total_video_calls' => $plan->video_calls ?? 1,
        'payment_transaction_id' => $transaction->transaction_id,
        'payment_gateway' => 'paychangu',
        'payment_status' => 'completed',
        'payment_metadata' => $transaction->webhook_data,
        'activated_at' => now(),
        'expires_at' => now()->addDays(30),
        'status' => 1,
        'is_active' => true,
    ]
);

echo "Subscription created successfully: " . $subscription->id . "\n";
echo "User: " . $user->id . "\n";
echo "Plan: " . $plan->id . "\n";
echo "Text sessions remaining: " . $subscription->text_sessions_remaining . "\n"; 