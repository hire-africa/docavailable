<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\DoctorWallet;
use App\Models\TextSession;
use App\Models\User;
use App\Services\DoctorPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        // Cache the entire summary for 60 seconds for maximum performance
        $cacheKey = "comprehensive_dashboard_summary_v2_{$user->id}";

        $data = Cache::remember($cacheKey, 60, function () use ($user) {
            // Load only necessary relationships
            $user->load(['subscription', 'wallet']);

            $summary = [
                // Only send minimal user data to keep payload small
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'display_name' => $user->display_name,
                    'user_type' => $user->user_type,
                    'profile_picture_url' => $user->profile_picture_url,
                ],
                'notifications_stats' => [
                    // Direct DB count is faster than Eloquent relationship count
                    'unread_count' => \Illuminate\Support\Facades\DB::table('notifications')
                        ->where('notifiable_id', $user->id)
                        ->where('notifiable_type', User::class)
                        ->whereNull('read_at')
                        ->count(),
                ],
                'timestamp' => now()->toISOString(),
            ];

            if ($user->user_type === 'doctor') {
                $summary['doctor_data'] = $this->getDoctorSummary($user);
            } elseif ($user->user_type === 'patient') {
                $summary['patient_data'] = $this->getPatientSummary($user);
            }

            return $summary;
        });

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Get doctor specific summary data
     */
    private function getDoctorSummary($user)
    {
        $wallet = $user->wallet ?: DoctorWallet::getOrCreate($user->id);

        // Get upcoming appointments with minimal fields
        $appointments = Appointment::where('doctor_id', $user->id)
            ->with(['patient:id,first_name,last_name,profile_picture,gender,country'])
            ->whereIn('status', [
                Appointment::STATUS_PENDING,
                Appointment::STATUS_CONFIRMED,
                Appointment::STATUS_RESCHEDULE_PROPOSED
            ])
            ->select('id', 'patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'status', 'appointment_type', 'duration_minutes')
            ->orderBy('appointment_date', 'asc')
            ->orderBy('appointment_time', 'asc')
            ->limit(10)
            ->get();

        foreach ($appointments as $appointment) {
            if ($appointment->patient) {
                $appointment->patient->append('profile_picture_url');
            }
        }

        return [
            'wallet' => [
                'balance' => $wallet->balance,
                'total_earned' => $wallet->total_earned,
                'total_withdrawn' => $wallet->total_withdrawn,
            ],
            'payment_rates' => DoctorPaymentService::getPaymentAmountsForDoctor($user),
            'appointments' => $appointments,
            'active_sessions' => TextSession::where('doctor_id', $user->id)
                ->with(['patient:id,first_name,last_name,profile_picture'])
                ->where('status', 'active')
                ->select('id', 'patient_id', 'doctor_id', 'status', 'started_at', 'chat_id')
                ->get(),
            'stats' => [
                'rating' => $user->rating,
                'total_ratings' => $user->total_ratings,
                'pending_appointments_count' => Appointment::where('doctor_id', $user->id)
                    ->where('status', Appointment::STATUS_PENDING)
                    ->count(),
            ]
        ];
    }

    /**
     * Get patient specific summary data
     */
    private function getPatientSummary($user)
    {
        // Clean up expired subscriptions on dashboard access
        \App\Models\Subscription::where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->delete();

        // Get aggregated sessions across all active (non-expired) subscriptions
        $aggregated = \App\Models\Subscription::getAggregatedSessions($user->id);
        $subs = $aggregated['subscriptions'];

        // Get upcoming appointments with minimal fields
        $appointments = Appointment::where('patient_id', $user->id)
            ->with(['doctor:id,first_name,last_name,profile_picture,specialization,rating'])
            ->whereIn('status', [
                Appointment::STATUS_PENDING,
                Appointment::STATUS_CONFIRMED,
                Appointment::STATUS_RESCHEDULE_PROPOSED
            ])
            ->select('id', 'patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'status', 'appointment_type', 'duration_minutes')
            ->orderBy('appointment_date', 'asc')
            ->orderBy('appointment_time', 'asc')
            ->limit(10)
            ->get();

        foreach ($appointments as $appointment) {
            if ($appointment->doctor) {
                $appointment->doctor->append('profile_picture_url');
            }
        }

        $newest = $subs->isNotEmpty() ? $subs->last() : null;
        $latestEnd = $subs->isNotEmpty() ? $subs->max('end_date') : null;

        return [
            'subscription' => $subs->isNotEmpty() ? [
                'id' => $newest->id,
                'plan_id' => $newest->plan_id,
                'is_active' => true,
                'plan_name' => $newest->plan_name,
                'plan_price' => $newest->plan_price,
                'plan_currency' => $newest->plan_currency,
                'text_sessions_remaining' => $aggregated['text_sessions_remaining'],
                'voice_calls_remaining' => $aggregated['voice_calls_remaining'],
                'video_calls_remaining' => $aggregated['video_calls_remaining'],
                'total_text_sessions' => $aggregated['total_text_sessions'],
                'total_voice_calls' => $aggregated['total_voice_calls'],
                'total_video_calls' => $aggregated['total_video_calls'],
                'activated_at' => $newest->activated_at,
                'expires_at' => $latestEnd,
                'active_subscriptions_count' => $subs->count(),
            ] : null,
            'appointments' => $appointments,
            'active_sessions' => TextSession::where('patient_id', $user->id)
                ->with(['doctor:id,first_name,last_name,profile_picture,specialization'])
                ->where('status', 'active')
                ->select('id', 'patient_id', 'doctor_id', 'status', 'started_at', 'chat_id')
                ->get(),
        ];
    }
}
