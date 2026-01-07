<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Appointment;
use App\Services\AppointmentService;
use App\Services\NotificationService;
use App\Services\AnonymizationService;
use App\Http\Requests\AppointmentRequest;

class AppointmentController extends Controller
{
    protected $appointmentService;
    protected $notificationService;
    protected $anonymizationService;

    public function __construct(AppointmentService $appointmentService, NotificationService $notificationService, AnonymizationService $anonymizationService)
    {
        $this->appointmentService = $appointmentService;
        $this->notificationService = $notificationService;
        $this->anonymizationService = $anonymizationService;
    }

    // Get appointments for current user
    public function appointments(Request $request)
    {
        $user = auth()->user();
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');
        $date = $request->get('date');

        // Use caching for better performance with shorter cache duration
        $cacheKey = "user_appointments_{$user->id}_{$user->user_type}_{$perPage}_{$status}_{$date}";

        $appointments = \Illuminate\Support\Facades\Cache::remember($cacheKey, 60, function () use ($user, $perPage, $status, $date) {
            $query = $user->user_type === 'doctor'
                ? $user->doctorAppointments()->with(['patient:id,first_name,last_name,gender,country,city,date_of_birth,profile_picture,privacy_preferences'])
                : $user->appointments()->with(['doctor:id,first_name,last_name,gender,country,city,date_of_birth,profile_picture']);

            // Apply filters
            if ($status !== null) {
                // Convert string status to numeric status
                $numericStatus = null;
                switch (strtolower($status)) {
                    case 'pending':
                        $numericStatus = \App\Models\Appointment::STATUS_PENDING;
                        break;
                    case 'confirmed':
                        $numericStatus = \App\Models\Appointment::STATUS_CONFIRMED;
                        break;
                    case 'cancelled':
                        $numericStatus = \App\Models\Appointment::STATUS_CANCELLED;
                        break;
                    case 'completed':
                        $numericStatus = \App\Models\Appointment::STATUS_COMPLETED;
                        break;
                    case 'reschedule_proposed':
                        $numericStatus = \App\Models\Appointment::STATUS_RESCHEDULE_PROPOSED;
                        break;
                    case 'reschedule_accepted':
                        $numericStatus = \App\Models\Appointment::STATUS_RESCHEDULE_ACCEPTED;
                        break;
                    case 'reschedule_rejected':
                        $numericStatus = \App\Models\Appointment::STATUS_RESCHEDULE_REJECTED;
                        break;
                    default:
                        // If it's already a number, use it as is
                        if (is_numeric($status)) {
                            $numericStatus = (int) $status;
                        }
                        break;
                }

                if ($numericStatus !== null) {
                    $query->where('status', $numericStatus);
                }
            }

            if ($date) {
                $query->whereDate('appointment_date', $date);
            }

            $appointments = $query->orderBy('appointment_date', 'desc')
                ->orderBy('appointment_time', 'asc')
                ->paginate($perPage);

            // Add profile picture URLs and name fields to doctors/patients
            $appointments->getCollection()->transform(function ($appointment) use ($user) {
                $appointmentData = $appointment->toArray();

                // Log the raw appointment data for debugging
                \Log::info('📅 [AppointmentController] Raw appointment data', [
                    'id' => $appointment->id,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'status' => $appointment->status
                ]);

                // Add doctor profile picture URL and name
                if ($appointment->doctor) {
                    if ($appointment->doctor->profile_picture) {
                        $appointmentData['doctor']['profile_picture_url'] = $appointment->doctor->profile_picture_url;
                    }
                    $appointmentData['doctorName'] = $appointment->doctor->first_name . ' ' . $appointment->doctor->last_name;
                }

                // Add patient profile picture URL and name with anonymization
                if ($appointment->patient) {
                    \Log::info('🔍 [AppointmentController] Processing patient', [
                        'patient_id' => $appointment->patient->id,
                        'patient_name' => $appointment->patient->first_name . ' ' . $appointment->patient->last_name,
                        'privacy_preferences' => $appointment->patient->privacy_preferences
                    ]);

                    // Check if patient has anonymous mode enabled
                    $isAnonymous = $this->anonymizationService->isAnonymousModeEnabled($appointment->patient);
                    \Log::info('🔍 [AppointmentController] Anonymization check', [
                        'patient_id' => $appointment->patient->id,
                        'is_anonymous' => $isAnonymous
                    ]);

                    if ($isAnonymous) {
                        $anonymizedData = $this->anonymizationService->getAnonymizedUserData($appointment->patient);
                        $appointmentData['patientName'] = $anonymizedData['display_name'];
                        $appointmentData['patient']['profile_picture_url'] = $anonymizedData['profile_picture_url'];
                        $appointmentData['patient']['profile_picture'] = $anonymizedData['profile_picture'];
                        \Log::info('🔍 [AppointmentController] Applied anonymization', [
                            'patient_id' => $appointment->patient->id,
                            'original_name' => $appointment->patient->first_name . ' ' . $appointment->patient->last_name,
                            'anonymized_name' => $anonymizedData['display_name'],
                            'anonymized_picture' => $anonymizedData['profile_picture_url']
                        ]);
                    } else {
                        $appointmentData['patientName'] = $appointment->patient->first_name . ' ' . $appointment->patient->last_name;
                        if ($appointment->patient->profile_picture) {
                            $appointmentData['patient']['profile_picture_url'] = $appointment->patient->profile_picture_url;
                        }
                        \Log::info('🔍 [AppointmentController] No anonymization applied', [
                            'patient_id' => $appointment->patient->id,
                            'name' => $appointmentData['patientName']
                        ]);
                    }
                }

                return $appointmentData;
            });

            return $appointments;
        });

        return $this->success($appointments, 'Appointments fetched successfully');
    }

