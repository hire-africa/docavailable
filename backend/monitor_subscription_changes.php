<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

echo "🔍 Monitoring Subscription Changes...\n\n";

// 1. Check current subscription count
echo "📊 Current subscription count: " . Subscription::count() . "\n";

// 2. Check for any foreign key constraints that might cause cascading deletes
echo "\n🔗 Checking foreign key constraints...\n";
try {
    $constraints = DB::select("
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'subscriptions'
    ");
    
    foreach ($constraints as $constraint) {
        echo "  - {$constraint->constraint_name}: {$constraint->table_name}.{$constraint->column_name} -> {$constraint->foreign_table_name}.{$constraint->foreign_column_name} (DELETE: {$constraint->delete_rule})\n";
    }
} catch (Exception $e) {
    echo "❌ Error checking constraints: " . $e->getMessage() . "\n";
}

// 3. Check for any triggers that might affect subscriptions
echo "\n⚡ Checking for database triggers...\n";
try {
    $triggers = DB::select("
        SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'subscriptions'
    ");
    
    if (empty($triggers)) {
        echo "  ✅ No triggers found on subscriptions table\n";
    } else {
        foreach ($triggers as $trigger) {
            echo "  - {$trigger->trigger_name}: {$trigger->event_manipulation} on {$trigger->event_object_table}\n";
            echo "    Action: {$trigger->action_statement}\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking triggers: " . $e->getMessage() . "\n";
}

// 4. Create a test subscription and monitor it
echo "\n🧪 Creating test subscription to monitor...\n";
try {
    $user = User::where('user_type', 'patient')->first();
    $plan = Plan::first();
    
    if (!$user || !$plan) {
        echo "❌ No user or plan found for testing\n";
        exit(1);
    }
    
    echo "Using user: {$user->email} (ID: {$user->id})\n";
    echo "Using plan: {$plan->name} (ID: {$plan->id})\n";
    
    // Create test subscription
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
    
    // Monitor for 10 seconds
    echo "\n⏱️ Monitoring subscription for 10 seconds...\n";
    for ($i = 1; $i <= 10; $i++) {
        sleep(1);
        
        // Check if subscription still exists
        $subscription = Subscription::find($testSubscription->id);
        if ($subscription) {
            echo "  {$i}s: Subscription still exists (ID: {$subscription->id})\n";
        } else {
            echo "  {$i}s: ❌ Subscription DISAPPEARED!\n";
            
            // Check what happened
            echo "  🔍 Investigating disappearance...\n";
            
            // Check if user was deleted
            $user = User::find($testSubscription->user_id);
            if (!$user) {
                echo "  ❌ User was deleted - this would cause cascading delete\n";
            } else {
                echo "  ✅ User still exists\n";
            }
            
            // Check if plan was deleted
            $plan = Plan::find($testSubscription->plan_id);
            if (!$plan) {
                echo "  ❌ Plan was deleted - this would cause cascading delete\n";
            } else {
                echo "  ✅ Plan still exists\n";
            }
            
            // Check database logs or recent queries
            echo "  📋 Checking recent database activity...\n";
            
            break;
        }
    }
    
    // Final check
    $finalSubscription = Subscription::find($testSubscription->id);
    if ($finalSubscription) {
        echo "\n✅ Test subscription survived monitoring period\n";
        echo "Final subscription status:\n";
        echo "  - ID: {$finalSubscription->id}\n";
        echo "  - User ID: {$finalSubscription->user_id}\n";
        echo "  - Plan ID: {$finalSubscription->plan_id}\n";
        echo "  - Is Active: " . ($finalSubscription->is_active ? 'Yes' : 'No') . "\n";
        echo "  - Status: {$finalSubscription->status}\n";
    } else {
        echo "\n❌ Test subscription disappeared during monitoring\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error during monitoring: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n✅ Subscription monitoring complete!\n";

