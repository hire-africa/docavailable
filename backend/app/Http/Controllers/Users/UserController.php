<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Subscription;
use App\Models\DoctorAvailability;
use App\Traits\HasImageUrls;
use Carbon\Carbon;

class UserController extends Controller
{
    use HasImageUrls;

    private function isWithinWorkingHoursSlot(array $workingHours, Carbon $now, string $dayKey): bool
    {
        $day = $workingHours[$dayKey] ?? null;
        if (!is_array($day) || empty($day['enabled']) || empty($day['slots']) || !is_array($day['slots'])) {
            return false;
        }

        $nowMinutes = ((int) $now->format('H')) * 60 + ((int) $now->format('i'));

        foreach ($day['slots'] as $slot) {
            if (!is_array($slot))
                continue;
            $start = (string) ($slot['start'] ?? '');
            $end = (string) ($slot['end'] ?? '');
            if ($start === '' || $end === '')
                continue;

            [$sh, $sm] = array_pad(explode(':', $start), 2, '0');
            [$eh, $em] = array_pad(explode(':', $end), 2, '0');
            $startMinutes = ((int) $sh) * 60 + ((int) $sm);
            $endMinutes = ((int) $eh) * 60 + ((int) $em);

            if ($endMinutes <= $startMinutes) {
                if ($nowMinutes >= $startMinutes || $nowMinutes < $endMinutes) {
                    return true;
                }
            } else {
                if ($nowMinutes >= $startMinutes && $nowMinutes < $endMinutes) {
                    return true;
                }
            }
        }

        return false;
    }

    private function computeShiftInfo(array $workingHours, Carbon $nowLocal): array
    {
        $dayKey = strtolower($nowLocal->format('l'));
        $day = $workingHours[$dayKey] ?? null;

        $nowMinutes = ((int) $nowLocal->format('H')) * 60 + ((int) $nowLocal->format('i'));

        $currentSlotEndMinutes = null;
        if (is_array($day) && !empty($day['enabled']) && !empty($day['slots']) && is_array($day['slots'])) {
            foreach ($day['slots'] as $slot) {
                if (!is_array($slot))
                    continue;
                $start = (string) ($slot['start'] ?? '');
                $end = (string) ($slot['end'] ?? '');
                if ($start === '' || $end === '')
                    continue;

                [$sh, $sm] = array_pad(explode(':', $start), 2, '0');
                [$eh, $em] = array_pad(explode(':', $end), 2, '0');
                $startMinutes = ((int) $sh) * 60 + ((int) $sm);
                $endMinutes = ((int) $eh) * 60 + ((int) $em);

                $inSlot = false;
                if ($endMinutes <= $startMinutes) {
                    $inSlot = ($nowMinutes >= $startMinutes || $nowMinutes < $endMinutes);
                } else {
                    $inSlot = ($nowMinutes >= $startMinutes && $nowMinutes < $endMinutes);
                }

                if ($inSlot) {
                    $currentSlotEndMinutes = $endMinutes;
                    break;
                }
            }
        }

        $formatHm = function (Carbon $baseDate, int $minutes): string {
            $d = $baseDate->copy()->startOfDay()->addMinutes($minutes);
            return $d->format('H:i');
        };

        $currentSlotEnd = null;
        if ($currentSlotEndMinutes !== null) {
            $currentSlotEnd = $formatHm($nowLocal, $currentSlotEndMinutes);
        }

        $nextSlotStart = null;
        $dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $currentIdx = array_search($dayKey, $dayKeys, true);
        if ($currentIdx === false)
            $currentIdx = 0;

        for ($offset = 0; $offset < 7; $offset++) {
            $idx = ($currentIdx + $offset) % 7;
            $searchDayKey = $dayKeys[$idx];
            $searchDay = $workingHours[$searchDayKey] ?? null;
            if (!is_array($searchDay) || empty($searchDay['enabled']) || empty($searchDay['slots']) || !is_array($searchDay['slots'])) {
                continue;
            }

            $candidateStarts = [];
            foreach ($searchDay['slots'] as $slot) {
                if (!is_array($slot))
                    continue;
                $start = (string) ($slot['start'] ?? '');
                if ($start === '')
                    continue;
                [$sh, $sm] = array_pad(explode(':', $start), 2, '0');
                $startMinutes = ((int) $sh) * 60 + ((int) $sm);
                if ($offset === 0 && $startMinutes <= $nowMinutes) {
                    continue;
                }
                $candidateStarts[] = $startMinutes;
            }

            if (!empty($candidateStarts)) {
                sort($candidateStarts);
                $startMinutes = $candidateStarts[0];

                $labelDay = $offset === 0
                    ? ''
                    : ' ' . ucfirst($searchDayKey);

                $nextSlotStart = trim($labelDay . ' at ' . $formatHm($nowLocal->copy()->addDays($offset), $startMinutes));
                break;
            }
        }

        return [
            'current_slot_end' => $currentSlotEnd,
            'next_slot_start' => $nextSlotStart,
        ];
    }

    public function subscription(Request $request)
    {
        try {
            $user = User::find(auth()->user()->id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'User not found'
                ], 404);
            }

