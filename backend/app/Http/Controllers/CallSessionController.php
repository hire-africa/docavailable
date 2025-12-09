<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subscription;
use App\Models\CallSession;
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

            if (!$appointmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment ID is required'
                ], 400);
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
            if (str_starts_with($appointmentId, 'direct_session_')) {
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
                // For regular appointments, get doctor from appointment
                // This would require querying the appointments table
                // For now, we'll assume the appointment ID contains the doctor info
                $doctorId = $request->input('doctor_id');
                if (!$doctorId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doctor ID is required'
                    ], 400);
                }
            }

            // Check if there's already an active call session
            $existingSession = CallSession::where('patient_id', $user->id)
                ->where('doctor_id', $doctorId)
                ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR])
                ->first();

            if ($existingSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an active call session with this doctor'
                ], 400);
            }

            // Create call session record
            $callSession = CallSession::create([
                'patient_id' => $user->id,
                'doctor_id' => $doctorId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'status' => CallSession::STATUS_CONNECTING,
                'started_at' => now(),
                'last_activity_at' => now(),
                'reason' => $reason,
                'sessions_used' => 0, // FIX: Start with 0, will be deducted after 10 minutes and on hangup
                'sessions_remaining_before_start' => $sessionsRemainingBeforeStart,
                'is_connected' => false,
                'call_duration' => 0,
            ]);

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
                    $query->where('id', $sessionId)->where('patient_id', $user->id);
                } elseif ($appointmentId) {
                    $query->where('appointment_id', $appointmentId)->where('patient_id', $user->id);
                } else {
                    return response()->json(['success' => false, 'message' => 'Session ID or Appointment ID required'], 400);
                }
                
                $callSession = $query->lockForUpdate()->first();

                if (!$callSession) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Call session not found'
                    ], 404);
                }

                // Calculate sessions to deduct based on duration and connection
                
                // SECURITY FIX: Validate session_duration against server-side elapsed time
                // Allow a small buffer (e.g., 60 seconds) for network latency/clock drift
                $serverElapsedSeconds = $callSession->started_at->diffInSeconds(now());
                $maxAllowedDuration = $serverElapsedSeconds + 60;
                
                if ($sessionDuration > $maxAllowedDuration) {
                    Log::warning("Suspicious session duration detected", [
                        'session_id' => $callSession->id,
                        'reported_duration' => $sessionDuration,
                        'server_elapsed' => $serverElapsedSeconds,
                        'capped_at' => $maxAllowedDuration
                    ]);
                    $sessionDuration = $maxAllowedDuration;
                }

                // Convert session duration from seconds to minutes
                $elapsedMinutes = floor($sessionDuration / 60);
                $autoDeductions = floor($elapsedMinutes / 10); // Every 10 minutes
                
                // FIX: Account for already processed auto-deductions
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $remainingAutoDeductions = max(0, $autoDeductions - $alreadyProcessed);
                
                $manualDeduction = $wasConnected ? 1 : 0; // Only deduct on hangup if connected
                $totalSessionsToDeduct = $remainingAutoDeductions + $manualDeduction;

                // Log billing calculation for debugging
                Log::info("Call session billing calculation", [
                    'session_duration_seconds' => $sessionDuration,
                    'elapsed_minutes' => $elapsedMinutes,
                    'auto_deductions' => $autoDeductions,
                    'already_processed' => $alreadyProcessed,
                    'remaining_auto_deductions' => $remainingAutoDeductions,
                    'manual_deduction' => $manualDeduction,
                    'total_sessions_to_deduct' => $totalSessionsToDeduct,
                    'was_connected' => $wasConnected
                ]);

                // Update the call session status
                $callSession->update([
                    'status' => CallSession::STATUS_ENDED,
                    'ended_at' => now(),
                    'last_activity_at' => now(),
                    'is_connected' => $wasConnected,
                    'call_duration' => $sessionDuration,
                    'sessions_used' => ($callSession->sessions_used ?? 0) + $totalSessionsToDeduct,
                    'auto_deductions_processed' => $autoDeductions // Update to full count
                ]);

                // Process deductions and doctor payments if there are sessions to deduct
                $deductionResult = [
                    'doctor_payment_success' => false,
                    'patient_deduction_success' => false,
                    'doctor_payment_amount' => 0,
                    'patient_sessions_deducted' => 0,
                    'auto_deductions' => $autoDeductions,
                    'manual_deduction' => $manualDeduction,
                    'errors' => []
                ];

                if ($totalSessionsToDeduct > 0 && $wasConnected) {
                    // Get patient subscription with lock
                    $patient = $user;
                    $subscription = $patient->subscription()->lockForUpdate()->first();
                    
                    if ($subscription) {
                        // Determine call type field
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
                        
                        // Check if patient has enough sessions
                        if ($subscription->$callTypeField >= $totalSessionsToDeduct) {
                            // Deduct from patient subscription
                            $subscription->$callTypeField = max(0, $subscription->$callTypeField - $totalSessionsToDeduct);
                            $subscription->save();
                            $deductionResult['patient_deduction_success'] = true;
                            $deductionResult['patient_sessions_deducted'] = $totalSessionsToDeduct;

                            // Pay the doctor
                            $doctor = User::find($callSession->doctor_id);
                            if ($doctor) {
                                $doctorWallet = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                                $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $totalSessionsToDeduct;
                                $currency = \App\Services\DoctorPaymentService::getCurrency($doctor);
                                
                                $doctorWallet->credit(
                                    $paymentAmount,
                                    "Payment for {$totalSessionsToDeduct} {$callType} call session(s) with " . $patient->first_name . " " . $patient->last_name,
                                    $callType,
                                    $callSession->id,
                                    'call_sessions',
                                    [
                                        'patient_name' => $patient->first_name . " " . $patient->last_name,
                                        'session_duration' => $sessionDuration,
                                        'sessions_used' => $totalSessionsToDeduct,
                                        'auto_deductions' => $autoDeductions,
                                        'manual_deduction' => $manualDeduction,
                                        'currency' => $currency,
                                        'payment_amount' => $paymentAmount,
                                    ]
                                );
                                
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
                    'session_duration' => $sessionDuration,
                    'was_connected' => $wasConnected,
                    'sessions_deducted' => $totalSessionsToDeduct,
                    'auto_deductions' => $autoDeductions,
                    'manual_deduction' => $manualDeduction,
                    'deduction_result' => $deductionResult
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Call session ended successfully',
                    'session_duration' => $sessionDuration,
                    'was_connected' => $wasConnected,
                    'sessions_deducted' => $totalSessionsToDeduct,
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

    // ... reNotify method ...

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
                // Find the active call session with lock
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where('patient_id', $user->id)
                    ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING])
                    ->lockForUpdate()
                    ->first();

                if (!$callSession) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No active call session found'
                    ], 404);
                }

                // Calculate auto-deductions for every 10 minutes
                // Convert session duration from seconds to minutes
                $elapsedMinutes = floor($sessionDuration / 60);
                $autoDeductions = floor($elapsedMinutes / 10);
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $newDeductions = max(0, $autoDeductions - $alreadyProcessed);

                $deductionResult = [
                    'deductions_processed' => 0,
                    'remaining_calls' => 0,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
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
                                        'session_duration' => $sessionDuration,
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
                    'session_duration' => $sessionDuration,
                    'auto_deductions' => $autoDeductions,
                    'new_deductions' => $newDeductions,
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
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $callerId = $request->input('caller_id');
            $sessionId = $request->input('session_id');

            if (!$appointmentId || !$callerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameters'
                ], 400);
            }

            // Find the call session
            $callSession = CallSession::where('appointment_id', $appointmentId)
                ->where('doctor_id', $callerId)
                ->where('status', 'pending')
                ->first();

            if (!$callSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found or already answered'
                ], 404);
            }

            // Update call session status
            $callSession->update([
                'status' => 'answered',
                'answered_at' => now(),
                'answered_by' => $user->id
            ]);

            Log::info("Call answered", [
                'user_id' => $user->id,
                'appointment_id' => $appointmentId,
                'caller_id' => $callerId,
                'session_id' => $sessionId,
                'call_session_id' => $callSession->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call answered successfully',
                'data' => [
                    'call_session_id' => $callSession->id,
                    'status' => 'answered',
                    'answered_at' => $callSession->answered_at
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error answering call", [
                'user_id' => Auth::id(),
                'appointment_id' => $request->input('appointment_id'),
                'caller_id' => $request->input('caller_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to answer call'
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
            $callerId = $request->input('caller_id');
            $sessionId = $request->input('session_id');
            $reason = $request->input('reason', 'declined_by_user');

            if (!$appointmentId || !$callerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameters'
                ], 400);
            }

            // Find the call session
            $callSession = CallSession::where('appointment_id', $appointmentId)
                ->where('doctor_id', $callerId)
                ->where('status', 'pending')
                ->first();

            if (!$callSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found or already handled'
                ], 404);
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
