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
    /**
     * Get a comprehensive summary of data for the dashboard
     */
    public function summary(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $summary = [
            'user' => $user,
            'notifications_stats' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
            'timestamp' => now()->toISOString(),
        ];

        if ($user->user_type === 'doctor') {
            $summary['doctor_data'] = $this->getDoctorSummary($user);
        } elseif ($user->user_type === 'patient') {
            $summary['patient_data'] = $this->getPatientSummary($user);
        }

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }

    /**
     * Get doctor specific summary data
     */
    private function getDoctorSummary($user)
    {
        $wallet = DoctorWallet::getOrCreate($user->id);

        // Cache stats for 30 seconds to balance freshness and performance
        $cacheKey = "doctor_summary_stats_{$user->id}";

        return Cache::remember($cacheKey, 30, function () use ($user, $wallet) {
            // Get upcoming appointments (pending or confirmed)
            $appointments = Appointment::where('doctor_id', $user->id)
                ->with(['patient:id,first_name,last_name,profile_picture,gender,country'])
                ->whereIn('status', [
                        Appointment::STATUS_PENDING,
                        Appointment::STATUS_CONFIRMED,
                        Appointment::STATUS_IN_PROGRESS,
                        Appointment::STATUS_RESCHEDULE_PROPOSED
                    ])
                ->orderBy('appointment_date', 'asc')
                ->orderBy('appointment_time', 'asc')
                ->limit(10)
                ->get();

            // Ensure profile URLs are appended (using the accessor)
            $appointments->each(function ($appointment) {
                if ($appointment->patient) {
                    $appointment->patient->append('profile_picture_url');
                }
            });

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
                    ->get(),
                'stats' => [
                    'rating' => $user->rating,
                    'total_ratings' => $user->total_ratings,
                    'pending_appointments_count' => Appointment::where('doctor_id', $user->id)
                        ->where('status', Appointment::STATUS_PENDING)
                        ->count(),
                ]
            ];
        });
    }

    /**
     * Get patient specific summary data
     */
    private function getPatientSummary($user)
    {
        $cacheKey = "patient_summary_stats_{$user->id}";

        return Cache::remember($cacheKey, 30, function () use ($user) {
            $subscription = $user->subscription;

            // Get upcoming appointments
            $appointments = Appointment::where('patient_id', $user->id)
                ->with(['doctor:id,first_name,last_name,profile_picture,specialization,rating'])
                ->whereIn('status', [
                        Appointment::STATUS_PENDING,
                        Appointment::STATUS_CONFIRMED,
                        Appointment::STATUS_IN_PROGRESS,
                        Appointment::STATUS_RESCHEDULE_PROPOSED
                    ])
                ->orderBy('appointment_date', 'asc')
                ->orderBy('appointment_time', 'asc')
                ->limit(10)
                ->get();

            // Ensure profile URLs are appended
            $appointments->each(function ($appointment) {
                if ($appointment->doctor) {
                    $appointment->doctor->append('profile_picture_url');
                }
            });

            return [
                'subscription' => $subscription ? [
                    'id' => $subscription->id,
                    'is_active' => $subscription->isActive,
                    'plan_name' => $subscription->plan_name,
                    'text_sessions_remaining' => $subscription->text_sessions_remaining,
                    'voice_calls_remaining' => $subscription->voice_calls_remaining,
                    'video_calls_remaining' => $subscription->video_calls_remaining,
                    'expires_at' => $subscription->expires_at,
                ] : null,
                'appointments' => $appointments,
                'active_sessions' => TextSession::where('patient_id', $user->id)
                    ->with(['doctor:id,first_name,last_name,profile_picture,specialization'])
                    ->where('status', 'active')
                    ->get(),
            ];
        });
    }
}
