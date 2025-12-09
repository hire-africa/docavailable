<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

class MonitorSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:monitor';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Monitor subscription health and identify potential issues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Subscription Health Monitor');
        $this->line('');

        // 1. Basic counts
        $totalSubscriptions = Subscription::count();
        $activeSubscriptions = Subscription::where('is_active', true)->count();
        $inactiveSubscriptions = Subscription::where('is_active', false)->count();
        
        $this->info('📊 Subscription Counts:');
        $this->line("  - Total: {$totalSubscriptions}");
        $this->line("  - Active: {$activeSubscriptions}");
        $this->line("  - Inactive: {$inactiveSubscriptions}");
        $this->line('');

        // 2. Check foreign key constraints
        $this->info('🔗 Foreign Key Constraints:');
        try {
            $constraints = DB::select("
                SELECT 
                    tc.constraint_name,
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
                $status = $constraint->delete_rule === 'CASCADE' ? '❌' : '✅';
                $this->line("  {$status} {$constraint->constraint_name}: {$constraint->column_name} -> {$constraint->foreign_table_name}.{$constraint->foreign_column_name} (DELETE: {$constraint->delete_rule})");
            }
        } catch (\Exception $e) {
            $this->error("  ❌ Error checking constraints: " . $e->getMessage());
        }
        $this->line('');

        // 3. Check for orphaned subscriptions
        $this->info('👥 Orphaned Subscriptions:');
        $orphanedSubscriptions = Subscription::whereDoesntHave('user')->get();
        if ($orphanedSubscriptions->count() > 0) {
            $this->warn("  Found {$orphanedSubscriptions->count()} orphaned subscriptions:");
            foreach ($orphanedSubscriptions as $sub) {
                $this->line("    - ID: {$sub->id}, User ID: {$sub->user_id}");
            }
        } else {
            $this->line("  ✅ No orphaned subscriptions found");
        }
        $this->line('');

        // 4. Check for users without subscriptions who should have them
        $this->info('👤 Users Without Subscriptions:');
        $usersWithoutSubscriptions = User::where('user_type', 'patient')
            ->whereDoesntHave('subscription')
            ->get();
        
        if ($usersWithoutSubscriptions->count() > 0) {
            $this->warn("  Found {$usersWithoutSubscriptions->count()} users without subscriptions:");
            foreach ($usersWithoutSubscriptions->take(5) as $user) {
                $this->line("    - {$user->email} (ID: {$user->id})");
            }
            if ($usersWithoutSubscriptions->count() > 5) {
                $this->line("    ... and " . ($usersWithoutSubscriptions->count() - 5) . " more");
            }
        } else {
            $this->line("  ✅ All patient users have subscriptions");
        }
        $this->line('');

        // 5. Check for subscriptions with missing plans
        $this->info('📋 Subscriptions with Missing Plans:');
        $subscriptionsWithNullPlans = Subscription::whereNull('plan_id')->get();
        if ($subscriptionsWithNullPlans->count() > 0) {
            $this->warn("  Found {$subscriptionsWithNullPlans->count()} subscriptions with NULL plan_id:");
            foreach ($subscriptionsWithNullPlans->take(5) as $sub) {
                $this->line("    - ID: {$sub->id}, User: {$sub->user_id}, Plan Name: {$sub->plan_name}");
            }
        } else {
            $this->line("  ✅ All subscriptions have valid plan references");
        }
        $this->line('');

        // 6. Check for expired subscriptions
        $this->info('⏰ Expired Subscriptions:');
        $expiredSubscriptions = Subscription::where('end_date', '<', now())
            ->where('is_active', true)
            ->get();
        
        if ($expiredSubscriptions->count() > 0) {
            $this->warn("  Found {$expiredSubscriptions->count()} expired but active subscriptions:");
            foreach ($expiredSubscriptions->take(5) as $sub) {
                $this->line("    - ID: {$sub->id}, User: {$sub->user_id}, Expired: {$sub->end_date}");
            }
        } else {
            $this->line("  ✅ No expired active subscriptions found");
        }
        $this->line('');

        // 7. Summary and recommendations
        $this->info('📋 Summary & Recommendations:');
        
        $issues = [];
        if ($orphanedSubscriptions->count() > 0) {
            $issues[] = "Orphaned subscriptions need cleanup";
        }
        if ($usersWithoutSubscriptions->count() > 0) {
            $issues[] = "Users without subscriptions may need recovery";
        }
        if ($expiredSubscriptions->count() > 0) {
            $issues[] = "Expired subscriptions need status update";
        }
        
        if (empty($issues)) {
            $this->line("  ✅ No critical issues detected");
        } else {
            $this->warn("  ⚠️ Issues detected:");
            foreach ($issues as $issue) {
                $this->line("    - {$issue}");
            }
        }

        $this->line('');
        $this->info('✅ Monitoring complete!');
    }
}