    // Create new appointment
    public function create_appointment(AppointmentRequest $request)
    {
        \Log::info('🔍 [AppointmentController] create_appointment started', [
            'user_id' => auth()->id(),
            'user_type' => auth()->user()->user_type ?? 'unknown',
            'request_data' => $request->all()
        ]);

        try {
            // Only patients can create appointments
            if (!auth()->user()->isPatient()) {
                \Log::warning('❌ [AppointmentController] Non-patient tried to create appointment', [
                    'user_id' => auth()->id(),
                    'user_type' => auth()->user()->user_type ?? 'unknown'
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Only patients can create appointments'
                ], 403);
            }

            \Log::info('✅ [AppointmentController] User validation passed', [
                'user_id' => auth()->id(),
                'is_patient' => auth()->user()->isPatient()
            ]);

            // Validate doctor exists and is approved
            $doctor = \App\Models\User::where('id', $request->doctor_id)
                ->where('user_type', 'doctor')
                ->where('status', 'approved')
                ->first();

            if (!$doctor) {
                \Log::error('❌ [AppointmentController] Invalid doctor specified', [
                    'doctor_id' => $request->doctor_id,
                    'patient_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Invalid doctor specified'
                ], 422);
            }

            \Log::info('✅ [AppointmentController] Doctor validation passed', [
                'doctor_id' => $doctor->id,
                'doctor_name' => $doctor->first_name . ' ' . $doctor->last_name
            ]);

            // Get user timezone for proper timezone handling
            $userTimezone = $request->get('user_timezone') ?: 'UTC';

            // Convert appointment time to UTC for storage
            $utcDateTime = \App\Services\TimezoneService::convertToUTC(
                $request->appointment_date,
                $request->appointment_time,
                $userTimezone
            );

            // FIX: Check for double booking before creating appointment
            $existingAppointment = Appointment::where('doctor_id', $request->doctor_id)
                ->where('appointment_datetime_utc', $utcDateTime)
                ->whereIn('status', [
                    Appointment::STATUS_PENDING,
                    Appointment::STATUS_CONFIRMED,
                    Appointment::STATUS_RESCHEDULE_PROPOSED
                ])
                ->first();

            if ($existingAppointment) {
                \Log::warning('❌ [AppointmentController] Double booking attempt prevented', [
                    'doctor_id' => $request->doctor_id,
                    'appointment_datetime_utc' => $utcDateTime,
                    'existing_appointment_id' => $existingAppointment->id,
                    'patient_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'This time slot is already booked. Please select a different time.'
                ], 409);
            }

            $appointmentData = [
                'patient_id' => auth()->user()->id,
                'doctor_id' => $request->doctor_id,
                'appointment_date' => $request->appointment_date,        // Keep old format for backward compatibility
                'appointment_time' => $request->appointment_time,        // Keep old format for backward compatibility
                'appointment_datetime_utc' => $utcDateTime,              // Add new UTC datetime
                'user_timezone' => $userTimezone,                        // Add user timezone
                'appointment_type' => $request->appointment_type ?? 'text',
                'reason' => $request->reason ?? null,
                'status' => $request->status ?? 0
            ];

            \Log::info('📤 [AppointmentController] Creating appointment with data', $appointmentData);

            // Use database transaction to prevent race conditions
            $appointment = \DB::transaction(function () use ($appointmentData, $request, $utcDateTime) {
                // Double-check for race conditions within transaction
                $doubleCheck = Appointment::where('doctor_id', $request->doctor_id)
                    ->where('appointment_datetime_utc', $utcDateTime)
                    ->whereIn('status', [
                        Appointment::STATUS_PENDING,
                        Appointment::STATUS_CONFIRMED,
                        Appointment::STATUS_RESCHEDULE_PROPOSED
                    ])
                    ->lockForUpdate()
                    ->first();

                if ($doubleCheck) {
                    throw new \Exception('Time slot was just booked by another patient. Please select a different time.');
                }

                return Appointment::create($appointmentData);
            });

            \Log::info('✅ [AppointmentController] Appointment created successfully', [
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id
            ]);

            // Clear related caches
            \App\Services\CacheService::clearAppointmentRelatedCaches($appointment);

            // Dispatch notification job
            \App\Jobs\SendAppointmentNotification::dispatch($appointment, 'appointment_created');

            // Send in-app notification to doctor about new appointment request
            try {
                $notificationService = new \App\Services\NotificationService();
                $patient = $appointment->patient;
                $doctor = $appointment->doctor;

                if ($doctor && $patient) {
                    $patientName = $patient->first_name . ' ' . $patient->last_name;
                    $notificationService->createNotification(
                        $doctor->id,
                        'New Appointment Request',
                        "You have a new appointment request from {$patientName}.",
                        'appointment',
                        [
                            'appointment_id' => $appointment->id,
                            'patient_name' => $patientName,
                        ]
                    );
                }
            } catch (\Exception $notificationError) {
                // Log but don't fail the request if notification fails
                \Log::warning("Failed to send appointment request notification", [
                    'appointment_id' => $appointment->id,
                    'error' => $notificationError->getMessage()
                ]);
            }

            \Log::info('✅ [AppointmentController] Cache cleared and notification dispatched');

            return $this->success($appointment->load('doctor'), 'Appointment created successfully', 201);

        } catch (\Exception $e) {
            \Log::error('❌ [AppointmentController] Appointment creation failed', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create appointment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update appointment
    public function update_appointment(AppointmentRequest $request, $id)
    {
        $appointment = Appointment::findOrFail($id);

        if (
            auth()->user()->id !== $appointment->patient_id &&
            auth()->user()->id !== $appointment->doctor_id
        ) {
            return $this->error('Unauthorized', 403);
        }

        $appointment->update($request->only(['status', 'appointment_date', 'appointment_time']));

        return $this->success($appointment->load(['patient', 'doctor']), 'Appointment updated successfully');
    }

    // Cancel appointment
    public function cancel_appointment($id)
    {
        $appointment = Appointment::findOrFail($id);

        if (
            auth()->user()->id !== $appointment->patient_id &&
            auth()->user()->id !== $appointment->doctor_id
        ) {
            return response()->json([
                "success" => false,
                "message" => "Unauthorized"
            ], 403);
        }

        $appointment->update(['status' => Appointment::STATUS_CANCELLED]);

        return response()->json([
            "success" => true,
            "message" => "Appointment cancelled successfully"
        ]);
    }

    // Doctor proposes reschedule
    public function propose_reschedule(Request $request, $id)
    {
        [$success, $result, $code] = $this->appointmentService->proposeReschedule($request, $id) + [null, null, null];
        if ($success === false) {
            return response()->json(["success" => false, "message" => $result], $code);
        }
        return response()->json([
            "success" => true,
            "message" => "Reschedule proposal sent to patient",
            "appointment" => $result->load(['patient', 'doctor'])
        ]);
    }

    // Patient responds to reschedule proposal
    public function respond_to_reschedule(Request $request, $id)
    {
        [$success, $appointment, $message, $code] = $this->appointmentService->respondToReschedule($request, $id) + [null, null, null, null];
        if ($success === false) {
            return response()->json(["success" => false, "message" => $appointment], $code);
        }
        return response()->json([
            "success" => true,
            "message" => $message,
            "appointment" => $appointment->load(['patient', 'doctor'])
        ]);
    }

    // Get pending reschedule proposals for patient
    public function pending_reschedules(Request $request)
    {
        $appointments = Appointment::where('patient_id', auth()->user()->id)
            ->where('status', Appointment::STATUS_RESCHEDULE_PROPOSED)
            ->with(['doctor'])
            ->get();

        return response()->json([
            "success" => true,
            "pending_reschedules" => $appointments
        ]);
    }

    // Get reschedule proposals sent by doctor
    public function doctor_reschedule_proposals(Request $request)
    {
        if (!auth()->user()->isDoctor()) {
            return response()->json([
                "success" => false,
                "message" => "Only doctors can access this endpoint"
            ], 403);
        }

        $appointments = Appointment::where('doctor_id', auth()->user()->id)
            ->whereIn('status', [
                Appointment::STATUS_RESCHEDULE_PROPOSED,
                Appointment::STATUS_RESCHEDULE_ACCEPTED,
                Appointment::STATUS_RESCHEDULE_REJECTED
            ])
            ->with(['patient'])
            ->get();

        return response()->json([
            "success" => true,
            "reschedule_proposals" => $appointments
        ]);
    }

    // Cancel reschedule proposal (doctor can cancel before patient responds)
    public function cancel_reschedule_proposal($id)
    {
        $appointment = Appointment::findOrFail($id);

        // Check if user is the doctor who proposed the reschedule
        if (
            auth()->user()->id !== $appointment->doctor_id ||
            auth()->user()->id !== $appointment->reschedule_proposed_by
        ) {
            return response()->json([
                "success" => false,
                "message" => "Unauthorized"
            ], 403);
        }

        // Check if reschedule is still pending
        if ($appointment->status !== Appointment::STATUS_RESCHEDULE_PROPOSED) {
            return response()->json([
                "success" => false,
                "message" => "Reschedule proposal is no longer pending"
            ], 400);
        }

        // Revert to original status
        $appointment->update([
            'status' => Appointment::STATUS_CONFIRMED,
            'reschedule_proposed_date' => null,
            'reschedule_proposed_time' => null,
            'reschedule_reason' => null,
            'reschedule_proposed_by' => null,
            'reschedule_status' => null
        ]);

        return response()->json([
            "success" => true,
            "message" => "Reschedule proposal cancelled",
            "appointment" => $appointment->load(['patient', 'doctor'])
        ]);
    }

    // Get available doctors
    public function available_doctors(Request $request)
    {
        $perPage = $request->get('per_page', 20);
        $specialty = $request->get('specialty');
        $date = $request->get('date');

        // Use caching for better performance
        $cacheKey = "available_doctors_{$perPage}_{$specialty}_{$date}";

        $doctors = \Illuminate\Support\Facades\Cache::remember($cacheKey, 600, function () use ($perPage, $specialty, $date) {
            $query = User::with(['doctorAvailability'])
                ->where('user_type', 'doctor')
                ->where('status', 'approved');

            // Apply filters
            if ($specialty) {
                $query->where('specialization', 'like', "%{$specialty}%");
            }

            if ($date) {
                $dayOfWeek = strtolower(date('l', strtotime($date)));
                $query->whereHas('doctorAvailability', function ($q) use ($dayOfWeek) {
                    $q->whereRaw("JSON_EXTRACT(working_hours, '$.{$dayOfWeek}.enabled') = true");
                });
            }

            $doctors = $query->paginate($perPage);

            // Add profile picture URLs and availability info
            $doctors->getCollection()->transform(function ($doctor) {
                $doctorData = $doctor->toArray();

                // Add profile picture URL
                if ($doctor->profile_picture) {
                    $doctorData['profile_picture_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($doctor->profile_picture);
                }

                // Add availability info
                if ($doctor->doctorAvailability) {
                    $doctorData['is_online'] = $doctor->doctorAvailability->is_online;
                    $doctorData['working_hours'] = json_decode($doctor->doctorAvailability->working_hours, true);
                    $doctorData['max_patients_per_day'] = $doctor->doctorAvailability->max_patients_per_day;
                }

                return $doctorData;
            });

            return $doctors;
        });

        return $this->success($doctors, 'Available doctors fetched successfully');
    }

    // Doctor: View their own appointments
    public function doctorAppointments(Request $request)
    {
        $doctor = $request->user();
        $appointments = $doctor->doctorAppointments()->with(['patient'])->get();

        // Apply anonymization to patient data
        $appointments->transform(function ($appointment) {
            if ($appointment->patient && $this->anonymizationService->isAnonymousModeEnabled($appointment->patient)) {
                $anonymizedData = $this->anonymizationService->getAnonymizedUserData($appointment->patient);
                $appointment->patient->first_name = $anonymizedData['first_name'];
                $appointment->patient->last_name = $anonymizedData['last_name'];
                $appointment->patient->profile_picture_url = $anonymizedData['profile_picture_url'];
                $appointment->patient->profile_picture = $anonymizedData['profile_picture'];
            }
            return $appointment;
        });

        return response()->json(['appointments' => $appointments]);
    }

    // Patient: View their own appointments
    public function patientAppointments(Request $request)
    {
        $patient = $request->user();
        $appointments = $patient->appointments()->with(['doctor'])->get();
        return response()->json(['appointments' => $appointments]);
    }

    public function getAppointmentById($id)
    {
        try {
            $appointment = \App\Models\Appointment::with(['patient', 'doctor'])
                ->find($id);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'patient_name' => $appointment->patient->first_name . ' ' . $appointment->patient->last_name,
                    'doctor_name' => $appointment->doctor->first_name . ' ' . $appointment->doctor->last_name,
                    'date' => $appointment->appointment_date,
                    'time' => $appointment->appointment_time,
                    'status' => $appointment->status,
                    'consultation_type' => $appointment->consultation_type,
                    'reason' => $appointment->reason,
                    'notes' => $appointment->notes,
                    'created_at' => $appointment->created_at,
                    'updated_at' => $appointment->updated_at,
                    'actual_start_time' => $appointment->actual_start_time,
                    'actual_end_time' => $appointment->actual_end_time,
                    'sessions_deducted' => $appointment->sessions_deducted,
                    'no_show' => $appointment->no_show,
                    'completed_at' => $appointment->completed_at,
                    'earnings_awarded' => $appointment->earnings_awarded
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function startSession($id)
    {
        try {
            $appointment = \App\Models\Appointment::find($id);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // CHECK 1: Time Window Validation
            // Allow starting 15 minutes before and up to 24 hours after
            $appointmentTime = \Carbon\Carbon::parse($appointment->appointment_date . ' ' . $appointment->appointment_time);
            $now = now();

            if ($now->diffInMinutes($appointmentTime, false) > 15) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too early to start session. You can start 15 minutes before the scheduled time.'
                ], 400);
            }

            // CHECK 2: Subscription Validation
            $patient = \App\Models\User::find($appointment->patient_id);
            if (!$patient || !$patient->subscription || !$patient->subscription->isActive) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient does not have an active subscription.'
                ], 403);
            }

            // CHECK 3: Balance Validation (Effective Balance)
            // We don't deduct immediately (in case doctor doesn't show), but we must ensure
            // the user has enough credits covering this AND any other active sessions.

            $subscription = $patient->subscription;
            $activeAppointmentsCount = \App\Models\Appointment::where('patient_id', $patient->id)
                ->where('status', \App\Models\Appointment::STATUS_IN_PROGRESS)
                ->where('id', '!=', $id) // Exclude current one if somehow already marked
                ->count();

            // Note: Text sessions are pay-as-you-go, so we don't strictly reserve for them here,
            // but we could check for active text sessions if we wanted to be very strict.

            $requiredSessions = 1 + $activeAppointmentsCount;

            $hasBalance = false;
            switch ($appointment->appointment_type ?? 'text') {
                case 'text':
                    $hasBalance = $subscription->text_sessions_remaining >= $requiredSessions;
                    break;
                case 'audio':
                    $hasBalance = $subscription->voice_calls_remaining >= $requiredSessions;
                    break;
                case 'video':
                    $hasBalance = $subscription->video_calls_remaining >= $requiredSessions;
                    break;
            }

            if (!$hasBalance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient session balance. You have ' . $activeAppointmentsCount . ' other session(s) in progress.'
                ], 403);
            }

