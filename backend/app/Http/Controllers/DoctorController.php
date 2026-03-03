<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use App\Models\DoctorAvailability;

class DoctorController extends Controller
{
    /**
     * Doctor heartbeat: updates last_active_at for availability computations.
     */
    public function heartbeat(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isDoctor()) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can send heartbeat'
            ], 403);
        }

        DoctorAvailability::updateOrCreate(
            ['doctor_id' => $user->id],
            ['last_active_at' => now()]
        );

        return response()->json(['success' => true], 200);
    }

    private function isWithinWorkingHoursSlot(array $workingHours, Carbon $now, string $dayKey): bool
    {
        $day = $workingHours[$dayKey] ?? null;
        if (!is_array($day) || empty($day['enabled']) || empty($day['slots']) || !is_array($day['slots'])) {
            return false;
        }

        $nowMinutes = ((int) $now->format('H')) * 60 + ((int) $now->format('i'));

        foreach ($day['slots'] as $slot) {
            if (!is_array($slot)) continue;
            $start = (string) ($slot['start'] ?? '');
            $end = (string) ($slot['end'] ?? '');
            if ($start === '' || $end === '') continue;

            [$sh, $sm] = array_pad(explode(':', $start), 2, '0');
            [$eh, $em] = array_pad(explode(':', $end), 2, '0');
            $startMinutes = ((int) $sh) * 60 + ((int) $sm);
            $endMinutes = ((int) $eh) * 60 + ((int) $em);

            if ($endMinutes <= $startMinutes) {
                // Crosses midnight (rare, but handle): treat as two segments.
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
                if (!is_array($slot)) continue;
                $start = (string) ($slot['start'] ?? '');
                $end = (string) ($slot['end'] ?? '');
                if ($start === '' || $end === '') continue;

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
        if ($currentIdx === false) $currentIdx = 0;

        for ($offset = 0; $offset < 7; $offset++) {
            $idx = ($currentIdx + $offset) % 7;
            $searchDayKey = $dayKeys[$idx];
            $searchDay = $workingHours[$searchDayKey] ?? null;
            if (!is_array($searchDay) || empty($searchDay['enabled']) || empty($searchDay['slots']) || !is_array($searchDay['slots'])) {
                continue;
            }

            $candidateStarts = [];
            foreach ($searchDay['slots'] as $slot) {
                if (!is_array($slot)) continue;
                $start = (string) ($slot['start'] ?? '');
                if ($start === '') continue;
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

    private function computeAvailabilityState(?DoctorAvailability $availability): array
    {
        if (!$availability) {
            return [
                'is_within_hours' => false,
                'is_heartbeat_fresh' => false,
                'is_available_now' => false,
                'is_on_break' => false,
            ];
        }

        $nowUtc = Carbon::now('UTC');

        $workingHours = is_array($availability->working_hours)
            ? $availability->working_hours
            : json_decode($availability->working_hours, true);
        if (!is_array($workingHours)) {
            return [
                'is_within_hours' => false,
                'is_heartbeat_fresh' => false,
                'is_available_now' => false,
                'is_on_break' => false,
            ];
        }

        $doctorTz = 'Africa/Blantyre';
        $nowLocal = $nowUtc->copy()->setTimezone($doctorTz);
        $dayKey = strtolower($nowLocal->format('l'));

        $isWithinHours = $this->isWithinWorkingHoursSlot($workingHours, $nowLocal, $dayKey);

        $isHeartbeatFresh = false;
        if ($availability->last_active_at) {
            $isHeartbeatFresh = Carbon::parse($availability->last_active_at)
                ->diffInMinutes($nowUtc) <= 3;
        }

        $manuallyOffline = (bool) $availability->manually_offline;

        $isAvailableNow = $isWithinHours && !$manuallyOffline && $isHeartbeatFresh;
        $isOnBreak = $isWithinHours && !$manuallyOffline && !$isHeartbeatFresh;

        return [
            'is_within_hours' => $isWithinHours,
            'is_heartbeat_fresh' => $isHeartbeatFresh,
            'is_available_now' => $isAvailableNow,
            'is_on_break' => $isOnBreak,
        ];
    }

    private function computeIsAvailableNow(?DoctorAvailability $availability): bool
    {
        if (!$availability) return false;

        $nowUtc = Carbon::now('UTC');

        if ($availability->manually_offline) {
            return false;
        }

        if ($availability->manually_online) {
            return true;
        }

        $workingHours = is_array($availability->working_hours)
            ? $availability->working_hours
            : json_decode($availability->working_hours, true);
        if (!is_array($workingHours)) return false;

        // Working hours are stored in the doctor's local time, so compare using local time.
        $doctorTz = 'Africa/Blantyre';
        $nowLocal = $nowUtc->copy()->setTimezone($doctorTz);

        $dayKey = strtolower($nowLocal->format('l'));
        return $this->isWithinWorkingHoursSlot($workingHours, $nowLocal, $dayKey);
    }

    /**
     * Get all available specializations with their sub-specializations
     */
    public function getSpecializations()
    {
        // Cache the specializations for 24 hours since they don't change often
        return Cache::remember('doctor_specializations', 86400, function () {
            return response()->json([
                'success' => true,
                'data' => [
                    'General Medicine' => [
                        'Family Medicine',
                        'Internal Medicine',
                        'Emergency Medicine',
                        'Preventive Medicine'
                    ],
                    'Heart & Blood (Cardiology)' => [
                        'General Heart Care',
                        'Heart Surgery',
                        'Blood Pressure & Circulation',
                        'Heart Rhythm Problems'
                    ],
                    'Children\'s Health' => [
                        'General Child Care',
                        'Newborn Care',
                        'Child Development',
                        'Children\'s Emergency Care'
                    ],
                    'Women\'s Health' => [
                        'Pregnancy & Childbirth',
                        'Female Health',
                        'Fertility Care',
                        'Women\'s Surgery'
                    ],
                    'Brain & Nerves' => [
                        'General Brain Care',
                        'Headache & Pain',
                        'Stroke Care',
                        'Memory & Movement'
                    ],
                    'Bones & Joints' => [
                        'Joint Care',
                        'Sports Injuries',
                        'Spine Care',
                        'Bone Surgery'
                    ],
                    'Mental Health' => [
                        'General Mental Health',
                        'Anxiety & Depression',
                        'Child Mental Health',
                        'Addiction Treatment'
                    ],
                    'Skin Care' => [
                        'General Skin Care',
                        'Skin Conditions',
                        'Cosmetic Care',
                        'Skin Cancer'
                    ],
                    'Eye Care' => [
                        'General Eye Care',
                        'Vision Problems',
                        'Eye Surgery',
                        'Children\'s Eye Care'
                    ],
                    'Ear, Nose & Throat' => [
                        'General ENT Care',
                        'Hearing Problems',
                        'Sinus & Allergy',
                        'Voice & Speech'
                    ],
                    'Sexual Health' => [
                        'General Sexual Health',
                        'Sexual Function',
                        'Sexual Education',
                        'Sexual Therapy'
                    ],
                    'Oncology (Cancer Care)' => [
                        'General Oncology',
                        'Breast Cancer',
                        'Lung Cancer',
                        'Blood Cancer',
                        'Pediatric Oncology'
                    ],
                    'Endocrinology (Hormones & Metabolism)' => [
                        'Diabetes Care',
                        'Thyroid Disorders',
                        'Hormone Therapy',
                        'Metabolic Disorders',
                        'Reproductive Endocrinology'
                    ],
                    'Gastroenterology (Digestive Health)' => [
                        'General Gastroenterology',
                        'Liver Disease',
                        'Inflammatory Bowel Disease',
                        'Digestive Disorders',
                        'Endoscopy'
                    ]
                ]
            ]);
        });
    }

    /**
     * Get doctors by specialization
     */
    public function getDoctorsBySpecialization(Request $request)
    {
        $request->validate([
            'specialization' => 'required|string'
        ]);

        $doctors = User::with(['doctorAvailability'])->where('user_type', 'doctor')
            ->where('status', 'approved')
            ->where(function($query) use ($request) {
                // Check both old single specialization field and new multiple specializations
                $query->where('specialization', $request->specialization)
                      ->orWhereJsonContains('specializations', $request->specialization);
            })
            ->select([
                'id',
                'first_name',
                'last_name',
                'display_name',
                'specialization',
                'sub_specialization',
                'specializations',
                'sub_specializations',
                'years_of_experience',
                'bio',
                'rating',
                'total_ratings'
            ])
            ->get();

        $doctors->transform(function ($doctor) {
            $doctorData = $doctor->toArray();
            $availability = $doctor->doctorAvailability;
            $state = $this->computeAvailabilityState($availability);
            $doctorData['is_available_now'] = (bool) ($state['is_available_now'] ?? false);
            $doctorData['is_on_break'] = (bool) ($state['is_on_break'] ?? false);
            $doctorData['is_online'] = $availability ? (bool) $availability->is_online : false;
            return $doctorData;
        });

        return response()->json([
            'success' => true,
            'data' => $doctors
        ]);
    }

    /**
     * Get doctor details
     */
    public function getDoctorDetails($id)
    {
        try {
            \Log::info('Fetching doctor details for ID: ' . $id);
            
            // First, let's check if the user exists at all
            $user = User::find($id);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }
            
            // Check if it's a doctor
            if ($user->user_type !== 'doctor') {
                return response()->json([
                    'success' => false,
                    'message' => 'User is not a doctor'
                ], 404);
            }
            
            \Log::info('Doctor found: ' . $user->first_name . ' ' . $user->last_name);

            // Build basic doctor data
            $doctorData = [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->display_name,
                'specialization' => $user->specialization,
                'sub_specialization' => $user->sub_specialization,
                'specializations' => $user->specializations,
                'sub_specializations' => $user->sub_specializations,
                'languages_spoken' => $user->languages_spoken,
                'years_of_experience' => $user->years_of_experience,
                'bio' => $user->bio,
                'country' => $user->country,
                'city' => $user->city,
                'rating' => $user->rating,
                'total_ratings' => $user->total_ratings,
                'created_at' => $user->created_at,
                'profile_picture' => $user->profile_picture,
                'profile_picture_url' => $user->profile_picture_url,
                'is_online' => false,
                'is_available_now' => false,
            ];

            // Safely handle availability
            try {
                $availability = DoctorAvailability::where('doctor_id', $id)->first();
                $doctorData['is_online'] = $availability ? $availability->is_online : false;
                $state = $this->computeAvailabilityState($availability);
                $doctorData['is_available_now'] = (bool) ($state['is_available_now'] ?? false);
                $doctorData['is_on_break'] = (bool) ($state['is_on_break'] ?? false);

                $doctorTz = 'Africa/Blantyre';
                $nowLocal = Carbon::now($doctorTz);
                $workingHours = is_array($availability?->working_hours)
                    ? $availability->working_hours
                    : json_decode($availability?->working_hours, true);
                $shiftInfo = is_array($workingHours)
                    ? $this->computeShiftInfo($workingHours, $nowLocal)
                    : ['current_slot_end' => null, 'next_slot_start' => null];
                $doctorData['current_slot_end'] = $shiftInfo['current_slot_end'] ?? null;
                $doctorData['next_slot_start'] = $shiftInfo['next_slot_start'] ?? null;
            } catch (\Exception $e) {
                \Log::warning('Error getting doctor availability: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'data' => $doctorData
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching doctor details: ' . $e->getMessage(), [
                'doctor_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching doctor details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get doctor availability settings
     */
    public function getAvailability($id)
    {
        $doctor = User::where('user_type', 'doctor')
            ->where('id', $id)
            ->firstOrFail();

        // Get availability from doctor_availabilities table or return default
        $availability = \App\Models\DoctorAvailability::where('doctor_id', $id)->first();
        
        if (!$availability) {
            // Return default availability structure
            $defaultAvailability = [
                'is_online' => false,
                'working_hours' => [
                    'monday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'tuesday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'wednesday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'thursday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'friday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'saturday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                    'sunday' => ['enabled' => false, 'slots' => [['start' => '09:00', 'end' => '17:00']]],
                ],
                'max_patients_per_day' => 10,
                'auto_accept_appointments' => false,
            ];

            return response()->json([
                'success' => true,
                'data' => $defaultAvailability
            ]);
        }

        $doctorTz = 'Africa/Blantyre';
        $nowLocal = Carbon::now($doctorTz);

        $workingHours = is_array($availability->working_hours)
            ? $availability->working_hours
            : json_decode($availability->working_hours, true);
        $shiftInfo = is_array($workingHours)
            ? $this->computeShiftInfo($workingHours, $nowLocal)
            : ['current_slot_end' => null, 'next_slot_start' => null];

        $state = $this->computeAvailabilityState($availability);

        return response()->json([
            'success' => true,
            'data' => [
                'is_online' => $availability->is_online,
                'is_available_now' => (bool) ($state['is_available_now'] ?? false),
                'is_on_break' => (bool) ($state['is_on_break'] ?? false),
                'working_hours' => is_array($availability->working_hours)
                    ? $availability->working_hours
                    : json_decode($availability->working_hours, true),
                'max_patients_per_day' => $availability->max_patients_per_day,
                'auto_accept_appointments' => $availability->auto_accept_appointments,
                'manually_offline' => (bool) $availability->manually_offline,
                'manually_online' => (bool) $availability->manually_online,
                'current_slot_end' => $shiftInfo['current_slot_end'] ?? null,
                'next_slot_start' => $shiftInfo['next_slot_start'] ?? null,
            ]
        ]);
    }

    /**
     * Update doctor availability settings
     */
    public function updateAvailability(Request $request, $id)
    {
        // Check if the authenticated user is a doctor and owns this availability
        $user = $request->user();
        if (!$user->isDoctor() || $user->id != $id) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can update their own availability'
            ], 403);
        }

        $request->validate([
            'is_online' => 'boolean',
            'working_hours' => 'array',
            'max_patients_per_day' => 'integer|min:1|max:50',
            'auto_accept_appointments' => 'boolean',
            'manually_offline' => 'boolean',
            'manually_online' => 'boolean',
        ]);

        $doctor = User::where('user_type', 'doctor')
            ->where('id', $id)
            ->firstOrFail();

        $manualOffline = (bool) $request->input('manually_offline', false);
        $manualOnline = (bool) $request->input('manually_online', false);

        // Ensure mutual exclusivity
        if ($manualOffline && $manualOnline) {
            $manualOnline = false;
        }

        // Update or create availability record
        $availability = \App\Models\DoctorAvailability::updateOrCreate(
            ['doctor_id' => $id],
            [
                'is_online' => $request->input('is_online', false),
                'working_hours' => json_encode($request->input('working_hours', [])),
                'max_patients_per_day' => $request->input('max_patients_per_day', 10),
                'auto_accept_appointments' => $request->input('auto_accept_appointments', false),
                'manually_offline' => $manualOffline,
                'manually_online' => $manualOnline,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Availability updated successfully',
            'data' => [
                'is_online' => $availability->is_online,
                'working_hours' => json_decode($availability->working_hours, true),
                'max_patients_per_day' => $availability->max_patients_per_day,
                'auto_accept_appointments' => $availability->auto_accept_appointments,
                'manually_offline' => (bool) $availability->manually_offline,
                'manually_online' => (bool) $availability->manually_online,
            ]
        ]);
    }
} 