            // Clean up expired subscriptions on access (handles case where cron is not running)
            $expiredSubs = Subscription::where('user_id', $user->id)
                ->where('is_active', true)
                ->whereNotNull('end_date')
                ->where('end_date', '<', now())
                ->get();

            if ($expiredSubs->isNotEmpty()) {
                foreach ($expiredSubs as $expiredSub) {
                    \Log::info("Cleaning up expired subscription on access", [
                        'subscription_id' => $expiredSub->id,
                        'user_id' => $user->id,
                        'end_date' => $expiredSub->end_date,
                    ]);
                    $expiredSub->delete();
                }

                // Send expiration notification (once, not per subscription)
                try {
                    $notificationService = new \App\Services\NotificationService();
                    $notificationService->createNotification(
                        $user->id,
                        'Subscription Expired',
                        $expiredSubs->count() === 1
                        ? 'Your subscription has expired. Please renew to continue using our services.'
                        : $expiredSubs->count() . ' subscriptions have expired. Please renew to continue using our services.',
                        'subscription',
                        ['expired_count' => $expiredSubs->count()]
                    );
                } catch (\Exception $e) {
                    // Non-blocking
                    \Log::warning("Failed to send expiration notification", ['error' => $e->getMessage()]);
                }
            }

            // Get aggregated sessions across all active (non-expired) subscriptions
            $aggregated = Subscription::getAggregatedSessions($user->id);
            $subs = $aggregated['subscriptions'];

