<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subscription;
use App\Models\CallSession;
use App\Jobs\PromoteCallToConnected;
use App\Services\SessionCreationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CallSessionController extends Controller
{
    /**
     * Check if user can make a call (voice or video)
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid call type. Must be voice or video'
                ], 400);
            }

            // Get user's subscription
            $subscription = Subscription::where('user_id', $user->id)->first();

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => 'No subscription found. Please subscribe to make calls.',
                    'remaining_calls' => 0
                ]);
            }

            if (!$subscription->is_active) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => 'Your subscription is not active. Please renew to make calls.',
                    'remaining_calls' => 0
                ]);
            }

            // Check remaining calls based on type
            $remainingCalls = 0;
            $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
            $remainingCalls = $subscription->$callTypeField ?? 0;

            if ($remainingCalls <= 0) {
                return response()->json([
                    'success' => false,
                    'can_make_call' => false,
                    'message' => "No remaining {$callType} calls in your subscription. Please upgrade or wait for renewal.",
                    'remaining_calls' => $remainingCalls
                ]);
            }

            Log::info("Call availability checked", [
                'user_id' => $user->id,
                'call_type' => $callType,
                'remaining_calls' => $remainingCalls,
                'subscription_active' => $subscription->is_active
            ]);

            return response()->json([
                'success' => true,
                'can_make_call' => true,
                'message' => "You have {$remainingCalls} {$callType} calls remaining",
                'remaining_calls' => $remainingCalls,
                'subscription' => [
                    'textSessionsRemaining' => $subscription->text_sessions_remaining,
                    'voiceCallsRemaining' => $subscription->voice_calls_remaining,
                    'videoCallsRemaining' => $subscription->video_calls_remaining,
                    'isActive' => $subscription->is_active
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error checking call availability", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'can_make_call' => false,
                'message' => 'Failed to check call availability. Please try again.',
                'remaining_calls' => 0
            ], 500);
        }
    }

    /**
     * Start a call session
     */
    public function start(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $reason = $request->input('reason');

            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid call type. Must be voice or video'
                ], 400);
            }

            // Instant calls may omit appointment_id; generate a direct session routing key.
            // Scheduled calls provide a numeric appointment_id.
            if (!$appointmentId) {
                $appointmentId = 'direct_session_' . time() . '_' . substr(md5((string) microtime(true)), 0, 8);
            }

            $isDirectSession = str_starts_with((string) $appointmentId, 'direct_session_');

            // Scheduled call: appointment_id is a real appointments.id
            $appointment = null;
            if (!$isDirectSession && is_numeric((string) $appointmentId)) {
                $appointment = \App\Models\Appointment::find((int) $appointmentId);
                if (!$appointment) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Appointment not found'
                    ], 404);
                }

                // Scheduled calls must be unlocked before they can be started
                if (empty($appointment->call_unlocked_at)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Call is not unlocked yet. Please wait until the scheduled time window.',
                        'error_code' => 'SESSION_NOT_UNLOCKED',
                        'appointment_id' => (int) $appointment->id,
                        'call_unlocked_at' => $appointment->call_unlocked_at,
                    ], 403);
                }

                if ((int) $appointment->patient_id !== (int) $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to start this call session'
                    ], 403);
                }

                // Scheduled calls must map appointment_type -> call_type
                $expectedCallType = ($appointment->appointment_type === 'video') ? 'video' : (($appointment->appointment_type === 'audio') ? 'voice' : null);
                if (!$expectedCallType) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only audio/video appointments can start call sessions'
                    ], 400);
                }

                if ($expectedCallType !== $callType) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Call type does not match appointment type'
                    ], 400);
                }

                // Reuse an existing LIVE call_session for this appointment (if any).
                // Retries must create a NEW call_session once the previous session is terminal.
                // IMPORTANT: Do not rely on appointments.session_id for call routing/state.
                $existing = CallSession::where('appointment_id', (string) $appointmentId)
                    ->whereIn('status', [
                        CallSession::STATUS_ACTIVE,
                        CallSession::STATUS_CONNECTING,
                        CallSession::STATUS_WAITING_FOR_DOCTOR,
                        CallSession::STATUS_ANSWERED,
                    ])
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($existing) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Call session already exists for this appointment',
                        'data' => [
                            'session_id' => $existing->id,
                            'session_context' => 'call_session:' . $existing->id,
                            'appointment_id' => (string) $appointmentId,
                            'call_type' => $existing->call_type,
                            'status' => $existing->status,
                            'started_at' => $existing->started_at ? $existing->started_at->toISOString() : null,
                        ],
                    ]);
                }
            }

            // Check availability first
            $availabilityResponse = $this->checkAvailability($request);
            $availabilityData = $availabilityResponse->getData(true);

            if (!$availabilityData['success'] || !$availabilityData['can_make_call']) {
                return $availabilityResponse;
            }

            // Get subscription for remaining sessions count
            $subscription = Subscription::where('user_id', $user->id)->first();
            $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
            $sessionsRemainingBeforeStart = $subscription->$callTypeField;

            // For direct sessions, we need to find a doctor
            $doctorId = null;
            if ($isDirectSession) {
                // For direct sessions, we need to find an available doctor
                // For now, we'll use a placeholder - in a real implementation,
                // you'd want to find an available doctor based on the user's selection
                $doctorId = $request->input('doctor_id');
                if (!$doctorId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doctor ID is required for direct sessions'
                    ], 400);
                }
            } else {
                // For scheduled calls, derive doctor from appointment
                if ($appointment) {
                    $doctorId = (int) $appointment->doctor_id;
                } else {
                    // Backward compatibility: non-direct calls that are not numeric appointments
                    $doctorId = $request->input('doctor_id');
                    if (!$doctorId) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Doctor ID is required'
                        ], 400);
                    }
                }
            }

            $sessionCreationService = app(SessionCreationService::class);
            $sessionResult = $sessionCreationService->createCallSession(
                (int) $user->id,
                (int) $doctorId,
                (string) $callType,
                (string) $appointmentId,
                $reason,
                $appointment ? 'APPOINTMENT' : 'INSTANT'
            );

            if (!$sessionResult['success'] || empty($sessionResult['session'])) {
                return response()->json([
                    'success' => false,
                    'message' => $sessionResult['message'] ?? 'Failed to start call session'
                ], 400);
            }

            /** @var CallSession $callSession */
            $callSession = $sessionResult['session'];

            // IMPORTANT: Do not link call sessions onto appointments for live state/routing.
            // Appointments are scheduling artifacts only; call history/retries live in call_sessions.

            // FIX: Do NOT deduct immediately - only deduct after 10 minutes and on hangup
            // This prevents deduction for calls that don't connect

            // Notify the doctor about the incoming call via FCM
            $notified = false;
            $tokensCount = 0;
            try {
                $doctor = User::find($doctorId);
                if ($doctor) {
                    $tokensCount = !empty($doctor->push_token) ? 1 : 0;
                    Log::info('📣 Incoming call: preparing push', [
                        'appointment_id' => $appointmentId,
                        'call_type' => $callType,
                        'caller_id' => $user->id,
                        'doctor_id' => $doctorId,
                        'tokens_count' => $tokensCount,
                    ]);

                    // Build and log sanitized FCM payload for verification
                    try {
                        $notification = new \App\Notifications\IncomingCallNotification($callSession, $user);
                        if (method_exists($notification, 'toFcm')) {
                            $payload = $notification->toFcm($doctor);
                            $sanitized = [
                                'title' => $payload['title'] ?? null,
                                'body' => $payload['body'] ?? null,
                                'data_keys' => array_keys($payload['data'] ?? []),
                                'data_preview' => [
                                    'type' => $payload['data']['type'] ?? null,
                                    'appointment_id' => $payload['data']['appointment_id'] ?? null,
                                    'call_type' => $payload['data']['call_type'] ?? null,
                                    'doctor_id' => $payload['data']['doctor_id'] ?? null,
                                    'caller_id' => $payload['data']['caller_id'] ?? null,
                                ],
                            ];
                            Log::info('FCM payload (sanitized) for IncomingCallNotification', $sanitized);
                            // Send after logging
                            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                                $doctor->notify($notification);
                                $notified = true; // best-effort flag; actual channel may not return a result
                            } else {
                                Log::warning('⚠️ No token or push disabled for doctor; skipping push send', [
                                    'doctor_id' => $doctorId,
                                    'push_enabled' => $doctor->push_notifications_enabled,
                                    'has_token' => $tokensCount > 0,
                                ]);
                            }
                        } else {
                            // Fallback: send without preview
                            Log::warning('IncomingCallNotification has no toFcm method - sending without payload preview');
                            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                                $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                                $notified = true;
                            }
                        }
                    } catch (\Throwable $t) {
                        Log::error('Error building/logging FCM payload for IncomingCallNotification', [
                            'error' => $t->getMessage(),
                            'trace' => config('app.debug') ? $t->getTraceAsString() : 'hidden',
                        ]);
                        // Still attempt to send notification
                        if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                            $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                            $notified = true;
                        }
                    }

                    Log::info('📤 Incoming call push attempted', [
                        'appointment_id' => $appointmentId,
                        'tokens_count' => $tokensCount,
                        'result' => $notified ? 'success' : 'skipped_or_unknown',
                    ]);
                } else {
                    Log::warning('Doctor not found for call notification', [
                        'doctor_id' => $doctorId,
                        'call_session_id' => $callSession->id,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to send incoming call notification', [
                    'doctor_id' => $doctorId,
                    'call_session_id' => $callSession->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info("Call session started", [
                'user_id' => $user->id,
                'call_session_id' => $callSession->id,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'doctor_id' => $doctorId,
                'remaining_calls' => $subscription->$callTypeField
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call session started successfully',
                'data' => [
                    'session_id' => $callSession->id,
                    'call_session_id' => $callSession->id,
                    'session_context' => 'call_session:' . $callSession->id,
                    'appointment_id' => $appointmentId,
                    'call_type' => $callType,
                    'status' => $callSession->status,
                    'started_at' => $callSession->started_at->toISOString(),
                    'notified' => $notified ?? false,
                    'tokens' => $tokensCount ?? 0,
                    'last_notified_at' => now()->toISOString(),
                ],
                'remaining_calls' => $subscription->$callTypeField,
                'call_type' => $callType,
                'appointment_id' => $appointmentId
            ]);

        } catch (\Exception $e) {
            Log::error("Error starting call session", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start call session. Please try again.'
            ], 500);
        }
    }

    /**
     * Get call session status
     */
    public function getStatus($appointmentId): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Architecture: Resolve live session context from call_sessions table.
            // This handles both direct_session_... keys and numeric appointment IDs.
            $callSession = CallSession::where('appointment_id', (string) $appointmentId)
                ->whereIn('status', [
                    CallSession::STATUS_ACTIVE,
                    CallSession::STATUS_CONNECTING,
                    CallSession::STATUS_WAITING_FOR_DOCTOR,
                    CallSession::STATUS_ANSWERED,
                ])
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$callSession) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No active call session found'
                ]);
            }

            // Authorization: must be a participant
            if ((int) $callSession->patient_id !== (int) $user->id && (int) $callSession->doctor_id !== (int) $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to session'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $callSession->id,
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $callSession->appointment_id,
                    'patient_id' => $callSession->patient_id,
                    'doctor_id' => $callSession->doctor_id,
                    'status' => $callSession->status,
                    'call_type' => $callSession->call_type,
                    'is_connected' => (bool) $callSession->connected_at,
                    'started_at' => $callSession->created_at->toISOString(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching call session status", [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch call session status'
            ], 500);
        }
    }

    /**
     * End a call session
     */
    public function end(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $sessionId = $request->input('session_id');
            $sessionDuration = $request->input('session_duration', 0);
            $wasConnected = $request->input('was_connected', false);

            return DB::transaction(function () use ($user, $callType, $appointmentId, $sessionId, $sessionDuration, $wasConnected) {
                // Find the call session to end with lock
                $query = CallSession::query();
                if ($sessionId) {
                    $query->where('id', $sessionId);
                } elseif ($appointmentId) {
                    $query->where('appointment_id', (string) $appointmentId);
                } else {
                    return response()->json(['success' => false, 'message' => 'Session ID or Appointment ID required'], 400);
                }

                // Authorization: must be a participant (patient or doctor)
                $query->where(function ($q) use ($user) {
                    $q->where('patient_id', $user->id)
                        ->orWhere('doctor_id', $user->id);
                });

                $callSession = $query->lockForUpdate()->first();

                if (!$callSession) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Call session not found'
                    ], 404);
                }

                // CRITICAL: Calculate billing ONLY from connected_at timestamp (not started_at)
                // Billing should only happen for actual connected time
                // RACE-CONDITION SAFETY: If call was answered but connected_at is missing, fix it now
                if (!$callSession->connected_at) {
                    // Check if call was answered (race condition - promotion job may have failed)
                    if ($callSession->answered_at) {
                        Log::warning("RACE CONDITION: Call ended but connected_at missing despite being answered - fixing now", [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId,
                            'answered_at' => $callSession->answered_at->toISOString(),
                            'status' => $callSession->status
                        ]);

                        // Fix race condition: use answered_at as connected_at for billing correctness
                        $callSession->update([
                            'is_connected' => true,
                            'connected_at' => $callSession->answered_at,
                            'status' => CallSession::STATUS_ACTIVE, // Set to active first
                        ]);

                        Log::info("RACE CONDITION FIXED: Set connected_at to answered_at for billing correctness", [
                            'call_session_id' => $callSession->id,
                            'connected_at' => $callSession->connected_at->toISOString()
                        ]);
                    } else {
                        // Call never answered - no billing
                        Log::info("Call ended without connection - no billing", [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId
                        ]);

                        $callSession->update([
                            'status' => CallSession::STATUS_MISSED,
                            'ended_at' => now(),
                            'last_activity_at' => now(),
                            'is_connected' => false,
                            'call_duration' => 0,
                        ]);

                        return response()->json([
                            'success' => true,
                            'message' => 'Call missed (provider did not join) - no billing',
                            'session_duration' => 0,
                            'was_connected' => false,
                            'sessions_deducted' => 0,
                            'deduction_result' => [
                                'doctor_payment_success' => false,
                                'patient_deduction_success' => false,
                                'doctor_payment_amount' => 0,
                                'patient_sessions_deducted' => 0,
                                'auto_deductions' => 0,
                                'manual_deduction' => 0,
                                'errors' => []
                            ]
                        ]);
                    }
                }

                // Refresh call session to get updated connected_at
                $callSession->refresh();

                // Set ended_at first
                $callSession->update([
                    'status' => CallSession::STATUS_ENDED,
                    'ended_at' => now(),
                    'last_activity_at' => now(),
                    'is_connected' => (bool) $callSession->connected_at,
                ]);
                $callSession->refresh();

                // Manual hangup deduction (ONCE, idempotent)
                // Deduct +1 session immediately if call was connected, regardless of duration
                $manualDeductionApplied = false;
                if ($callSession->connected_at && !$callSession->manual_deduction_applied) {
                    $patient = $user;
                    $subscription = $patient->subscription()->lockForUpdate()->first();

                    if ($subscription) {
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';

                        if ($subscription->$callTypeField >= 1) {
                            // Deduct 1 session from patient
                            $subscription->$callTypeField = max(0, $subscription->$callTypeField - 1);
                            $subscription->save();

                            // Pay the doctor
                            $doctor = User::find($callSession->doctor_id);
                            if ($doctor) {
                                $doctorWallet = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                                $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor);
                                $currency = \App\Services\DoctorPaymentService::getCurrency($doctor);

                                $doctorWallet->credit(
                                    $paymentAmount,
                                    "Manual hangup payment for 1 {$callType} call session with " . $patient->first_name . " " . $patient->last_name,
                                    $callType,
                                    $callSession->id,
                                    'call_sessions_manual',
                                    [
                                        'patient_name' => $patient->first_name . " " . $patient->last_name,
                                        'sessions_used' => 1,
                                        'currency' => $currency,
                                        'payment_amount' => $paymentAmount,
                                    ]
                                );

                                // Send payment received notification to doctor
                                try {
                                    $notificationService = new \App\Services\NotificationService();
                                    $patientName = $patient->first_name . ' ' . $patient->last_name;
                                    $notificationService->createNotification(
                                        $doctor->id,
                                        'Payment Received',
                                        "You received a payment of {$paymentAmount} {$currency} from {$patientName}.",
                                        'payment',
                                        [
                                            'amount' => $paymentAmount,
                                            'currency' => $currency,
                                            'payment_id' => $doctorWallet->transactions()->latest()->first()->id ?? null,
                                            'patient_name' => $patientName,
                                        ]
                                    );
                                } catch (\Exception $notificationError) {
                                    // Log but don't fail the payment if notification fails
                                    Log::warning("Failed to send payment received notification (manual deduction)", [
                                        'call_session_id' => $callSession->id,
                                        'doctor_id' => $doctor->id,
                                        'error' => $notificationError->getMessage()
                                    ]);
                                }
                            }

                            // Mark manual deduction as applied
                            $callSession->update([
                                'manual_deduction_applied' => true,
                                'sessions_used' => ($callSession->sessions_used ?? 0) + 1,
                            ]);
                            $manualDeductionApplied = true;

                            Log::info("Manual hangup deduction applied", [
                                'call_session_id' => $callSession->id,
                                'appointment_id' => $appointmentId,
                                'sessions_deducted' => 1,
                            ]);
                        }
                    }
                }

                // Calculate duration from timestamps only
                $duration = $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now());

                // Calculate auto-deductions: every 10 minutes (600 seconds)
                $autoDeductions = floor($duration / 600);
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $remainingAutoDeductions = max(0, $autoDeductions - $alreadyProcessed);

                $totalSessionsToDeduct = $remainingAutoDeductions;

                // Update call duration
                $callSession->update([
                    'call_duration' => $duration,
                    'auto_deductions_processed' => $autoDeductions
                ]);

                // Log billing calculation for debugging
                Log::info("Call session billing calculation", [
                    'duration_seconds' => $duration,
                    'auto_deductions' => $autoDeductions,
                    'already_processed' => $alreadyProcessed,
                    'remaining_auto_deductions' => $remainingAutoDeductions,
                    'manual_deduction_applied' => $manualDeductionApplied,
                ]);

                // Process auto-deductions separately (if any)
                $deductionResult = [
                    'doctor_payment_success' => false,
                    'patient_deduction_success' => false,
                    'doctor_payment_amount' => 0,
                    'patient_sessions_deducted' => 0,
                    'auto_deductions' => $autoDeductions,
                    'manual_deduction_applied' => $manualDeductionApplied,
                    'errors' => []
                ];

                if ($remainingAutoDeductions > 0) {
                    // Get patient subscription with lock
                    $patient = $user;
                    $subscription = $patient->subscription()->lockForUpdate()->first();

                    if ($subscription) {
                        // Determine call type field
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';

                        // Check if patient has enough sessions
                        if ($subscription->$callTypeField >= $remainingAutoDeductions) {
                            // Deduct from patient subscription
                            $subscription->$callTypeField = max(0, $subscription->$callTypeField - $remainingAutoDeductions);
                            $subscription->save();
                            $deductionResult['patient_deduction_success'] = true;
                            $deductionResult['patient_sessions_deducted'] = $remainingAutoDeductions;

                            // Update call session
                            $callSession->auto_deductions_processed = $autoDeductions;
                            $callSession->sessions_used = ($callSession->sessions_used ?? 0) + $remainingAutoDeductions;
                            $callSession->save();

                            // Pay the doctor
                            $doctor = User::find($callSession->doctor_id);
                            if ($doctor) {
                                $doctorWallet = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                                $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $remainingAutoDeductions;
                                $currency = \App\Services\DoctorPaymentService::getCurrency($doctor);

                                $doctorWallet->credit(
                                    $paymentAmount,
                                    "Auto-deduction payment for {$remainingAutoDeductions} {$callType} call session(s) with " . $patient->first_name . " " . $patient->last_name,
                                    $callType,
                                    $callSession->id,
                                    'call_sessions_auto',
                                    [
                                        'patient_name' => $patient->first_name . " " . $patient->last_name,
                                        'session_duration' => $duration,
                                        'sessions_used' => $remainingAutoDeductions,
                                        'auto_deductions' => $remainingAutoDeductions,
                                        'currency' => $currency,
                                        'payment_amount' => $paymentAmount,
                                    ]
                                );

                                // Send payment received notification to doctor
                                try {
                                    $notificationService = new \App\Services\NotificationService();
                                    $patientName = $patient->first_name . ' ' . $patient->last_name;
                                    $notificationService->createNotification(
                                        $doctor->id,
                                        'Payment Received',
                                        "You received a payment of {$paymentAmount} {$currency} from {$patientName}.",
                                        'payment',
                                        [
                                            'amount' => $paymentAmount,
                                            'currency' => $currency,
                                            'payment_id' => $doctorWallet->transactions()->latest()->first()->id ?? null,
                                            'patient_name' => $patientName,
                                        ]
                                    );
                                } catch (\Exception $notificationError) {
                                    // Log but don't fail the payment if notification fails
                                    Log::warning("Failed to send payment received notification (auto deduction)", [
                                        'call_session_id' => $callSession->id,
                                        'doctor_id' => $doctor->id,
                                        'error' => $notificationError->getMessage()
                                    ]);
                                }

                                $deductionResult['doctor_payment_success'] = true;
                                $deductionResult['doctor_payment_amount'] = $paymentAmount;
                            }
                        } else {
                            $deductionResult['errors'][] = 'Insufficient remaining calls for deduction';
                        }
                    } else {
                        $deductionResult['errors'][] = 'Patient subscription not found';
                    }
                }

                Log::info("Call session ended", [
                    'user_id' => $user->id,
                    'call_session_id' => $callSession->id,
                    'call_type' => $callType,
                    'appointment_id' => $appointmentId,
                    'duration_seconds' => $duration,
                    'was_connected' => (bool) $callSession->connected_at,
                    'auto_deductions' => $remainingAutoDeductions,
                    'manual_deduction_applied' => $manualDeductionApplied,
                    'deduction_result' => $deductionResult
                ]);

                // Send session ended notifications to both patient and doctor (only if session was connected)
                if ($callSession->connected_at) {
                    try {
                        $notificationService = new \App\Services\NotificationService();
                        $patient = $callSession->patient;
                        $doctor = $callSession->doctor;

                        // Determine session type for display
                        $sessionType = $callType === 'voice' ? 'audio' : ($callType === 'video' ? 'video' : 'text');

                        // Format duration
                        $durationMinutes = floor($duration / 60);
                        $durationSeconds = $duration % 60;
                        $durationFormatted = $durationMinutes > 0
                            ? "{$durationMinutes} minute" . ($durationMinutes > 1 ? 's' : '') . ($durationSeconds > 0 ? " {$durationSeconds} second" . ($durationSeconds > 1 ? 's' : '') : '')
                            : "{$durationSeconds} second" . ($durationSeconds > 1 ? 's' : '');

                        if ($patient) {
                            $doctorName = $doctor ? ($doctor->first_name . ' ' . $doctor->last_name) : 'Doctor';
                            $notificationService->createNotification(
                                $patient->id,
                                'Session Ended',
                                "Your {$sessionType} session with Dr. {$doctorName} has ended. Duration: {$durationFormatted}.",
                                'session',
                                [
                                    'duration' => $durationFormatted,
                                    'session_type' => $sessionType,
                                    'doctor_name' => $doctorName,
                                    'patient_name' => $patient->first_name . ' ' . $patient->last_name,
                                ]
                            );
                        }

                        if ($doctor) {
                            $patientName = $patient ? ($patient->first_name . ' ' . $patient->last_name) : 'Patient';
                            $notificationService->createNotification(
                                $doctor->id,
                                'Session Ended',
                                "Your {$sessionType} session with {$patientName} has ended. Duration: {$durationFormatted}.",
                                'session',
                                [
                                    'duration' => $durationFormatted,
                                    'session_type' => $sessionType,
                                    'doctor_name' => $doctor->first_name . ' ' . $doctor->last_name,
                                    'patient_name' => $patientName,
                                ]
                            );
                        }
                    } catch (\Exception $notificationError) {
                        // Log but don't fail the request if notification fails
                        Log::warning("Failed to send session ended notification", [
                            'call_session_id' => $callSession->id,
                            'error' => $notificationError->getMessage()
                        ]);
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Call session ended successfully',
                    'duration_seconds' => $duration,
                    'was_connected' => (bool) $callSession->connected_at,
                    'auto_deductions' => $remainingAutoDeductions,
                    'manual_deduction_applied' => $manualDeductionApplied,
                    'deduction_result' => $deductionResult
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Error ending call session", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to end call session'
            ], 500);
        }
    }

    /**
     * Re-notify the doctor about an active call session
     */
    public function reNotify(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionId = $request->input('session_id');

            if (!$appointmentId && !$sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment ID or Session ID is required'
                ], 400);
            }

            $query = CallSession::query();
            if ($sessionId) {
                $query->where('id', $sessionId);
            } else {
                $query->where('appointment_id', $appointmentId);
            }

            // Find the latest active/connecting session for this patient
            $callSession = $query->where('patient_id', $user->id)
                ->where('status', '!=', CallSession::STATUS_ENDED)
                ->latest()
                ->first();

            if (!$callSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active call session not found'
                ], 404);
            }

            $doctorId = $callSession->doctor_id;
            $doctor = User::find($doctorId);

            if (!$doctor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Doctor not found'
                ], 404);
            }

            // Re-send notification
            $notified = false;
            $tokensCount = !empty($doctor->push_token) ? 1 : 0;

            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                try {
                    $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                    $notified = true;
                } catch (\Exception $notifyError) {
                    Log::error("Failed to trigger re-notification", [
                        'doctor_id' => $doctorId,
                        'error' => $notifyError->getMessage()
                    ]);
                }
            }

            Log::info("Call session re-notified", [
                'user_id' => $user->id,
                'call_session_id' => $callSession->id,
                'doctor_id' => $doctorId,
                'notified' => $notified
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification re-sent successfully',
                'data' => [
                    'notified' => $notified,
                    'tokens' => $tokensCount,
                    'last_notified_at' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error re-notifying call session", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to re-send notification'
            ], 500);
        }
    }

    /**
     * Process call deduction (for periodic billing)
     */
    public function deduction(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $callType = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $sessionDuration = $request->input('session_duration', 0);

            return DB::transaction(function () use ($user, $callType, $appointmentId, $sessionDuration) {
                // Find the call session - must have connected_at for billing
                // Do NOT restrict by status - status might be 'connecting' but call is actually connected
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where('patient_id', $user->id)
                    ->where('status', '!=', CallSession::STATUS_ENDED) // Only exclude ended
                    ->lockForUpdate()
                    ->first();

                if (!$callSession) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No active call session found'
                    ], 404);
                }

                // CRITICAL: Only process billing if call is actually connected
                // RACE-CONDITION SAFETY: If answered but connected_at missing, fix it now
                if (!$callSession->connected_at) {
                    if ($callSession->answered_at) {
                        // Race condition: promotion job may have failed
                        Log::warning("RACE CONDITION: Deduction attempted but connected_at missing despite answered - fixing now", [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId,
                            'answered_at' => $callSession->answered_at->toISOString()
                        ]);

                        // Fix race condition: use answered_at as connected_at
                        $callSession->update([
                            'is_connected' => true,
                            'connected_at' => $callSession->answered_at,
                            'status' => CallSession::STATUS_ACTIVE,
                        ]);

                        $callSession->refresh();

                        Log::info("RACE CONDITION FIXED in deduction: Set connected_at to answered_at", [
                            'call_session_id' => $callSession->id,
                            'connected_at' => $callSession->connected_at->toISOString()
                        ]);
                    } else {
                        // Call never answered - cannot bill
                        Log::warning("Deduction attempted for unconnected call", [
                            'call_session_id' => $callSession->id,
                            'appointment_id' => $appointmentId
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Call is not connected - cannot process billing'
                        ], 400);
                    }
                }

                // Calculate duration from timestamps only
                $duration = $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now());

                // Calculate auto-deductions: every 10 minutes (600 seconds)
                $autoDeductions = floor($duration / 600);
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $newDeductions = max(0, $autoDeductions - $alreadyProcessed);

                // Manual deduction: +1 on manual hangup
                $manualDeduction = $callSession->ended_at ? 1 : 0;

                $deductionResult = [
                    'deductions_processed' => 0,
                    'remaining_calls' => 0,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
                    'manual_deduction' => $manualDeduction,
                    'errors' => []
                ];

                // Only process if there are new deductions to make
                if ($newDeductions > 0) {
                    $patient = $user;
                    $subscription = $patient->subscription()->lockForUpdate()->first();

                    if ($subscription) {
                        // Determine call type field
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';

                        // Check if patient has enough sessions
                        if ($subscription->$callTypeField >= $newDeductions) {
                            // Deduct from patient subscription
                            $subscription->$callTypeField = max(0, $subscription->$callTypeField - $newDeductions);
                            $subscription->save();

                            // Update call session
                            $callSession->auto_deductions_processed = $autoDeductions;
                            $callSession->sessions_used = ($callSession->sessions_used ?? 0) + $newDeductions;
                            $callSession->save();

                            // Pay the doctor for new deductions
                            $doctor = User::find($callSession->doctor_id);
                            if ($doctor) {
                                $doctorWallet = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                                $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $newDeductions;
                                $currency = \App\Services\DoctorPaymentService::getCurrency($doctor);

                                $doctorWallet->credit(
                                    $paymentAmount,
                                    "Auto-deduction payment for {$newDeductions} {$callType} call session(s) with " . $patient->first_name . " " . $patient->last_name,
                                    $callType,
                                    $callSession->id,
                                    'call_sessions_auto',
                                    [
                                        'patient_name' => $patient->first_name . " " . $patient->last_name,
                                        'session_duration' => $duration,
                                        'sessions_used' => $newDeductions,
                                        'auto_deductions' => $newDeductions,
                                        'currency' => $currency,
                                        'payment_amount' => $paymentAmount,
                                    ]
                                );
                            }

                            $deductionResult['deductions_processed'] = $newDeductions;
                            $deductionResult['remaining_calls'] = $subscription->$callTypeField;
                        } else {
                            $deductionResult['errors'][] = 'Insufficient remaining calls for auto-deduction';
                        }
                    } else {
                        $deductionResult['errors'][] = 'Patient subscription not found';
                    }
                }

                Log::info("Call auto-deduction processed", [
                    'user_id' => $user->id,
                    'call_type' => $callType,
                    'appointment_id' => $appointmentId,
                    'duration_seconds' => $duration,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
                    'manual_deduction' => $manualDeduction,
                    'deduction_result' => $deductionResult
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Call deduction processed successfully',
                    'data' => $deductionResult
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Error processing call deduction", [
                'user_id' => Auth::id(),
                'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process call deduction'
            ], 500);
        }
    }

    /**
     * Handle call answer from notification
     */
    public function answer(Request $request): JsonResponse
    {
        $appointmentId = $request->input('appointment_id');

        $callSession = CallSession::where('appointment_id', $appointmentId)
            ->latest()
            ->first();

        $callSession->update([
            'answered_at' => now(),
            'answered_by' => auth()->id(),
        ]);

        $callSession->refresh();

        // Dispatch job to promote to connected after 5 seconds
        PromoteCallToConnected::dispatch($callSession->id, $appointmentId)
            ->delay(now()->addSeconds(5));

        return response()->json([
            'success' => true,
            'answered_at' => $callSession->answered_at,
            'answered_by' => $callSession->answered_by,
        ]);
    }

    /**
     * Mark call as connected (optional confirmation from WebRTC events)
     * NOTE: This is now OPTIONAL - server automatically promotes answered -> connected after grace period
     * WebRTC events are treated as confirmation signals, not the source of truth
     * The backend job PromoteCallToConnected is the source of truth
     */
    public function markConnected(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $callType = $request->input('call_type');

            if (!$appointmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment ID is required'
                ], 400);
            }

            return DB::transaction(function () use ($user, $appointmentId, $callType) {
                // Find the call session - accept connecting, answered, or active (in case status was set elsewhere)
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where(function ($query) use ($user) {
                        $query->where('patient_id', $user->id)
                            ->orWhere('doctor_id', $user->id);
                    })
                    ->whereIn('status', [
                        CallSession::STATUS_CONNECTING,
                        CallSession::STATUS_ANSWERED,
                        CallSession::STATUS_ACTIVE // Also accept active in case status was set but connected_at is missing
                    ])
                    ->where('status', '!=', CallSession::STATUS_ENDED) // Exclude ended calls
                    ->lockForUpdate()
                    ->first();

                if (!$callSession) {
                    // Log for debugging
                    $existingCall = CallSession::where('appointment_id', $appointmentId)
                        ->where(function ($query) use ($user) {
                            $query->where('patient_id', $user->id)
                                ->orWhere('doctor_id', $user->id);
                        })
                        ->first();

                    Log::warning("Call session not found for mark-connected", [
                        'appointment_id' => $appointmentId,
                        'user_id' => $user->id,
                        'existing_call_status' => $existingCall ? $existingCall->status : 'not found',
                        'existing_call_connected_at' => $existingCall && $existingCall->connected_at ? $existingCall->connected_at->toISOString() : 'null'
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Call session not found or in invalid state for connection',
                        'debug' => [
                            'existing_status' => $existingCall ? $existingCall->status : null,
                            'existing_connected_at' => $existingCall && $existingCall->connected_at ? $existingCall->connected_at->toISOString() : null
                        ]
                    ], 404);
                }

                // CRITICAL: Only update if not already connected (idempotent)
                if ($callSession->is_connected && $callSession->connected_at) {
                    Log::info("Call already marked as connected", [
                        'call_session_id' => $callSession->id,
                        'appointment_id' => $appointmentId,
                        'connected_at' => $callSession->connected_at
                    ]);
                    return response()->json([
                        'success' => true,
                        'message' => 'Call already connected',
                        'data' => [
                            'call_session_id' => $callSession->id,
                            'connected_at' => $callSession->connected_at->toISOString()
                        ]
                    ]);
                }

                // Handle case where status is 'active' but connected_at is missing (fix inconsistent state)
                if ($callSession->status === CallSession::STATUS_ACTIVE && !$callSession->connected_at) {
                    Log::warning("Call status is active but connected_at is missing - fixing", [
                        'call_session_id' => $callSession->id,
                        'appointment_id' => $appointmentId
                    ]);
                }

                // Update call session to connected state
                $callSession->markAsConnected();

                Log::info("Call marked as connected via WebRTC", [
                    'user_id' => $user->id,
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $appointmentId,
                    'call_type' => $callType,
                    'connected_at' => $callSession->connected_at
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Call marked as connected',
                    'data' => [
                        'call_session_id' => $callSession->id,
                        'status' => $callSession->status,
                        'is_connected' => $callSession->is_connected,
                        'connected_at' => $callSession->connected_at->toISOString()
                    ]
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Error marking call as connected", [
                'user_id' => Auth::id(),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mark call as connected'
            ], 500);
        }
    }

    /**
     * Handle call decline from notification
     */
    public function decline(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $callerId = $request->input('caller_id'); // Patient ID (the caller)
            $sessionId = $request->input('session_id');
            $reason = $request->input('reason', 'declined_by_user');

            if (!$appointmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameters: appointment_id'
                ], 400);
            }

            // CRITICAL: Find the latest call session by appointment_id that is NOT ended
            // The current user ($user) is the doctor declining the call
            // Do NOT restrict by status - connecting is a transport state, not a lifecycle state
            $callSession = CallSession::where('appointment_id', $appointmentId)
                ->where('doctor_id', $user->id) // Current user is the doctor declining
                ->where('status', '!=', CallSession::STATUS_ENDED) // Only exclude ended
                ->orderBy('created_at', 'desc') // Get latest if multiple exist
                ->first();

            if (!$callSession) {
                Log::warning("Call decline: No non-ended call session found", [
                    'appointment_id' => $appointmentId,
                    'caller_id' => $callerId,
                    'user_id' => $user->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found or already ended'
                ], 404);
            }

            // If already declined, return success (idempotent)
            if ($callSession->declined_at) {
                Log::info("Call already declined - returning success", [
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $appointmentId,
                    'declined_at' => $callSession->declined_at->toISOString()
                ]);
                return response()->json([
                    'success' => true,
                    'message' => 'Call already declined',
                    'data' => [
                        'call_session_id' => $callSession->id,
                        'status' => $callSession->status,
                        'declined_at' => $callSession->declined_at->toISOString()
                    ]
                ]);
            }

            // Update call session status
            $callSession->update([
                'status' => 'declined',
                'declined_at' => now(),
                'declined_by' => $user->id,
                'decline_reason' => $reason
            ]);

            Log::info("Call declined", [
                'user_id' => $user->id,
                'appointment_id' => $appointmentId,
                'caller_id' => $callerId,
                'session_id' => $sessionId,
                'reason' => $reason,
                'call_session_id' => $callSession->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call declined successfully',
                'data' => [
                    'call_session_id' => $callSession->id,
                    'status' => 'declined',
                    'declined_at' => $callSession->declined_at,
                    'reason' => $reason
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error declining call", [
                'user_id' => Auth::id(),
                'appointment_id' => $request->input('appointment_id'),
                'caller_id' => $request->input('caller_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to decline call'
            ], 500);
        }
    }
}
