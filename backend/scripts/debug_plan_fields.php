<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Models\PaymentTransaction;

echo "Debugging Plan fields and subscription creation...\n";

// Check if we can connect to the database
try {
    // Test Plan model
    $plan = Plan::find(5);
    if ($plan) {
        echo "✅ Plan 5 found:\n";
        echo "- Name: " . $plan->name . "\n";
        echo "- Price: " . $plan->price . "\n";
        echo "- Currency: " . $plan->currency . "\n";
        echo "- Text sessions: " . ($plan->text_sessions ?? 'NULL') . "\n";
        echo "- Voice calls: " . ($plan->voice_calls ?? 'NULL') . "\n";
        echo "- Video calls: " . ($plan->video_calls ?? 'NULL') . "\n";
        echo "- Duration: " . ($plan->duration ?? 'NULL') . "\n";
    } else {
        echo "❌ Plan 5 not found\n";
    }

    // Test User model
    $user = User::find(11);
    if ($user) {
        echo "✅ User 11 found: " . $user->first_name . " " . $user->last_name . "\n";
    } else {
        echo "❌ User 11 not found\n";
    }

    // Test subscription creation directly
    if ($user && $plan) {
        echo "\nTesting subscription creation...\n";
        
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
                'payment_transaction_id' => 'TEST_' . time(),
                'payment_gateway' => 'paychangu',
                'payment_status' => 'completed',
                'payment_metadata' => ['test' => true],
                'activated_at' => now(),
                'expires_at' => now()->addDays(30),
                'status' => 1,
                'is_active' => true,
            ]
        );

        echo "✅ Subscription created/updated successfully!\n";
        echo "- ID: " . $subscription->id . "\n";
        echo "- User ID: " . $subscription->user_id . "\n";
        echo "- Plan ID: " . $subscription->plan_id . "\n";
        echo "- Text sessions remaining: " . $subscription->text_sessions_remaining . "\n";
        echo "- Is active: " . ($subscription->is_active ? 'Yes' : 'No') . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== Database Connection Test ===\n";
echo "If the above worked, the database connection is fine.\n";
echo "The issue might be in the webhook processing logic.\n"; 