            if ($subs->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No subscription found'
                ]);
            }

            // Use the newest subscription for plan metadata (name, price, etc.)
            $newest = $subs->last();
            // Use the earliest end_date for display
            $earliestEnd = $subs->min('end_date');
            $latestEnd = $subs->max('end_date');

            $responseData = [
                'id' => $newest->id,
                'plan_id' => $newest->plan_id,
                'planName' => $newest->plan_name,
                'plan_price' => $newest->plan_price,
                'plan_currency' => $newest->plan_currency,
                'textSessionsRemaining' => $aggregated['text_sessions_remaining'],
                'voiceCallsRemaining' => $aggregated['voice_calls_remaining'],
                'videoCallsRemaining' => $aggregated['video_calls_remaining'],
                'totalTextSessions' => $aggregated['total_text_sessions'],
                'totalVoiceCalls' => $aggregated['total_voice_calls'],
                'totalVideoCalls' => $aggregated['total_video_calls'],
                'activatedAt' => $newest->activated_at,
                'expiresAt' => $latestEnd,
                'isActive' => true,
                'status' => 1,
                'start_date' => $newest->start_date,
                'end_date' => $latestEnd,
                'active_subscriptions_count' => $subs->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $responseData
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in subscription endpoint', [
                'error' => $e->getMessage(),
                'user_id' => auth()->user()->id ?? 'null'
            ]);

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error loading subscription: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create_subscription(Request $request)
    {
        // Redirect to payment controller for proper subscription creation
        return response()->json([
            'success' => false,
            'message' => 'Please use the payment system to create subscriptions. Use /api/payments/paychangu/initiate endpoint.',
            'redirect_to' => '/api/payments/paychangu/initiate'
        ], 400);
    }

    public function update_subscription(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:plans,id',
        ]);
        $user = User::find(auth()->user()->id);
        $user->subscription()->update([
            'plan_id' => $request->plan_id,
            'status' => 1,
        ]);
        return response()->json($user->subscription);
    }

    public function getUserById($id)
    {
        try {
            $user = User::find($id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            // Generate full URLs for images if they exist
            $userData = $this->generateImageUrls($user);

            // Add additional fields that might not be in the trait
            $userData['specialization'] = $user->specialization;
            $userData['years_of_experience'] = $user->years_of_experience;
            $userData['bio'] = $user->bio;
            $userData['city'] = $user->city;
            $userData['country'] = $user->country;
            $userData['status'] = $user->status;
            $userData['rating'] = $user->rating;
            $userData['total_ratings'] = $user->total_ratings;

            return response()->json([
                'success' => true,
                'data' => $userData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPatientSubscription($patientId)
    {
        try {
            // Aggregate sessions across all active subscriptions
            $aggregated = Subscription::getAggregatedSessions($patientId);
            $subs = $aggregated['subscriptions'];

            if ($subs->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No active subscription found'
                ]);
            }

            $newest = $subs->last();
            $latestEnd = $subs->max('end_date');

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $newest->id,
                    'plan_id' => $newest->plan_id,
                    'plan_name' => $newest->plan_name,
                    'plan_price' => $newest->plan_price,
                    'plan_currency' => $newest->plan_currency,
                    'textSessionsRemaining' => $aggregated['text_sessions_remaining'],
                    'voiceCallsRemaining' => $aggregated['voice_calls_remaining'],
                    'videoCallsRemaining' => $aggregated['video_calls_remaining'],
                    'totalTextSessions' => $aggregated['total_text_sessions'],
                    'totalVoiceCalls' => $aggregated['total_voice_calls'],
                    'totalVideoCalls' => $aggregated['total_video_calls'],
                    'activatedAt' => $newest->activated_at,
                    'expiresAt' => $latestEnd,
                    'isActive' => true,
                    'active_subscriptions_count' => $subs->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subscription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active doctors for appointment booking
     */
    public function getActiveDoctors(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 20);
            $search = $request->get('search');
            $specialty = $request->get('specialty');

            $query = User::where('user_type', 'doctor')
                ->whereIn('status', ['active', 'approved']);

            // Apply search filter
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('display_name', 'like', "%{$search}%")
                        ->orWhere('specialization', 'like', "%{$search}%");
                });
            }

            // Apply specialty filter
            if ($specialty) {
                $query->where('specialization', 'like', "%{$specialty}%");
            }

            $doctors = $query->select([
                'id',
                'first_name',
                'last_name',
                'display_name',
                'email',
                'specialization',
                'years_of_experience',
                'bio',
                'city',
                'country',
                'status',
                'rating',
                'total_ratings',
                'profile_picture'
            ])
                ->orderBy('years_of_experience', 'desc')
                ->orderBy('id', 'desc')
                ->paginate($perPage);

            // Add profile picture URLs to each doctor
            $doctors->getCollection()->transform(function ($doctor) {
                $doctorData = $doctor->toArray();

                // Add profile picture URL using model accessor (handles absolute/relative)
                if ($doctor->profile_picture) {
                    $doctorData['profile_picture_url'] = $doctor->profile_picture_url;
                }

                // Get actual availability info from doctor_availabilities table
                $availability = \App\Models\DoctorAvailability::where('doctor_id', $doctor->id)->first();
                if ($availability) {
                    $doctorData['is_online'] = $availability->is_online;
                    $doctorData['is_online_for_instant_sessions'] = $availability->is_online;
                    $doctorData['working_hours'] = $availability->working_hours;
                    $doctorData['max_patients_per_day'] = $availability->max_patients_per_day;

                    $nowUtc = Carbon::now('UTC');
                    $doctorTz = 'Africa/Blantyre';
                    $nowLocal = $nowUtc->copy()->setTimezone($doctorTz);

                    $workingHours = is_array($availability->working_hours)
                        ? $availability->working_hours
                        : json_decode($availability->working_hours, true);

                    $dayKey = strtolower($nowLocal->format('l'));
                    $isWithinHours = is_array($workingHours)
                        ? $this->isWithinWorkingHoursSlot($workingHours, $nowLocal, $dayKey)
                        : false;

                    $isHeartbeatFresh = false;
                    if ($availability->last_active_at) {
                        $isHeartbeatFresh = Carbon::parse($availability->last_active_at)
                            ->diffInMinutes($nowUtc) <= 3;
                    }

                    $manuallyOffline = (bool) $availability->manually_offline;

                    $doctorData['is_available_now'] = $isWithinHours && !$manuallyOffline && $isHeartbeatFresh;
                    $doctorData['is_on_break'] = $isWithinHours && !$manuallyOffline && !$isHeartbeatFresh;

                    $shiftInfo = is_array($workingHours)
                        ? $this->computeShiftInfo($workingHours, $nowLocal)
                        : ['current_slot_end' => null, 'next_slot_start' => null];
                    $doctorData['current_slot_end'] = $shiftInfo['current_slot_end'] ?? null;
                    $doctorData['next_slot_start'] = $shiftInfo['next_slot_start'] ?? null;
                } else {
                    // Set default availability info if no record exists
                    $doctorData['is_online'] = false;
                    $doctorData['is_online_for_instant_sessions'] = false;
                    $doctorData['working_hours'] = null;
                    $doctorData['max_patients_per_day'] = 10;
                    $doctorData['is_available_now'] = false;
                    $doctorData['is_on_break'] = false;
                    $doctorData['current_slot_end'] = null;
                    $doctorData['next_slot_start'] = null;
                }

                return $doctorData;
            });

            return $this->success($doctors, 'Active doctors fetched successfully');
        } catch (\Exception $e) {
            \Log::error('Error fetching active doctors:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->error('Failed to fetch active doctors: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get user's online status
     */
    public function getOnlineStatus(Request $request, $userId)
    {
        try {
            $user = User::find($userId);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            // For now, we'll use a simple approach based on last activity
            // You can enhance this with more sophisticated logic later
            $isOnline = false;

            // Check if user has been active in the last 5 minutes
            if ($user->last_online_at) {
                $lastActivity = \Carbon\Carbon::parse($user->last_online_at);
                $isOnline = $lastActivity->diffInMinutes(now()) < 5;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'is_online' => $isOnline,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get online status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user's online status
     */
    public function updateOnlineStatus(Request $request)
    {
        try {
            $user = $request->user();

            $user->update([
                'last_online_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Online status updated successfully',
                'data' => [
                    'user_id' => $user->id,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update online status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to manually set user as online (for testing)
     */
    public function setUserOnline(Request $request, $userId)
    {
        try {
            $user = User::find($userId);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $user->update([
                'last_online_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User set as online successfully',
                'data' => [
                    'user_id' => $user->id,
                    'last_online_at' => $user->last_online_at
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to set user online: ' . $e->getMessage()
            ], 500);
        }
    }
}
