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
                            'status' => CallSession::STATUS_ENDED,
                            'ended_at' => now(),
                            'last_activity_at' => now(),
                            'is_connected' => false,
                            'call_duration' => 0,
                        ]);

                        return response()->json([
                            'success' => true,
                            'message' => 'Call session ended (never connected - no billing)',
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

                // Calculate duration from connected_at (not started_at)
                // This is the actual billable time
                $connectedDuration = $callSession->connected_at->diffInSeconds(now());
                
                // SECURITY FIX: Validate session_duration against server-side connected time
                // Allow a small buffer (e.g., 60 seconds) for network latency/clock drift
                $maxAllowedDuration = $connectedDuration + 60;
                
                if ($sessionDuration > $maxAllowedDuration) {
                    Log::warning("Suspicious session duration detected", [
                        'session_id' => $callSession->id,
                        'reported_duration' => $sessionDuration,
                        'server_connected_duration' => $connectedDuration,
                        'capped_at' => $maxAllowedDuration
                    ]);
                    $sessionDuration = $maxAllowedDuration;
                }

                // Use the validated duration for billing calculations
                // Convert session duration from seconds to minutes
                $elapsedMinutes = floor($sessionDuration / 60);
                $autoDeductions = floor($elapsedMinutes / 10); // Every 10 minutes
                
                // FIX: Account for already processed auto-deductions
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $remainingAutoDeductions = max(0, $autoDeductions - $alreadyProcessed);
                
                // CRITICAL: Always add +1 session on manual hang up (if call was connected)
                // This is in addition to auto-deductions
                $manualDeduction = $wasConnected ? 1 : 0;
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

                // Calculate auto-deductions for every 10 minutes
                // Use connected_at as the billing start time
                $connectedDuration = $callSession->connected_at->diffInSeconds(now());
                $maxAllowedDuration = $connectedDuration + 60;
                
                if ($sessionDuration > $maxAllowedDuration) {
                    Log::warning("Suspicious session duration in deduction", [
                        'session_id' => $callSession->id,
                        'reported_duration' => $sessionDuration,
                        'server_connected_duration' => $connectedDuration,
                        'capped_at' => $maxAllowedDuration
                    ]);
                    $sessionDuration = $maxAllowedDuration;
                }

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
            $callerId = $request->input('caller_id'); // Patient ID (the caller)
            $sessionId = $request->input('session_id');

            if (!$appointmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameters: appointment_id'
                ], 400);
            }

            // CRITICAL: Find the latest call session by appointment_id that is NOT ended
            // The current user ($user) is the doctor answering the call
            // Do NOT restrict by status - connecting is a transport state, not a lifecycle state
            // Lifecycle states: ringing (unanswered) → answered → ended
            // Transport states: connecting, etc. (should never block transitions)
            $callSession = CallSession::where('appointment_id', $appointmentId)
                ->where('doctor_id', $user->id) // Current user is the doctor answering
                ->where('status', '!=', CallSession::STATUS_ENDED) // Only exclude ended
                ->orderBy('created_at', 'desc') // Get latest if multiple exist
                ->first();

            if (!$callSession) {
                Log::warning("Call answer: No non-ended call session found", [
                    'appointment_id' => $appointmentId,
                    'caller_id' => $callerId,
                    'user_id' => $user->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found or already ended'
                ], 404);
            }
            
            // If already answered, return success (idempotent)
            if ($callSession->answered_at) {
                Log::info("Call already answered - returning success", [
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $appointmentId,
                    'answered_at' => $callSession->answered_at->toISOString()
                ]);
                return response()->json([
                    'success' => true,
                    'message' => 'Call already answered',
                    'data' => [
                        'call_session_id' => $callSession->id,
                        'status' => $callSession->status,
                        'answered_at' => $callSession->answered_at->toISOString()
                    ]
                ]);
            }

            // CRITICAL: ALWAYS transition to answered and set answered_at
            // This is a lifecycle transition - transport state (connecting) must not block it
            // If status is 'connecting', we still answer it - connecting is not a valid lifecycle state
            $previousStatus = $callSession->status;
            $callSession->update([
                'status' => CallSession::STATUS_ANSWERED, // Always set to answered
                'answered_at' => now(),
                'answered_by' => $user->id
            ]);
            
            Log::info("Call answered - status transitioned", [
                'call_session_id' => $callSession->id,
                'appointment_id' => $appointmentId,
                'previous_status' => $previousStatus,
                'new_status' => CallSession::STATUS_ANSWERED,
                'answered_at' => $callSession->answered_at->toISOString()
            ]);

            // CRITICAL: Server-owned lifecycle - automatically promote to connected after grace period
            // This happens independently of WebRTC events
            // PRODUCTION-SAFE: Try queue first, fallback to direct promotion if queue fails
            try {
                PromoteCallToConnected::dispatch($callSession->id, $appointmentId)
                    ->delay(now()->addSeconds(5));
                    
                Log::info("PromoteCallToConnected job dispatched successfully", [
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $appointmentId
                ]);
            } catch (\Exception $e) {
                // Queue may be down - log and rely on scheduled command fallback
                Log::warning("Failed to dispatch PromoteCallToConnected job - scheduled command will handle", [
                    'call_session_id' => $callSession->id,
                    'appointment_id' => $appointmentId,
                    'error' => $e->getMessage()
                ]);
            }

            Log::info("Call answered - server will promote to connected after grace period", [
                'user_id' => $user->id,
                'appointment_id' => $appointmentId,
                'caller_id' => $callerId,
                'session_id' => $sessionId,
                'call_session_id' => $callSession->id,
                'promotion_scheduled_in_seconds' => 5
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call answered successfully',
                'data' => [
                    'call_session_id' => $callSession->id,
                    'status' => 'answered',
                    'answered_at' => $callSession->answered_at,
                    'will_promote_to_connected_in_seconds' => 5
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
