<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\DB;

echo "🔄 Subscription Recovery Script...\n\n";

// 1. Check for users who should have subscriptions but don't
echo "1. Checking for users without subscriptions...\n";
$usersWithoutSubscriptions = User::where('user_type', 'patient')
    ->whereDoesntHave('subscription')
    ->get();

echo "Found " . $usersWithoutSubscriptions->count() . " users without subscriptions\n";

foreach ($usersWithoutSubscriptions as $user) {
    echo "  - User {$user->id}: {$user->email}\n";
}

// 2. Check for payment transactions that should have created subscriptions
echo "\n2. Checking payment transactions...\n";
$paymentTransactions = PaymentTransaction::where('status', 'completed')
    ->whereNotNull('webhook_data')
    ->get();

echo "Found " . $paymentTransactions->count() . " completed payment transactions\n";

$recoveredCount = 0;

foreach ($paymentTransactions as $transaction) {
    $webhookData = $transaction->webhook_data;
    $userId = $webhookData['meta']['user_id'] ?? null;
    $planId = $webhookData['meta']['plan_id'] ?? null;
    
    if ($userId) {
        $user = User::find($userId);
        if ($user && !$user->subscription) {
            echo "  - Transaction {$transaction->transaction_id}: User {$userId} has no subscription\n";
            
            // Try to recover subscription
            $plan = null;
            if ($planId) {
                $plan = Plan::find($planId);
            }
            
            if ($plan) {
                echo "    Attempting to recover subscription with plan {$plan->name}...\n";
                
                try {
                    $subscription = Subscription::create([
                        'user_id' => $userId,
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
                        'start_date' => $transaction->created_at,
                        'end_date' => $transaction->created_at->addDays($plan->duration ?? 30),
                        'status' => 1,
                        'is_active' => true,
                        'activated_at' => $transaction->created_at,
                        'payment_transaction_id' => $transaction->transaction_id,
                        'payment_gateway' => $transaction->gateway,
                        'payment_status' => 'completed',
                        'payment_metadata' => $webhookData
                    ]);
                    
                    echo "    ✅ Recovered subscription ID: {$subscription->id}\n";
                    $recoveredCount++;
                    
                } catch (Exception $e) {
                    echo "    ❌ Failed to recover subscription: " . $e->getMessage() . "\n";
                }
            } else {
                echo "    ⚠️ No plan found for recovery\n";
            }
        }
    }
}

// 3. Check for orphaned subscriptions (subscriptions without users)
echo "\n3. Checking for orphaned subscriptions...\n";
$orphanedSubscriptions = Subscription::whereDoesntHave('user')->get();
echo "Found " . $orphanedSubscriptions->count() . " orphaned subscriptions\n";

if ($orphanedSubscriptions->count() > 0) {
    echo "Orphaned subscription IDs:\n";
    foreach ($orphanedSubscriptions as $sub) {
        echo "  - ID: {$sub->id}, User ID: {$sub->user_id}\n";
    }
}

// 4. Summary
echo "\n📊 Recovery Summary:\n";
echo "  - Users without subscriptions: " . $usersWithoutSubscriptions->count() . "\n";
echo "  - Completed payment transactions: " . $paymentTransactions->count() . "\n";
echo "  - Subscriptions recovered: {$recoveredCount}\n";
echo "  - Orphaned subscriptions: " . $orphanedSubscriptions->count() . "\n";

echo "\n✅ Recovery script complete!\n";

