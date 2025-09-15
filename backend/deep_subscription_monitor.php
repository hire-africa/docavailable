<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "🔍 Deep Subscription Monitoring Started...\n";
echo "Press Ctrl+C to stop monitoring\n\n";

// Get initial subscription count
$initialCount = Subscription::count();
echo "📊 Initial subscription count: {$initialCount}\n";

// Get all current subscriptions
$subscriptions = Subscription::all(['id', 'user_id', 'plan_id', 'is_active', 'status', 'created_at']);
echo "📋 Current subscriptions:\n";
foreach ($subscriptions as $sub) {
    echo "  - ID: {$sub->id}, User: {$sub->user_id}, Plan: {$sub->plan_id}, Active: " . ($sub->is_active ? 'Yes' : 'No') . "\n";
}

echo "\n⏱️ Starting continuous monitoring...\n";

$lastCount = $initialCount;
$lastSubscriptions = $subscriptions->pluck('id')->toArray();

while (true) {
    try {
        // Check current state
        $currentCount = Subscription::count();
        $currentSubscriptions = Subscription::all(['id', 'user_id', 'plan_id', 'is_active', 'status', 'created_at']);
        $currentIds = $currentSubscriptions->pluck('id')->toArray();
        
        // Check for changes
        if ($currentCount !== $lastCount) {
            echo "\n🚨 SUBSCRIPTION COUNT CHANGED!\n";
            echo "Previous count: {$lastCount}\n";
            echo "Current count: {$currentCount}\n";
            
            if ($currentCount < $lastCount) {
                echo "❌ SUBSCRIPTIONS WERE DELETED!\n";
                
                // Find which subscriptions were deleted
                $deletedIds = array_diff($lastSubscriptions, $currentIds);
                foreach ($deletedIds as $deletedId) {
                    echo "  - Subscription ID {$deletedId} was deleted\n";
                    
                    // Check if user still exists
                    $user = User::find($deletedId);
                    if (!$user) {
                        echo "    ❌ User was also deleted (cascading delete)\n";
                    } else {
                        echo "    ✅ User still exists\n";
                    }
                }
            } else {
                echo "✅ NEW SUBSCRIPTIONS WERE CREATED!\n";
                $newIds = array_diff($currentIds, $lastSubscriptions);
                foreach ($newIds as $newId) {
                    echo "  - Subscription ID {$newId} was created\n";
                }
            }
            
            // Log the change
            Log::warning('Subscription count changed', [
                'previous_count' => $lastCount,
                'current_count' => $currentCount,
                'timestamp' => now()
            ]);
        }
        
        // Check for individual subscription changes
        foreach ($currentSubscriptions as $sub) {
            $previousSub = $subscriptions->where('id', $sub->id)->first();
            if ($previousSub) {
                if ($sub->is_active !== $previousSub->is_active) {
                    echo "\n⚠️ Subscription {$sub->id} active status changed: " . 
                         ($previousSub->is_active ? 'Yes' : 'No') . " -> " . 
                         ($sub->is_active ? 'Yes' : 'No') . "\n";
                }
                if ($sub->status !== $previousSub->status) {
                    echo "\n⚠️ Subscription {$sub->id} status changed: {$previousSub->status} -> {$sub->status}\n";
                }
            }
        }
        
        // Update tracking variables
        $lastCount = $currentCount;
        $lastSubscriptions = $currentIds;
        $subscriptions = $currentSubscriptions;
        
        // Sleep for 1 second
        sleep(1);
        
    } catch (Exception $e) {
        echo "\n❌ Error during monitoring: " . $e->getMessage() . "\n";
        Log::error('Subscription monitoring error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        sleep(5); // Wait longer on error
    }
}

