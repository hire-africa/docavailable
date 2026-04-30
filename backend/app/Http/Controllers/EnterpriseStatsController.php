<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\TextSession;
use App\Models\Subscription;
use App\Models\SubscriptionMember;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class EnterpriseStatsController extends Controller
{
    public function getStats(Request $request)
    {
        $user = auth()->user();

        // 1. Find the active enterprise subscription
        $subscription = Subscription::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('status', 1)
            ->whereHas('plan', function($query) {
                $query->where('max_members', '>', 1);
            })
            ->with('plan')
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active enterprise subscription found.'
            ], 404);
        }

        // 2. Get all member IDs including owner
        $memberIds = SubscriptionMember::where('subscription_id', $subscription->id)
            ->pluck('user_id')
            ->toArray();
        
        $allIds = array_unique(array_merge([$user->id], $memberIds));

        // 3. Calculate consultation stats (Usage vs Quota)
        // Quota is the sum of text, voice, and video calls allowed in the plan
        $plan = $subscription->plan;
        $totalQuota = ($plan->text_sessions ?? 0) + ($plan->voice_calls ?? 0) + ($plan->video_calls ?? 0);

        // Usage is consultations performed WITHIN this active subscription period
        $subStart = $subscription->activated_at ?: $subscription->created_at;
        
        $usedAppointments = Appointment::whereIn('patient_id', $allIds)
            ->where('created_at', '>=', $subStart)
            ->count();
        $usedTextSessions = TextSession::whereIn('patient_id', $allIds)
            ->where('created_at', '>=', $subStart)
            ->count();
        
        $totalUsed = $usedAppointments + $usedTextSessions;

        // Monthly stats for growth
        $now = Carbon::now();
        $thisMonthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        $currTotal = Appointment::whereIn('patient_id', $allIds)->where('created_at', '>=', $thisMonthStart)->count() +
                     TextSession::whereIn('patient_id', $allIds)->where('created_at', '>=', $thisMonthStart)->count();

        $prevTotal = Appointment::whereIn('patient_id', $allIds)->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count() +
                     TextSession::whereIn('patient_id', $allIds)->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();

        $growth = 0;
        if ($prevTotal > 0) {
            $growth = (($currTotal - $prevTotal) / $prevTotal) * 100;
        } else if ($currTotal > 0) {
            $growth = 100;
        }

        // 4. Get last payment info
        $lastPayment = PaymentTransaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->first();

        // 5. Get member activity
        $memberActivity = [];
        foreach ($allIds as $id) {
            $lastAt = Appointment::where('patient_id', $id)->orderBy('created_at', 'desc')->value('created_at');
            $lastChat = TextSession::where('patient_id', $id)->orderBy('created_at', 'desc')->value('created_at');
            
            $finalLast = null;
            if ($lastAt && $lastChat) {
                $finalLast = $lastAt > $lastChat ? $lastAt : $lastChat;
            } else {
                $finalLast = $lastAt ?: $lastChat;
            }

            $memberActivity[$id] = $finalLast ? Carbon::parse($finalLast)->diffForHumans() : 'Never';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_consultations' => $totalUsed,
                'total_quota' => $totalQuota,
                'usage_label' => $totalUsed . ' / ' . $totalQuota,
                'growth_label' => ($growth >= 0 ? '+' : '') . round($growth, 1) . '%',
                'last_payment' => $lastPayment ? [
                    'amount' => $lastPayment->amount,
                    'currency' => $lastPayment->currency,
                    'date' => Carbon::parse($lastPayment->created_at)->format('d M Y'),
                ] : null,
                'member_activity' => $memberActivity
            ]
        ]);
    }
}
