<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DoctorController extends Controller
{
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

        $doctors = User::where('user_type', 'doctor')
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
                'is_online' => false
            ];

            // Safely handle availability
            try {
                $availability = \App\Models\DoctorAvailability::where('doctor_id', $id)->first();
                $doctorData['is_online'] = $availability ? $availability->is_online : false;
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

        return response()->json([
            'success' => true,
            'data' => [
                'is_online' => $availability->is_online,
                'working_hours' => json_decode($availability->working_hours, true),
                'max_patients_per_day' => $availability->max_patients_per_day,
                'auto_accept_appointments' => $availability->auto_accept_appointments,
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
        ]);

        $doctor = User::where('user_type', 'doctor')
            ->where('id', $id)
            ->firstOrFail();

        // Update or create availability record
        $availability = \App\Models\DoctorAvailability::updateOrCreate(
            ['doctor_id' => $id],
            [
                'is_online' => $request->input('is_online', false),
                'working_hours' => json_encode($request->input('working_hours', [])),
                'max_patients_per_day' => $request->input('max_patients_per_day', 10),
                'auto_accept_appointments' => $request->input('auto_accept_appointments', false),
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
            ]
        ]);
    }
} 