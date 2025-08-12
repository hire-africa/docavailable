<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\PaymentTransaction;

class RecoverSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:recover {--dry-run : Show what would be recovered without actually doing it}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recover subscriptions that were lost due to cascade delete issues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Starting subscription recovery...');
        
        $isDryRun = $this->option('dry-run');
        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        // 1. Check for users who should have subscriptions but don't
        $this->info('1. Checking for users without subscriptions...');
        $usersWithoutSubscriptions = User::where('user_type', 'patient')
            ->whereDoesntHave('subscription')
            ->get();

        $this->info("Found {$usersWithoutSubscriptions->count()} users without subscriptions");

        foreach ($usersWithoutSubscriptions as $user) {
            $this->line("  - User {$user->id}: {$user->email}");
        }

        // 2. Check for payment transactions that should have created subscriptions
        $this->info('2. Checking payment transactions...');
        $paymentTransactions = PaymentTransaction::where('status', 'completed')
            ->whereNotNull('webhook_data')
            ->get();

        $this->info("Found {$paymentTransactions->count()} completed payment transactions");

        $recoveredCount = 0;
        $recoveryData = [];

        foreach ($paymentTransactions as $transaction) {
            $webhookData = $transaction->webhook_data;
            $userId = $webhookData['meta']['user_id'] ?? null;
            $planId = $webhookData['meta']['plan_id'] ?? null;
            
            if ($userId) {
                $user = User::find($userId);
                if ($user && !$user->subscription) {
                    $this->line("  - Transaction {$transaction->transaction_id}: User {$userId} has no subscription");
                    
                    // Try to recover subscription
                    $plan = null;
                    if ($planId) {
                        $plan = Plan::find($planId);
                    }
                    
                    if ($plan) {
                        $this->line("    Attempting to recover subscription with plan {$plan->name}...");
                        
                        if (!$isDryRun) {
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
                                
                                $this->info("    ✅ Recovered subscription ID: {$subscription->id}");
                                $recoveredCount++;
                                
                            } catch (\Exception $e) {
                                $this->error("    ❌ Failed to recover subscription: " . $e->getMessage());
                            }
                        } else {
                            $recoveryData[] = [
                                'user_id' => $userId,
                                'user_email' => $user->email,
                                'plan_name' => $plan->name,
                                'transaction_id' => $transaction->transaction_id
                            ];
                        }
                    } else {
                        $this->warn("    ⚠️ No plan found for recovery");
                    }
                }
            }
        }

        // 3. Check for orphaned subscriptions
        $this->info('3. Checking for orphaned subscriptions...');
        $orphanedSubscriptions = Subscription::whereDoesntHave('user')->get();
        $this->info("Found {$orphanedSubscriptions->count()} orphaned subscriptions");

        if ($orphanedSubscriptions->count() > 0) {
            $this->warn("Orphaned subscription IDs:");
            foreach ($orphanedSubscriptions as $sub) {
                $this->line("  - ID: {$sub->id}, User ID: {$sub->user_id}");
            }
        }

        // 4. Summary
        $this->info('📊 Recovery Summary:');
        $this->line("  - Users without subscriptions: {$usersWithoutSubscriptions->count()}");
        $this->line("  - Completed payment transactions: {$paymentTransactions->count()}");
        
        if ($isDryRun) {
            $this->line("  - Subscriptions that would be recovered: " . count($recoveryData));
            if (count($recoveryData) > 0) {
                $this->info("Would recover subscriptions for:");
                foreach ($recoveryData as $data) {
                    $this->line("  - {$data['user_email']} ({$data['plan_name']})");
                }
            }
        } else {
            $this->line("  - Subscriptions recovered: {$recoveredCount}");
        }
        
        $this->line("  - Orphaned subscriptions: {$orphanedSubscriptions->count()}");

        if ($isDryRun) {
            $this->warn('Run without --dry-run to actually recover the subscriptions');
        } else {
            $this->info('✅ Recovery complete!');
        }
    }
}