            $appointment->update([
                'actual_start_time' => now(),
                'status' => \App\Models\Appointment::STATUS_IN_PROGRESS
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session started successfully',
                'data' => $appointment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start session: ' . $e->getMessage()
            ], 500);
        }
    }

    public function endSession($id)
    {
        try {
            $user = auth()->user();

            // Only patients can end sessions
            if ($user->user_type !== 'patient') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only patients can end sessions'
                ], 403);
            }

            $appointment = \App\Models\Appointment::find($id);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify the patient owns this appointment
            if ($appointment->patient_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to end this session'
                ], 403);
            }

            // Update appointment status first
            $appointment->update([
                'actual_end_time' => now(),
                'status' => \App\Models\Appointment::STATUS_COMPLETED,
                'completed_at' => now()
            ]);

            // Process payment and deduction using the comprehensive service
            $paymentService = new \App\Services\DoctorPaymentService();
            $paymentResult = $paymentService->processAppointmentEnd($appointment);

            // Send notifications about appointment end
            $this->notificationService->sendAppointmentNotification($appointment, 'completed', 'Your appointment has been completed');

            // Prepare response message based on payment results
            $responseMessage = 'Session ended successfully';
            $warnings = [];

            if (!$paymentResult['doctor_payment_success']) {
                $warnings[] = 'Doctor payment could not be processed';
            }
            if (!$paymentResult['patient_deduction_success']) {
                $warnings[] = 'Patient subscription deduction could not be processed';
            }

            if (!empty($warnings)) {
                $responseMessage .= '. Note: ' . implode(', ', $warnings);
            }

            return response()->json([
                'success' => true,
                'message' => $responseMessage,
                'data' => [
                    'appointment' => $appointment,
                    'payment_processing' => $paymentResult
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to end session: ' . $e->getMessage()
            ], 500);
        }
    }

    public function processPayment($id)
    {
        try {
            $appointment = \App\Models\Appointment::find($id);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Deduct session from patient's subscription
            $patient = User::find($appointment->patient_id);
            if ($patient && $patient->subscription) {
                $subscription = $patient->subscription;

                switch ($appointment->consultation_type) {
                    case 'text':
                        if ($subscription->text_sessions_remaining > 0) {
                            $subscription->decrement('text_sessions_remaining');
                            $appointment->update(['sessions_deducted' => 1]);
                        }
                        break;
                    case 'voice':
                        if ($subscription->voice_calls_remaining > 0) {
                            $subscription->decrement('voice_calls_remaining');
                            $appointment->update(['sessions_deducted' => 1]);
                        }
                        break;
                    case 'video':
                        if ($subscription->video_calls_remaining > 0) {
                            $subscription->decrement('video_calls_remaining');
                            $appointment->update(['sessions_deducted' => 1]);
                        }
                        break;
                }
            }

            // Award earnings to doctor
            $doctor = User::find($appointment->doctor_id);
            if ($doctor) {
                $earnings = 3500; // Default earnings amount - consistent with all session types
                $appointment->update(['earnings_awarded' => $earnings]);

                // Update doctor's wallet
                $wallet = $doctor->wallet;
                if ($wallet) {
                    $wallet->increment('balance', $earnings);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully',
                'data' => $appointment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Doctor: Update appointment status
    public function updateAppointmentStatus(Request $request, $id)
    {
        try {
            $appointment = $this->appointmentService->updateStatus($request, $id);
            return response()->json([
                'success' => true,
                'message' => 'Appointment status updated successfully',
                'data' => $appointment
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update appointment status: ' . $e->getMessage()
            ], 500);
        }
    }

    // Doctor: Delete expired appointment
    public function deleteExpiredAppointment(Request $request, $id)
    {
        try {
            $this->appointmentService->deleteExpiredAppointment($request, $id);
            return response()->json([
                'success' => true,
                'message' => 'Expired appointment deleted successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete appointment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Doctor: View their patients
    public function doctorPatients(Request $request)
    {
        $doctor = $request->user();
        $patients = $doctor->doctorAppointments()->with('patient')->get()->pluck('patient')->unique('id')->values();
        return response()->json(['patients' => $patients]);
    }

    // Patient: Book appointment
    public function bookAppointment(Request $request)
    {
        $patient = $request->user();
        $request->validate([
            'doctor_id' => 'required|exists:users,id',
            'appointment_date' => 'required|date',
            'appointment_time' => 'required',
        ]);
        $appointment = $patient->appointments()->create([
            'doctor_id' => $request->doctor_id,
            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time,
            'status' => 'pending',
        ]);
        return response()->json(['message' => 'Appointment booked', 'appointment' => $appointment]);
    }

    // Patient: Cancel appointment
    public function cancelAppointment(Request $request, $id)
    {
        $patient = $request->user();
        $appointment = $patient->appointments()->findOrFail($id);
        $appointment->delete();
        return response()->json(['message' => 'Appointment cancelled']);
    }

    // Get monthly consultation statistics
    public function getMonthlyStatistics(Request $request)
    {
        try {
            $user = auth()->user();

            // Get consultations for the last 12 months
            $startDate = now()->subMonths(11)->startOfMonth();
            $endDate = now()->endOfMonth();

            // Get appointments
            $appointmentQuery = $user->user_type === 'doctor'
                ? $user->doctorAppointments()
                : $user->appointments();

            $appointmentStats = $appointmentQuery->whereBetween('appointment_date', [$startDate, $endDate])
                ->selectRaw('
                    TO_CHAR(appointment_date, \'YYYY-MM\') as month,
                    COUNT(*) as appointments,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as appointment_text_sessions,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as audio_calls,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as video_calls
                ', [
                    \App\Models\Appointment::STATUS_CONFIRMED,
                    \App\Models\Appointment::STATUS_COMPLETED,
                    \App\Models\Appointment::STATUS_CANCELLED,
                    \App\Models\Appointment::TYPE_TEXT,
                    \App\Models\Appointment::TYPE_AUDIO,
                    \App\Models\Appointment::TYPE_VIDEO
                ])
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            // Get text sessions from text_sessions table
            $textSessionQuery = $user->user_type === 'doctor'
                ? $user->doctorTextSessions()
                : $user->textSessions();

            $textSessionStats = $textSessionQuery->whereBetween('started_at', [$startDate, $endDate])
                ->selectRaw('
                    TO_CHAR(started_at, \'YYYY-MM\') as month,
                    COUNT(*) as text_sessions_count,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as text_active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as text_ended
                ', [
                    \App\Models\TextSession::STATUS_ACTIVE,
                    \App\Models\TextSession::STATUS_ENDED
                ])
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            // Get call sessions from call_sessions table
            $callSessionQuery = $user->user_type === 'doctor'
                ? $user->doctorCallSessions()
                : $user->callSessions();

            $callSessionStats = $callSessionQuery->whereBetween('started_at', [$startDate, $endDate])
                ->selectRaw('
                    TO_CHAR(started_at, \'YYYY-MM\') as month,
                    COUNT(*) as call_sessions_count,
                    SUM(CASE WHEN call_type = ? THEN 1 ELSE 0 END) as voice_calls_count,
                    SUM(CASE WHEN call_type = ? THEN 1 ELSE 0 END) as video_calls_count,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as call_active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as call_ended
                ', [
                    \App\Models\CallSession::CALL_TYPE_VOICE,
                    \App\Models\CallSession::CALL_TYPE_VIDEO,
                    \App\Models\CallSession::STATUS_ACTIVE,
                    \App\Models\CallSession::STATUS_ENDED
                ])
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            // Combine the results
            $combinedStats = [];

            // Process appointment stats
            foreach ($appointmentStats as $stat) {
                $month = $stat->month;
                if (!isset($combinedStats[$month])) {
                    $combinedStats[$month] = [
                        'month' => $month,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$month]['appointments'] = (int) $stat->appointments;
                $combinedStats[$month]['confirmed'] = (int) $stat->confirmed;
                $combinedStats[$month]['completed'] = (int) $stat->completed;
                $combinedStats[$month]['cancelled'] = (int) $stat->cancelled;
                $combinedStats[$month]['appointment_text_sessions'] = (int) $stat->appointment_text_sessions;
                $combinedStats[$month]['audio_calls'] = (int) $stat->audio_calls;
                $combinedStats[$month]['video_calls'] = (int) $stat->video_calls;
            }

            // Process text session stats
            foreach ($textSessionStats as $stat) {
                $month = $stat->month;
                if (!isset($combinedStats[$month])) {
                    $combinedStats[$month] = [
                        'month' => $month,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$month]['text_sessions_count'] = (int) $stat->text_sessions_count;
                $combinedStats[$month]['text_active'] = (int) $stat->text_active;
                $combinedStats[$month]['text_ended'] = (int) $stat->text_ended;
            }

            // Process call session stats
            foreach ($callSessionStats as $stat) {
                $month = $stat->month;
                if (!isset($combinedStats[$month])) {
                    $combinedStats[$month] = [
                        'month' => $month,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$month]['call_sessions_count'] = (int) $stat->call_sessions_count;
                $combinedStats[$month]['voice_calls_count'] = (int) $stat->voice_calls_count;
                $combinedStats[$month]['video_calls_count'] = (int) $stat->video_calls_count;
                $combinedStats[$month]['call_active'] = (int) $stat->call_active;
                $combinedStats[$month]['call_ended'] = (int) $stat->call_ended;
            }

            // Calculate total consultations and convert to array
            $monthlyStats = array_values(array_map(function ($stat) {
                $stat['total_consultations'] = $stat['appointments'] + $stat['text_sessions_count'] + $stat['call_sessions_count'];
                return $stat;
            }, $combinedStats));

            return response()->json([
                'success' => true,
                'data' => $monthlyStats
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching monthly consultation statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch monthly statistics',
                'data' => []
            ], 500);
        }
    }

    // Get weekly consultation statistics
    public function getWeeklyStatistics(Request $request)
    {
        try {
            $user = auth()->user();

            // Get consultations for the last 12 weeks
            $startDate = now()->subWeeks(11)->startOfWeek();
            $endDate = now()->endOfWeek();

            // Get appointments
            $appointmentQuery = $user->user_type === 'doctor'
                ? $user->doctorAppointments()
                : $user->appointments();

            $appointmentStats = $appointmentQuery->whereBetween('appointment_date', [$startDate, $endDate])
                ->selectRaw('
                    EXTRACT(YEAR FROM appointment_date) * 100 + EXTRACT(WEEK FROM appointment_date) as week,
                    COUNT(*) as appointments,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as appointment_text_sessions,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as audio_calls,
                    SUM(CASE WHEN appointment_type = ? THEN 1 ELSE 0 END) as video_calls
                ', [
                    \App\Models\Appointment::STATUS_CONFIRMED,
                    \App\Models\Appointment::STATUS_COMPLETED,
                    \App\Models\Appointment::STATUS_CANCELLED,
                    \App\Models\Appointment::TYPE_TEXT,
                    \App\Models\Appointment::TYPE_AUDIO,
                    \App\Models\Appointment::TYPE_VIDEO
                ])
                ->groupBy('week')
                ->orderBy('week')
                ->get();

            // Get text sessions from text_sessions table
            $textSessionQuery = $user->user_type === 'doctor'
                ? $user->doctorTextSessions()
                : $user->textSessions();

            $textSessionStats = $textSessionQuery->whereBetween('started_at', [$startDate, $endDate])
                ->selectRaw('
                    EXTRACT(YEAR FROM started_at) * 100 + EXTRACT(WEEK FROM started_at) as week,
                    COUNT(*) as text_sessions_count,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as text_active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as text_ended
                ', [
                    \App\Models\TextSession::STATUS_ACTIVE,
                    \App\Models\TextSession::STATUS_ENDED
                ])
                ->groupBy('week')
                ->orderBy('week')
                ->get();

            // Get call sessions from call_sessions table
            $callSessionQuery = $user->user_type === 'doctor'
                ? $user->doctorCallSessions()
                : $user->callSessions();

            $callSessionStats = $callSessionQuery->whereBetween('started_at', [$startDate, $endDate])
                ->selectRaw('
                    EXTRACT(YEAR FROM started_at) * 100 + EXTRACT(WEEK FROM started_at) as week,
                    COUNT(*) as call_sessions_count,
                    SUM(CASE WHEN call_type = ? THEN 1 ELSE 0 END) as voice_calls_count,
                    SUM(CASE WHEN call_type = ? THEN 1 ELSE 0 END) as video_calls_count,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as call_active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as call_ended
                ', [
                    \App\Models\CallSession::CALL_TYPE_VOICE,
                    \App\Models\CallSession::CALL_TYPE_VIDEO,
                    \App\Models\CallSession::STATUS_ACTIVE,
                    \App\Models\CallSession::STATUS_ENDED
                ])
                ->groupBy('week')
                ->orderBy('week')
                ->get();

            // Combine the results
            $combinedStats = [];

            // Process appointment stats
            foreach ($appointmentStats as $stat) {
                $week = $stat->week;
                if (!isset($combinedStats[$week])) {
                    $combinedStats[$week] = [
                        'week' => $week,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$week]['appointments'] = (int) $stat->appointments;
                $combinedStats[$week]['confirmed'] = (int) $stat->confirmed;
                $combinedStats[$week]['completed'] = (int) $stat->completed;
                $combinedStats[$week]['cancelled'] = (int) $stat->cancelled;
                $combinedStats[$week]['appointment_text_sessions'] = (int) $stat->appointment_text_sessions;
                $combinedStats[$week]['audio_calls'] = (int) $stat->audio_calls;
                $combinedStats[$week]['video_calls'] = (int) $stat->video_calls;
            }

            // Process text session stats
            foreach ($textSessionStats as $stat) {
                $week = $stat->week;
                if (!isset($combinedStats[$week])) {
                    $combinedStats[$week] = [
                        'week' => $week,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$week]['text_sessions_count'] = (int) $stat->text_sessions_count;
                $combinedStats[$week]['text_active'] = (int) $stat->text_active;
                $combinedStats[$week]['text_ended'] = (int) $stat->text_ended;
            }

            // Process call session stats
            foreach ($callSessionStats as $stat) {
                $week = $stat->week;
                if (!isset($combinedStats[$week])) {
                    $combinedStats[$week] = [
                        'week' => $week,
                        'appointments' => 0,
                        'confirmed' => 0,
                        'completed' => 0,
                        'cancelled' => 0,
                        'appointment_text_sessions' => 0,
                        'audio_calls' => 0,
                        'video_calls' => 0,
                        'text_sessions_count' => 0,
                        'text_active' => 0,
                        'text_ended' => 0,
                        'call_sessions_count' => 0,
                        'voice_calls_count' => 0,
                        'video_calls_count' => 0,
                        'call_active' => 0,
                        'call_ended' => 0,
                        'total_consultations' => 0
                    ];
                }

                $combinedStats[$week]['call_sessions_count'] = (int) $stat->call_sessions_count;
                $combinedStats[$week]['voice_calls_count'] = (int) $stat->voice_calls_count;
                $combinedStats[$week]['video_calls_count'] = (int) $stat->video_calls_count;
                $combinedStats[$week]['call_active'] = (int) $stat->call_active;
                $combinedStats[$week]['call_ended'] = (int) $stat->call_ended;
            }

            // Calculate total consultations and convert to array with readable week format
            $weeklyStats = array_values(array_map(function ($stat) {
                $weekNumber = (int) $stat['week'];
                $year = intval($weekNumber / 100);
                $week = $weekNumber % 100;

                $stat['week'] = "Week {$week}";
                $stat['year'] = $year;
                $stat['total_consultations'] = $stat['appointments'] + $stat['text_sessions_count'] + $stat['call_sessions_count'];
                return $stat;
            }, $combinedStats));

            return response()->json([
                'success' => true,
                'data' => $weeklyStats
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching weekly consultation statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch weekly statistics',
                'data' => []
            ], 500);
        }
    }
}
