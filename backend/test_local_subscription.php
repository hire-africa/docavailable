<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;

echo "🧪 Testing Local Subscription Functionality...\n\n";

// 1. Check if we have any plans
echo "📋 Checking plans...\n";
$plans = Plan::all();
echo "Total plans: " . $plans->count() . "\n";
foreach ($plans as $plan) {
    echo "  - Plan {$plan->id}: {$plan->name} (\${$plan->price} {$plan->currency})\n";
}

// 2. Get a test user
echo "\n👤 Getting test user...\n";
$user = User::where('user_type', 'patient')->first();
if (!$user) {
    echo "❌ No patient users found\n";
    exit(1);
}
echo "Using user: {$user->email} (ID: {$user->id})\n";

// 3. Check current subscription
echo "\n📊 Checking current subscription...\n";
$subscription = $user->subscription;
if ($subscription) {
    echo "✅ User has subscription:\n";
    echo "  - ID: {$subscription->id}\n";
    echo "  - Plan: {$subscription->plan_name}\n";
    echo "  - Active: " . ($subscription->is_active ? 'Yes' : 'No') . "\n";
    echo "  - Text sessions remaining: {$subscription->text_sessions_remaining}\n";
    echo "  - Voice calls remaining: {$subscription->voice_calls_remaining}\n";
    echo "  - Video calls remaining: {$subscription->video_calls_remaining}\n";
    echo "  - Start date: {$subscription->start_date}\n";
    echo "  - End date: {$subscription->end_date}\n";
    echo "  - Status: {$subscription->status}\n";
} else {
    echo "❌ User has no subscription\n";
}

// 4. Test the subscription API endpoint logic
echo "\n🌐 Testing subscription API endpoint logic...\n";
try {
    // Simulate the API endpoint logic
    $userForApi = User::find($user->id);
    $subscriptionForApi = $userForApi->subscription;
    
    if (!$subscriptionForApi) {
        echo "API would return: No subscription found\n";
    } else {
        echo "API would return subscription data:\n";
        $responseData = [
            'id' => $subscriptionForApi->id,
            'plan_id' => $subscriptionForApi->plan_id,
            'planName' => $subscriptionForApi->plan_name,
            'plan_price' => $subscriptionForApi->plan_price,
            'plan_currency' => $subscriptionForApi->plan_currency,
            'textSessionsRemaining' => $subscriptionForApi->text_sessions_remaining,
            'voiceCallsRemaining' => $subscriptionForApi->voice_calls_remaining,
            'videoCallsRemaining' => $subscriptionForApi->video_calls_remaining,
            'totalTextSessions' => $subscriptionForApi->total_text_sessions,
            'totalVoiceCalls' => $subscriptionForApi->total_voice_calls,
            'totalVideoCalls' => $subscriptionForApi->total_video_calls,
            'activatedAt' => $subscriptionForApi->activated_at,
            'expiresAt' => $subscriptionForApi->expires_at,
            'isActive' => $subscriptionForApi->is_active,
            'status' => $subscriptionForApi->status,
            'start_date' => $subscriptionForApi->start_date,
            'end_date' => $subscriptionForApi->end_date
        ];
        
        foreach ($responseData as $key => $value) {
            echo "  - {$key}: " . (is_bool($value) ? ($value ? 'true' : 'false') : $value) . "\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error testing API logic: " . $e->getMessage() . "\n";
}

// 5. Create a test subscription if none exists
if (!$subscription) {
    echo "\n🔧 Creating test subscription...\n";
    try {
        $plan = Plan::first();
        if (!$plan) {
            echo "❌ No plans found, cannot create subscription\n";
        } else {
            $testSubscription = Subscription::create([
                'user_id' => $user->id,
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
                'start_date' => now(),
                'end_date' => now()->addDays(30),
                'status' => 1,
                'is_active' => true,
                'activated_at' => now()
            ]);
            
            echo "✅ Test subscription created (ID: {$testSubscription->id})\n";
            
            // Test the relationship again
            $user->refresh();
            $newSubscription = $user->subscription;
            echo "✅ Relationship test: " . ($newSubscription ? "Found subscription" : "No subscription") . "\n";
        }
    } catch (Exception $e) {
        echo "❌ Error creating test subscription: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Local subscription test complete!\n";
