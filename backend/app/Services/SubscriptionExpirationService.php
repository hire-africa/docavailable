<?php

namespace App\Services;

use App\Models\Subscription;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SubscriptionExpirationService
{
    /**
     * Process expiration for all active subscriptions
     * This method is idempotent and safe to run multiple times
     * 
     * @return array Statistics about processed subscriptions
     */
    public function processExpirations(): array
    {
        $stats = [
            'expired' => 0,
            'rolled_over' => 0,
            'skipped' => 0,
            'errors' => 0,
        ];

        try {
            // Get all subscriptions that are currently marked as active
            // We only process subscriptions with status = 1 (active) and is_active = true
            $activeSubscriptions = Subscription::where('status', 1)
                ->where('is_active', true)
                ->whereNotNull('end_date')
                ->with('plan')
                ->get();

            Log::info("Processing subscription expirations", [
                'total_active' => $activeSubscriptions->count()
            ]);

            foreach ($activeSubscriptions as $subscription) {
                try {
                    $result = $this->processSubscription($subscription);
                    $stats[$result]++;
                } catch (\Exception $e) {
                    Log::error("Error processing subscription expiration", [
                        'subscription_id' => $subscription->id,
                        'user_id' => $subscription->user_id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    $stats['errors']++;
                }
            }

            Log::info("Subscription expiration processing completed", $stats);

            return $stats;
        } catch (\Exception $e) {
            Log::error("Fatal error in subscription expiration processing", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $stats['errors']++;
            return $stats;
        }
    }

    /**
     * Process expiration for a single subscription
     * 
     * @param Subscription $subscription
     * @return string Result: 'expired', 'rolled_over', or 'skipped'
     */
    public function processSubscription(Subscription $subscription): string
    {
        $now = Carbon::now();
        
        // Safety check: only process if subscription is still active
        if ($subscription->status != 1 || !$subscription->is_active) {
            return 'skipped';
        }

        // Safety check: must have end_date
        if (!$subscription->end_date) {
            Log::warning("Subscription missing end_date", [
                'subscription_id' => $subscription->id
            ]);
            return 'skipped';
        }

        $currentEndDate = Carbon::parse($subscription->end_date);
        
        // Calculate original end_date from start_date + plan duration
        // This is needed to determine if roll-over has already been applied
        $originalEndDate = $this->calculateOriginalEndDate($subscription);
        
        // Check if subscription has passed its end date
        if ($now->isAfter($currentEndDate)) {
            // Check for 30-day plan roll-over eligibility
            // Use original end_date for roll-over check, not current end_date
            if ($this->isEligibleForRollover($subscription, $originalEndDate, $now)) {
                return $this->applyRollover($subscription, $originalEndDate);
            } else {
                // Normal expiration: mark as expired
                return $this->expireSubscription($subscription);
            }
        }

        // Subscription is still valid
        return 'skipped';
    }

    /**
     * Calculate the original end_date based on start_date + plan duration
     * This is used to determine if roll-over has been applied
     * 
     * @param Subscription $subscription
     * @return Carbon
     */
    protected function calculateOriginalEndDate(Subscription $subscription): Carbon
    {
        // If we have metadata with original_end_date, use that
        $metadata = $subscription->payment_metadata ?? [];
        if (isset($metadata['original_end_date'])) {
            return Carbon::parse($metadata['original_end_date']);
        }

        // Otherwise, calculate from start_date + plan duration
        if ($subscription->start_date) {
            $startDate = Carbon::parse($subscription->start_date);
            $planDuration = $this->getPlanDuration($subscription);
            
            if ($planDuration > 0) {
                return $startDate->copy()->addDays($planDuration);
            }
        }

        // Fallback: use current end_date (assumes no roll-over yet)
        return Carbon::parse($subscription->end_date);
    }

    /**
     * Check if subscription is eligible for 30-day plan roll-over
     * 
     * @param Subscription $subscription
     * @param Carbon $originalEndDate
     * @param Carbon $now
     * @return bool
     */
    protected function isEligibleForRollover(Subscription $subscription, Carbon $originalEndDate, Carbon $now): bool
    {
        // Only apply to 30-day plans
        $planDuration = $this->getPlanDuration($subscription);
        if ($planDuration != 30) {
            return false;
        }

        // Check if roll-over has already been applied
        // We infer this by checking if end_date is more than 7 days beyond what it should be
        // OR by checking payment_metadata for a roll_over flag
        if ($this->hasRolloverBeenApplied($subscription, $originalEndDate)) {
            return false;
        }

        // Check if we're within the 7-day grace period
        $gracePeriodEnd = $originalEndDate->copy()->addDays(7);
        if ($now->isAfter($gracePeriodEnd)) {
            return false; // Too late for roll-over, should expire
        }

        // All conditions met for roll-over
        return true;
    }

    /**
     * Get plan duration in days
     * 
     * @param Subscription $subscription
     * @return int
     */
    protected function getPlanDuration(Subscription $subscription): int
    {
        // Try to get duration from plan relationship
        if ($subscription->plan && $subscription->plan->duration) {
            return (int) $subscription->plan->duration;
        }

        // Fallback: calculate from start_date and end_date if plan is not available
        // This is a safety measure in case plan relationship is missing
        if ($subscription->start_date && $subscription->end_date) {
            $startDate = Carbon::parse($subscription->start_date);
            $endDate = Carbon::parse($subscription->end_date);
            $calculatedDuration = $startDate->diffInDays($endDate);
            
            // If calculated duration is close to 30 days (within 2 days tolerance), assume 30-day plan
            if ($calculatedDuration >= 28 && $calculatedDuration <= 32) {
                return 30;
            }
            
            return $calculatedDuration;
        }

        // Default fallback
        return 0;
    }

    /**
     * Check if roll-over has already been applied
     * 
     * @param Subscription $subscription
     * @param Carbon $originalEndDate
     * @return bool
     */
    protected function hasRolloverBeenApplied(Subscription $subscription, Carbon $originalEndDate): bool
    {
        // Method 1: Check payment_metadata for roll_over flag (most reliable)
        $metadata = $subscription->payment_metadata ?? [];
        if (isset($metadata['rollover_applied']) && $metadata['rollover_applied'] === true) {
            return true;
        }

        // Method 2: Infer from end_date comparison
        // If current end_date is more than 7 days beyond the original end_date, roll-over was applied
        $currentEndDate = Carbon::parse($subscription->end_date);
        $daysDifference = $originalEndDate->diffInDays($currentEndDate, false);
        
        // If end_date is 7 days (or more) beyond original, roll-over was applied
        // Use tolerance of 6-8 days to account for any date calculation differences
        if ($daysDifference >= 6) {
            return true;
        }

        return false;
    }

    /**
     * Apply 30-day plan roll-over (extend by 7 days, one-time only)
     * 
     * @param Subscription $subscription
     * @param Carbon $originalEndDate
     * @return string
     */
    protected function applyRollover(Subscription $subscription, Carbon $originalEndDate): string
    {
        try {
            $newEndDate = $originalEndDate->copy()->addDays(7);
            
            // Update subscription with new end_date and mark roll-over in metadata
            $metadata = $subscription->payment_metadata ?? [];
            $metadata['rollover_applied'] = true;
            $metadata['rollover_applied_at'] = Carbon::now()->toISOString();
            $metadata['original_end_date'] = $originalEndDate->toISOString();
            $metadata['new_end_date'] = $newEndDate->toISOString();

            $subscription->update([
                'end_date' => $newEndDate,
                'payment_metadata' => $metadata,
                // Keep status as active (1) and is_active as true
            ]);

            Log::info("Subscription roll-over applied", [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'original_end_date' => $originalEndDate->toISOString(),
                'new_end_date' => $newEndDate->toISOString(),
            ]);

            // Send notification if notification service is available
            $this->sendRolloverNotification($subscription);

            return 'rolled_over';
        } catch (\Exception $e) {
            Log::error("Failed to apply roll-over", [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Mark subscription as expired
     * 
     * @param Subscription $subscription
     * @return string
     */
    protected function expireSubscription(Subscription $subscription): string
    {
        try {
            // Update status to 2 (expired) and set is_active to false
            // Do NOT modify start_date or delete subscription
            $subscription->update([
                'status' => 2, // 2 = expired
                'is_active' => false,
            ]);

            Log::info("Subscription expired", [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'end_date' => $subscription->end_date->toISOString(),
            ]);

            // Send notification if notification service is available
            $this->sendExpirationNotification($subscription);

            return 'expired';
        } catch (\Exception $e) {
            Log::error("Failed to expire subscription", [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Send roll-over notification (non-blocking)
     * 
     * @param Subscription $subscription
     * @return void
     */
    protected function sendRolloverNotification(Subscription $subscription): void
    {
        try {
            if (!$subscription->user) {
                return;
            }

            $notificationService = new NotificationService();
            $notificationService->createNotification(
                $subscription->user_id,
                'Subscription Extended',
                'Your 30-day subscription has been extended by 7 days.',
                'subscription',
                [
                    'subscription_id' => $subscription->id,
                    'new_end_date' => $subscription->end_date->toISOString(),
                ]
            );
        } catch (\Exception $e) {
            // Log but don't fail - notifications are non-blocking
            Log::warning("Failed to send roll-over notification", [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send expiration notification (non-blocking)
     * 
     * @param Subscription $subscription
     * @return void
     */
    protected function sendExpirationNotification(Subscription $subscription): void
    {
        try {
            if (!$subscription->user) {
                return;
            }

            $notificationService = new NotificationService();
            $notificationService->createNotification(
                $subscription->user_id,
                'Subscription Expired',
                'Your subscription has expired. Please renew to continue using our services.',
                'subscription',
                [
                    'subscription_id' => $subscription->id,
                    'end_date' => $subscription->end_date->toISOString(),
                ]
            );
        } catch (\Exception $e) {
            // Log but don't fail - notifications are non-blocking
            Log::warning("Failed to send expiration notification", [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}

