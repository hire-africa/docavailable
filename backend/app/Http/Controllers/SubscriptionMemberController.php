<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\SubscriptionMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionMemberController extends Controller
{
    /**
     * Get all members for the authenticated user's active subscription.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Find the user's active subscription that allows members
        $subscription = Subscription::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('status', 1)
            ->whereHas('plan', function($query) {
                $query->where('max_members', '>', 1);
            })
            ->with(['members.user:id,first_name,last_name,email,display_name,phone', 'plan:id,max_members,name'])
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active shared subscription found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'subscription_id' => $subscription->id,
                'plan_name' => $subscription->plan_name,
                'max_members' => $subscription->plan->max_members,
                'current_members_count' => $subscription->members->count() + 1,
                'members' => $subscription->members
            ]
        ]);
    }

    /**
     * Add a member to the authenticated user's active subscription.
     */
    public function store(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
        ]);

        $user = auth()->user();
        $identifier = $request->identifier;

        try {
            // 1. Find the subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 1)
                ->with('plan')
                ->get()
                ->first(function ($sub) {
                    return $sub->is_active && $sub->plan && ($sub->plan->max_members ?? 1) > 1;
                });

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active enterprise subscription found. Please upgrade to an enterprise plan to add members.'
                ], 404);
            }

            // 2. Check limits (including the owner)
            $currentMembersCount = SubscriptionMember::where('subscription_id', $subscription->id)->count();
            $totalSeatsUsed = $currentMembersCount + 1; // +1 for the owner
            $maxMembers = $subscription->plan->max_members ?? 1;

            if ($totalSeatsUsed >= $maxMembers) {
                return response()->json([
                    'success' => false,
                    'message' => "Subscription seat limit reached ({$maxMembers}). Please upgrade your plan to add more members."
                ], 422);
            }

            // 3. Find the user to add
            // phone is a bigint column in PostgreSQL — orWhere with an email string causes a cast error
            $memberUser = filter_var($identifier, FILTER_VALIDATE_EMAIL)
                ? User::where('email', $identifier)->first()
                : User::where('phone', $identifier)->first();

            if (!$memberUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found. Please ensure the member has registered on DocAvailable.'
                ], 404);
            }

            if ($memberUser->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already the owner of this subscription.'
                ], 422);
            }

            // 4. Check if already a member
            $exists = SubscriptionMember::where('subscription_id', $subscription->id)
                ->where('user_id', $memberUser->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user is already a member of your subscription.'
                ], 422);
            }

            // 5. Create membership
            $member = SubscriptionMember::create([
                'subscription_id' => $subscription->id,
                'user_id' => $memberUser->id,
                'status' => 'active',
                'role' => 'member'
            ]);

            // 6. Notify the new member (in-app + push)
            try {
                $ownerName = $user->display_name ?: trim("{$user->first_name} {$user->last_name}") ?: 'Your organization';
                $planName = $subscription->plan_name ?: ($subscription->plan->name ?? 'Enterprise');
                $notificationService = new \App\Services\NotificationService();
                $notificationService->sendCustomNotification(
                    $memberUser,
                    'Added to Health Plan',
                    "You have been added to {$ownerName}'s {$planName} plan. You can now book consultations using the shared plan.",
                    ['type' => 'subscription_added', 'subscription_id' => $subscription->id]
                );
            } catch (\Exception $e) {
                Log::warning('Failed to notify new subscription member', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Member added successfully.',
                'data' => $member->load('user:id,first_name,last_name,email,display_name,phone')
            ]);

        } catch (\Throwable $e) {
            Log::error('SubscriptionMemberController@store failed', [
                'user_id' => $user->id ?? null,
                'identifier' => $identifier ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add member: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove a member from the authenticated user's active subscription.
     */
    public function destroy($memberId)
    {
        $user = auth()->user();

        // Find the membership record
        $membership = SubscriptionMember::where('id', $memberId)
            ->whereHas('subscription', function($query) use ($user) {
                $query->where('user_id', $user->id); // Must be owned by the auth user
            })
            ->first();

        if (!$membership) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found or you do not have permission to remove them.'
            ], 404);
        }

        $membership->delete();

        return response()->json([
            'success' => true,
            'message' => 'Member removed successfully.'
        ]);
    }
}
