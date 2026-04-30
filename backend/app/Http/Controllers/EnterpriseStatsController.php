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

        // 3. Calculate consultation stats
        $now = Carbon::now();
        $thisMonthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        // Total consultations
        $totalAppointments = Appointment::whereIn('patient_id', $allIds)->count();
        $totalTextSessions = TextSession::whereIn('patient_id', $allIds)->count();
        $totalOverall = $totalAppointments + $totalTextSessions;

        // Current month
        $currAppointments = Appointment::whereIn('patient_id', $allIds)
            ->where('created_at', '>=', $thisMonthStart)
            ->count();
        $currTextSessions = TextSession::whereIn('patient_id', $allIds)
            ->where('created_at', '>=', $thisMonthStart)
            ->count();
        $currTotal = $currAppointments + $currTextSessions;

        // Last month
        $prevAppointments = Appointment::whereIn('patient_id', $allIds)
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->count();
        $prevTextSessions = TextSession::whereIn('patient_id', $allIds)
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->count();
        $prevTotal = $prevAppointments + $prevTextSessions;

        // Growth
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

        // 5. Get member activity (last interaction per member)
        $memberActivity = [];
        foreach ($allIds as $id) {
            $lastAppt = Appointment::where('patient_id', $id)->orderBy('created_at', 'desc')->first();
            $lastChat = TextSession::where('patient_id', $id)->orderBy('created_at', 'desc')->first();
            
            $lastAt = null;
            if ($lastAppt && $lastChat) {
                $lastAt = $lastAppt->created_at->gt($lastChat->created_at) ? $lastAppt->created_at : $lastChat->created_at;
            } else if ($lastAppt) {
                $lastAt = $lastAppt->created_at;
            } else if ($lastChat) {
                $lastAt = $lastChat->created_at;
            }

            if ($lastAt) {
                $memberActivity[$id] = $lastAt->diffForHumans();
            } else {
                $memberActivity[$id] = 'Never';
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_consultations' => $totalOverall,
                'current_month_total' => $currTotal,
                'last_month_total' => $prevTotal,
                'growth_percentage' => round($growth, 1),
                'growth_label' => ($growth >= 0 ? '+' : '') . round($growth, 1) . '%',
                'last_payment' => $lastPayment ? [
                    'amount' => $lastPayment->amount,
                    'currency' => $lastPayment->currency,
                    'date' => $lastPayment->created_at->format('d M Y'),
                    'method' => $lastPayment->payment_method
                ] : null,
                'member_activity' => $memberActivity
            ]
        ]);
    }
}
