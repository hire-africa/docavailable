<?php

/**
 * Fix Pending Payments and Activate Subscriptions
 * This script will manually process the pending payments and activate subscriptions
 */

require_once 'vendor/autoload.php';

use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\User;
use App\Models\Subscription;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Log;

echo "🔧 FIXING PENDING PAYMENTS\n";
echo "==========================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Get all pending payments for user 1
    $pendingPayments = PaymentTransaction::where('user_id', 1)
        ->where('status', 'pending')
        ->orderBy('created_at', 'desc')
        ->get();
    
    echo "Found {$pendingPayments->count()} pending payments for user 1\n\n";
    
    if ($pendingPayments->count() > 0) {
        // Get the most recent payment
        $latestPayment = $pendingPayments->first();
        echo "Processing latest payment:\n";
        echo "- ID: {$latestPayment->id}\n";
        echo "- Amount: {$latestPayment->amount} {$latestPayment->currency}\n";
        echo "- Reference: {$latestPayment->reference}\n";
        echo "- Plan ID: " . ($latestPayment->metadata['plan_id'] ?? 'Unknown') . "\n\n";
        
        // Get plan details
        $planId = $latestPayment->metadata['plan_id'] ?? null;
        if ($planId) {
            $plan = Plan::find($planId);
            if ($plan) {
                echo "Plan found: {$plan->name} - {$plan->text_sessions} text sessions\n\n";
                
                // Create subscription manually
                echo "Creating subscription manually...\n";
                
                // Check if user already has an active subscription
                $existingSubscription = Subscription::where('user_id', 1)
                    ->where('is_active', true)
                    ->first();
                
                if ($existingSubscription) {
                    // Update existing subscription
                    $existingSubscription->update([
                        'text_sessions_remaining' => $existingSubscription->text_sessions_remaining + $plan->text_sessions,
                        'voice_calls_remaining' => $existingSubscription->voice_calls_remaining + $plan->voice_calls,
                        'video_calls_remaining' => $existingSubscription->video_calls_remaining + $plan->video_calls,
                        'total_text_sessions' => $existingSubscription->total_text_sessions + $plan->text_sessions,
                        'total_voice_calls' => $existingSubscription->total_voice_calls + $plan->voice_calls,
                        'total_video_calls' => $existingSubscription->total_video_calls + $plan->video_calls,
                        'end_date' => now()->addDays($plan->duration),
                        'payment_transaction_id' => $latestPayment->reference,
                        'payment_status' => 'completed',
                        'is_active' => true,
                        'activated_at' => now()
                    ]);
                    
                    echo "✅ Updated existing subscription\n";
                    echo "- Subscription ID: {$existingSubscription->id}\n";
                    echo "- Text Sessions: {$existingSubscription->text_sessions_remaining}\n";
                    echo "- Voice Calls: {$existingSubscription->voice_calls_remaining}\n";
                    echo "- Video Calls: {$existingSubscription->video_calls_remaining}\n";
                } else {
                    // Create new subscription
                    $subscription = Subscription::create([
                        'user_id' => 1,
                        'plan_id' => $plan->id,
                        'plan_name' => $plan->name,
                        'plan_price' => $plan->price,
                        'plan_currency' => $plan->currency,
                        'status' => 1,
                        'start_date' => now(),
                        'end_date' => now()->addDays($plan->duration),
                        'is_active' => true,
                        'payment_transaction_id' => $latestPayment->reference,
                        'payment_status' => 'completed',
                        'text_sessions_remaining' => $plan->text_sessions,
                        'voice_calls_remaining' => $plan->voice_calls,
                        'video_calls_remaining' => $plan->video_calls,
                        'total_text_sessions' => $plan->text_sessions,
                        'total_voice_calls' => $plan->voice_calls,
                        'total_video_calls' => $plan->video_calls,
                        'activated_at' => now()
                    ]);
                    
                    echo "✅ Created new subscription\n";
                    echo "- Subscription ID: {$subscription->id}\n";
                    echo "- Text Sessions: {$subscription->text_sessions_remaining}\n";
                    echo "- Voice Calls: {$subscription->voice_calls_remaining}\n";
                    echo "- Video Calls: {$subscription->video_calls_remaining}\n";
                }
                
                // Update payment status
                $latestPayment->update([
                    'status' => 'completed',
                    'metadata' => array_merge($latestPayment->metadata ?? [], [
                        'manually_processed' => true,
                        'processed_at' => now()->toISOString()
                    ])
                ]);
                
                echo "✅ Updated payment status to completed\n\n";
                
                // Mark other pending payments as cancelled (to avoid duplicates)
                $otherPayments = $pendingPayments->where('id', '!=', $latestPayment->id);
                foreach ($otherPayments as $payment) {
                    $payment->update([
                        'status' => 'cancelled',
                        'metadata' => array_merge($payment->metadata ?? [], [
                            'cancelled_reason' => 'Duplicate payment - newer payment processed',
                            'cancelled_at' => now()->toISOString()
                        ])
                    ]);
                }
                
                echo "✅ Marked {$otherPayments->count()} other payments as cancelled\n\n";
                
                echo "🎉 PAYMENT FIXED SUCCESSFULLY!\n";
                echo "==============================\n";
                echo "✅ Your subscription is now active\n";
                echo "✅ You can now use the app with your paid sessions\n";
                echo "✅ Payment status updated to completed\n";
                
            } else {
                echo "❌ Plan not found with ID: {$planId}\n";
            }
        } else {
            echo "❌ No plan ID found in payment metadata\n";
        }
    } else {
        echo "❌ No pending payments found\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
