<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\SessionCreationService;
use App\Services\TimezoneService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\DoctorWallet;
use App\Services\DoctorPaymentService;

/**
 * @deprecated Use TextSessionController::createScheduled() instead for unified session management.
 */
class TextAppointmentController extends Controller
{
    /**
     * Start a text appointment session when appointment time is reached.
     * @deprecated Use TextSessionController::createScheduled() instead.
     */
    public function startSession(Request $request): JsonResponse
    {
        Log::warning('DEPRECATED: TextAppointmentController::startSession called. Use TextSessionController::createScheduled instead.');

        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            $existingSession = TextSession::where('appointment_id', (int) $appointmentId)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($existingSession) {
                $existingSession->applyLazyExpiration();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'session_id' => $existingSession->id,
                        'status' => $existingSession->status,
                        'started_at' => $existingSession->started_at,
                        'activated_at' => $existingSession->activated_at,
                        'ended_at' => $existingSession->ended_at,
                        'doctor_response_deadline' => $existingSession->doctor_response_deadline,
                    ]
                ]);
            }

            // Check if this is a text appointment
            if ($appointment->appointment_type !== 'text') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only text appointments can start sessions'
                ], 400);
            }

            // Check if appointment is confirmed
            if ($appointment->status !== 'confirmed' && $appointment->status !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment must be confirmed to start session'
                ], 400);
            }

            // Check if appointment time has been reached using TimezoneService
            $userTimezone = $request->get('user_timezone') ?: config('app.timezone', 'UTC');
            $isTimeReached = TimezoneService::isAppointmentTimeReached(
                $appointment->appointment_datetime_utc,
                null,
                $userTimezone,
                5 // 5 minute buffer
            );

            // Debug logging for appointment time validation
            Log::info('🕐 [TextAppointmentController] Time validation debug', [
                'appointment_id' => $appointmentId,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'user_timezone' => $userTimezone,
                'is_time_reached' => $isTimeReached,
                'current_time_utc' => now()->utc()->toDateTimeString(),
                'app_timezone' => config('app.timezone', 'UTC')
            ]);

            if (!$isTimeReached) {
                Log::info('⏰ [TextAppointmentController] Appointment time not reached', [
                    'appointment_id' => $appointmentId,
                    'user_timezone' => $userTimezone
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Appointment time has not been reached yet'
                ], 400);
            }

            $textSession = TextSession::where('appointment_id', $appointmentId)->first();
            if ($textSession) {
                $textSession->applyLazyExpiration();

                return response()->json([
                    'success' => true,
                    'message' => 'Text appointment session already exists',
                    'data' => [
                        'session_id' => $textSession->id,
                        'appointment_id' => $appointmentId,
                        'status' => $textSession->status,
                        'started_at' => $textSession->started_at,
                        'activated_at' => $textSession->activated_at,
                        'ended_at' => $textSession->ended_at,
                    ]
                ]);
            }

            $sessionCreationService = app(SessionCreationService::class);
            $sessionResult = $sessionCreationService->createTextSession(
                $appointment->patient_id,
                $appointment->doctor_id,
                $appointment->reason,
                'APPOINTMENT',
                $appointment->id
            );

            if (!$sessionResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $sessionResult['message'] ?? 'Failed to start text session'
                ], 400);
            }

            $textSession = $sessionResult['session'];
            $appointment->update([
                'session_id' => $textSession->id,
            ]);

            Log::info("Text session created from text appointment", [
                'session_id' => $textSession->id,
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Text session started successfully',
                'data' => [
                    'session_id' => $textSession->id,
                    'appointment_id' => $appointmentId,
                    'status' => $textSession->status,
                    'started_at' => $textSession->started_at,
                    'activated_at' => $textSession->activated_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error starting text appointment session", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start text appointment session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update activity for text appointment session.
     */
    public function updateActivity(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'user_type' => 'required|string|in:patient,doctor',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $userType = $request->input('user_type');
            $userId = auth()->id();

            $appointment = Appointment::find($appointmentId);
            if ($appointment) {
                $session = TextSession::where('appointment_id', (int) $appointmentId)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (!$session) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Session not found'
                    ], 404);
                }

                if ($session->patient_id !== $userId && $session->doctor_id !== $userId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to session'
                    ], 403);
                }

                $session->update([
                    'last_activity_at' => now(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Activity updated successfully',
                    'data' => [
                        'session_id' => $session->id,
                        'status' => $session->status,
                        'last_activity_at' => $session->last_activity_at,
                        'user_type' => $userType,
                    ]
                ]);
            }

            // FIX: Use atomic update to prevent race conditions
            $updated = DB::transaction(function () use ($appointmentId, $userType, $userId) {
                // Get and lock the session for update
                $session = DB::table('text_appointment_sessions')
                    ->where('appointment_id', $appointmentId)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (!$session) {
                    return null;
                }

                // Prepare atomic update data
                $updateData = [
                    'last_activity_time' => now(),
                    'updated_at' => now(),
                ];

                if ($userType === 'patient') {
                    $updateData['has_patient_activity'] = true;
                } else {
                    $updateData['has_doctor_activity'] = true;
                }

                // Atomic update with row lock
                $affectedRows = DB::table('text_appointment_sessions')
                    ->where('id', $session->id)
                    ->where('is_active', true) // Double-check session is still active
                    ->update($updateData);

                if ($affectedRows > 0) {
                    Log::info("Text appointment session activity updated atomically", [
                        'session_id' => $session->id,
                        'appointment_id' => $appointmentId,
                        'user_type' => $userType,
                        'user_id' => $userId,
                        'last_activity_time' => $updateData['last_activity_time'],
                    ]);

                    return [
                        'session_id' => $session->id,
                        'last_activity_time' => $updateData['last_activity_time'],
                        'has_patient_activity' => $userType === 'patient' ? true : $session->has_patient_activity,
                        'has_doctor_activity' => $userType === 'doctor' ? true : $session->has_doctor_activity,
                    ];
                }

                return null;
            });

            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active text appointment session found or session was just ended'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Activity updated successfully',
                'data' => $updated
            ]);

        } catch (\Exception $e) {
            Log::error("Error updating text appointment session activity", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update activity: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process session deduction for text appointment.
     */
    /**
     * Process deduction for scheduled text appointment session
     * 
     * ⚠️ LEGACY APPOINTMENT-BASED BILLING ENDPOINT ⚠️
     * 
     * Architecture Note: This endpoint processes billing based on appointment_id and references
     * text_appointment_sessions table keyed by appointment_id. This is an appointment-derived billing path.
     * 
     * Migration Path:
     * - Once appointments.session_id is populated and scheduled consults migrate to real sessions:
     *   - Text appointments should create text_sessions (via auto-start job)
     *   - Billing should come from text_sessions auto-deduction flows (ProcessAutoDeductions command)
     *   - This endpoint becomes a migration hazard unless clearly scoped as legacy
     * - This endpoint should only be used for legacy text_appointment_sessions that haven't
     *   been migrated to the unified text_sessions table.
     * 
     * TODO: Add session_id check guardrail:
     *   if ($appointment->session_id !== null) {
     *     return response()->json([
     *       'success' => false,
     *       'message' => 'Billing must be processed through session auto-deduction, not appointment endpoint'
     *     ], 400);
     *   }
     * 
     * @deprecated In favor of session-based auto-deduction flows (ProcessAutoDeductions command)
     */
    public function processDeduction(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'sessions_to_deduct' => 'required|integer|min:1',
                'reason' => 'required|string|in:interval,manual_end,no_activity',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionsToDeduct = $request->input('sessions_to_deduct');
            $reason = $request->input('reason');

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // ⚠️ GUARDRAIL: Block billing if appointment has session_id
            // Billing must come from session auto-deduction flows, not appointment endpoints
            $enforce = \App\Services\FeatureFlags::enforceSessionGatedBilling();
            
            if ($appointment->session_id !== null) {
                if ($enforce) {
                    \Log::warning('SessionContextGuard: Billing blocked - appointment has session_id', [
                        'appointment_id' => $appointment->id,
                        'session_id' => $appointment->session_id,
                        'endpoint' => 'TextAppointmentController::processDeduction',
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Billing must be processed through session auto-deduction, not appointment endpoint',
                        'session_id' => $appointment->session_id,
                        'error_code' => 'SESSION_BILLING_REQUIRED'
                    ], 400);
                } else {
                    // Flag disabled: log warning but allow (backward compatibility)
                    \Log::warning('SessionContextGuard: Billing on appointment with session_id (flag disabled)', [
                        'appointment_id' => $appointment->id,
                        'session_id' => $appointment->session_id,
                        'endpoint' => 'TextAppointmentController::processDeduction',
                    ]);
                }
            }

            // Get patient's subscription
            $subscription = Subscription::where('user_id', $appointment->patient_id)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found for patient'
                ], 400);
            }

            // Check if patient has enough sessions
            if ($subscription->text_sessions_remaining < $sessionsToDeduct) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient text sessions remaining'
                ], 400);
            }

            DB::transaction(function () use ($subscription, $sessionsToDeduct, $appointmentId, $appointment, $reason) {
                // Deduct sessions from subscription
                $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);

                // Update session with deduction
                $session = DB::table('text_appointment_sessions')
                    ->where('appointment_id', $appointmentId)
                    ->where('is_active', true)
                    ->lockForUpdate() // Lock row
                    ->first();

                if ($session) {
                    DB::table('text_appointment_sessions')
                        ->where('id', $session->id)
                        ->update([
                            'sessions_used' => $session->sessions_used + $sessionsToDeduct,
                            'updated_at' => now(),
                        ]);
                }

                // Credit Doctor Wallet
                $doctor = User::find($appointment->doctor_id);
                if ($doctor) {
                    try {
                        $wallet = DoctorWallet::getOrCreate($doctor->id);
                        $paymentAmount = DoctorPaymentService::getPaymentAmountForDoctor('text', $doctor) * $sessionsToDeduct;
                        $currency = DoctorPaymentService::getCurrency($doctor);

                        $wallet->credit(
                            $paymentAmount,
                            "Payment for {$sessionsToDeduct} scheduled text session(s) with {$appointment->patient->first_name} {$appointment->patient->last_name}",
                            'text_appointment',
                            $appointmentId,
                            'appointments',
                            [
                                'patient_name' => $appointment->patient->first_name . " " . $appointment->patient->last_name,
                                'appointment_id' => $appointmentId,
                                'sessions_deducted' => $sessionsToDeduct,
                                'reason' => $reason,
                                'currency' => $currency,
                                'payment_amount' => $paymentAmount,
                            ]
                        );

                        Log::info("Credited doctor wallet for scheduled text session", [
                            'doctor_id' => $doctor->id,
                            'amount' => $paymentAmount,
                            'currency' => $currency
                        ]);
                    } catch (\Exception $e) {
                        Log::error("Failed to credit doctor wallet for scheduled text session", [
                            'error' => $e->getMessage(),
                            'doctor_id' => $doctor->id,
                            'appointment_id' => $appointmentId
                        ]);
                        throw $e; // Re-throw to rollback transaction
                    }
                }
            });

            Log::info("Text appointment session deduction processed", [
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'sessions_deducted' => $sessionsToDeduct,
                'reason' => $reason,
                'remaining_sessions' => $subscription->text_sessions_remaining,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session deduction processed successfully',
                'data' => [
                    'sessions_deducted' => $sessionsToDeduct,
                    'remaining_sessions' => $subscription->text_sessions_remaining,
                    'reason' => $reason,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error processing text appointment session deduction", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'sessions_to_deduct' => $request->input('sessions_to_deduct'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process deduction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * End text appointment session.
     */
    public function endSession(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'sessions_to_deduct' => 'required|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionsToDeduct = $request->input('sessions_to_deduct');
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            // Get the session
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active text appointment session found'
                ], 404);
            }

            // Process deduction if needed
            if ($sessionsToDeduct > 0) {
                $subscription = Subscription::where('user_id', $appointment->patient_id)
                    ->where('is_active', true)
                    ->first();

                if ($subscription && $subscription->text_sessions_remaining >= $sessionsToDeduct) {
                    $subscription->decrement('text_sessions_remaining', $sessionsToDeduct);

                    // Credit Doctor Wallet for final deduction
                    $doctor = User::find($appointment->doctor_id);
                    if ($doctor) {
                        try {
                            $wallet = DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = DoctorPaymentService::getPaymentAmountForDoctor('text', $doctor) * $sessionsToDeduct;
                            $currency = DoctorPaymentService::getCurrency($doctor);

                            $wallet->credit(
                                $paymentAmount,
                                "Payment for {$sessionsToDeduct} scheduled text session(s) (End Session) with {$appointment->patient->first_name} {$appointment->patient->last_name}",
                                'text_appointment',
                                $appointmentId,
                                'appointments',
                                [
                                    'patient_name' => $appointment->patient->first_name . " " . $appointment->patient->last_name,
                                    'appointment_id' => $appointmentId,
                                    'sessions_deducted' => $sessionsToDeduct,
                                    'end_type' => 'manual',
                                    'currency' => $currency,
                                    'payment_amount' => $paymentAmount,
                                ]
                            );

                            Log::info("Credited doctor wallet for scheduled text session end", [
                                'doctor_id' => $doctor->id,
                                'amount' => $paymentAmount,
                                'currency' => $currency
                            ]);
                        } catch (\Exception $e) {
                            Log::error("Failed to credit doctor wallet for scheduled text session end", [
                                'error' => $e->getMessage(),
                                'doctor_id' => $doctor->id,
                                'appointment_id' => $appointmentId
                            ]);
                        }
                    }
                }
            }

            // End the session
            DB::table('text_appointment_sessions')
                ->where('id', $session->id)
                ->update([
                    'is_active' => false,
                    'is_ended' => true,
                    'sessions_used' => $session->sessions_used + $sessionsToDeduct,
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            Log::info("Text appointment session ended", [
                'session_id' => $session->id,
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
                'sessions_deducted' => $sessionsToDeduct,
                'total_sessions_used' => $session->sessions_used + $sessionsToDeduct,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Text appointment session ended successfully',
                'data' => [
                    'session_id' => $session->id,
                    'is_ended' => true,
                    'sessions_deducted' => $sessionsToDeduct,
                    'total_sessions_used' => $session->sessions_used + $sessionsToDeduct,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error ending text appointment session", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to end session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get text appointment session status.
     */
    public function getSessionStatus(Request $request, $appointmentId): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Get the appointment
            $appointment = Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Verify user is part of this appointment
            if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to appointment'
                ], 403);
            }

            // Get the session
            $session = DB::table('text_appointment_sessions')
                ->where('appointment_id', $appointmentId)
                ->where('is_active', true)
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'is_active' => false,
                        'is_ended' => false,
                        'message' => 'No active session found'
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'session_id' => $session->id,
                    'is_active' => $session->is_active,
                    'is_ended' => $session->is_ended,
                    'start_time' => $session->start_time,
                    'last_activity_time' => $session->last_activity_time,
                    'has_patient_activity' => $session->has_patient_activity,
                    'has_doctor_activity' => $session->has_doctor_activity,
                    'sessions_used' => $session->sessions_used,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error getting text appointment session status", [
                'error' => $e->getMessage(),
                'appointment_id' => $appointmentId,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get session status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse appointment date and time to create a DateTime object.
     */
    private function parseAppointmentDateTime($dateStr, $timeStr)
    {
        try {
            if (!$dateStr || !$timeStr) {
                return null;
            }

            // Handle different date formats
            if (strpos($dateStr, '/') !== false) {
                // Format: MM/DD/YYYY
                $dateParts = explode('/', $dateStr);
                if (count($dateParts) === 3) {
                    $month = (int) $dateParts[0];
                    $day = (int) $dateParts[1];
                    $year = (int) $dateParts[2];

                    // Handle time format (remove AM/PM if present)
                    $timeStr = preg_replace('/\s*(AM|PM)/i', '', $timeStr);
                    $timeParts = explode(':', $timeStr);
                    $hour = (int) $timeParts[0];
                    $minute = (int) $timeParts[1];

                    // Create Carbon instance in the application timezone
                    return \Carbon\Carbon::create($year, $month, $day, $hour, $minute, 0, config('app.timezone', 'Africa/Blantyre'));
                }
            } else {
                // Format: YYYY-MM-DD - parse in application timezone
                return \Carbon\Carbon::parse($dateStr . ' ' . $timeStr, config('app.timezone', 'Africa/Blantyre'));
            }
        } catch (\Exception $e) {
            Log::error("Error parsing appointment date/time", [
                'date' => $dateStr,
                'time' => $timeStr,
                'error' => $e->getMessage()
            ]);
            return null;
        }

        return null;
    }
}
