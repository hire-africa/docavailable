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
     * Generate LiveKit access token using raw JWT (no SDK required)
     */
    private function generateLiveKitToken(string $roomName, int|string $userId, string $userName): string
    {
        $apiKey    = env('LIVEKIT_API_KEY');
        $apiSecret = env('LIVEKIT_API_SECRET');
        $now       = time();
        $exp       = $now + 7200;

        $header  = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->base64UrlEncode(json_encode([
            'iss'  => $apiKey,
            'sub'  => (string) $userId,
            'iat'  => $now,
            'exp'  => $exp,
            'nbf'  => $now,
            'name' => $userName,
            'video' => [
                'roomJoin'     => true,
                'room'         => $roomName,
                'canPublish'   => true,
                'canSubscribe' => true,
            ],
        ]));

        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", $apiSecret, true)
        );

        return "$header.$payload.$signature";
    }

    private function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    /**
     * Check if user can make a call (voice or video)
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $callType = $request->input('call_type');
            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json(['success' => false, 'message' => 'Invalid call type. Must be voice or video'], 400);
            }

            $totalRemaining = Subscription::getTotalRemaining($user->id, $callType);

            if ($totalRemaining <= 0) {
                $hasAny = Subscription::where('user_id', $user->id)->exists();
                if (!$hasAny) {
                    return response()->json([
                        'success' => false, 'can_make_call' => false,
                        'message' => 'No subscription found. Please subscribe to make calls.',
                        'remaining_calls' => 0
                    ]);
                }
                return response()->json([
                    'success' => false, 'can_make_call' => false,
                    'message' => "No remaining {$callType} calls in your subscription. Please upgrade or wait for renewal.",
                    'remaining_calls' => 0
                ]);
            }

            $remainingCalls = $totalRemaining;
            $aggregated     = Subscription::getAggregatedSessions($user->id);

            if ($remainingCalls <= 0) {
                return response()->json([
                    'success' => false, 'can_make_call' => false,
                    'message' => "No remaining {$callType} calls in your subscription. Please upgrade or wait for renewal.",
                    'remaining_calls' => $remainingCalls
                ]);
            }

            Log::info("Call availability checked", [
                'user_id' => $user->id, 'call_type' => $callType,
                'remaining_calls' => $remainingCalls, 'subscription_active' => true
            ]);

            return response()->json([
                'success'         => true,
                'can_make_call'   => true,
                'message'         => "You have {$remainingCalls} {$callType} calls remaining",
                'remaining_calls' => $remainingCalls,
                'subscription'    => [
                    'textSessionsRemaining'  => $aggregated['text_sessions_remaining'],
                    'voiceCallsRemaining'    => $aggregated['voice_calls_remaining'],
                    'videoCallsRemaining'    => $aggregated['video_calls_remaining'],
                    'isActive'               => true
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error checking call availability", [
                'user_id' => Auth::id(), 'call_type' => $request->input('call_type'),
                'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false, 'can_make_call' => false,
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $callType      = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $reason        = $request->input('reason');

            if (!in_array($callType, ['voice', 'video'])) {
                return response()->json(['success' => false, 'message' => 'Invalid call type. Must be voice or video'], 400);
            }

            if (!$appointmentId) {
                $appointmentId = 'direct_session_' . time() . '_' . substr(md5((string) microtime(true)), 0, 8);
            }

            $isDirectSession = str_starts_with((string) $appointmentId, 'direct_session_');
            $appointment     = null;

            if (!$isDirectSession && is_numeric((string) $appointmentId)) {
                $appointment = \App\Models\Appointment::find((int) $appointmentId);
                if (!$appointment) {
                    return response()->json(['success' => false, 'message' => 'Appointment not found'], 404);
                }

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
                    return response()->json(['success' => false, 'message' => 'Unauthorized to start this call session'], 403);
                }

                $apptType        = (string) ($appointment->appointment_type ?? '');
                $expectedCallType = ($apptType === 'video') ? 'video' : (in_array($apptType, ['audio', 'voice'], true) ? 'voice' : null);

                if (!$expectedCallType) {
                    return response()->json(['success' => false, 'message' => 'Only audio/video appointments can start call sessions'], 400);
                }
                if ($expectedCallType !== $callType) {
                    return response()->json(['success' => false, 'message' => 'Call type does not match appointment type'], 400);
                }

                $existing = CallSession::where('appointment_id', (string) $appointmentId)
                    ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($existing) {
                    $token = $this->generateLiveKitToken('call_' . $existing->id, $user->id, trim($user->first_name . ' ' . $user->last_name) ?: 'User');
                    return response()->json([
                        'success' => true,
                        'message' => 'Call session already exists for this appointment',
                        'data'    => [
                            'session_id'      => $existing->id,
                            'call_session_id' => $existing->id,
                            'session_context' => 'call_session:' . $existing->id,
                            'appointment_id'  => (string) $appointmentId,
                            'call_type'       => $existing->call_type,
                            'status'          => $existing->status,
                            'started_at'      => $existing->started_at ? $existing->started_at->toISOString() : null,
                            'livekit_token'   => $token,
                            'livekit_url'     => env('LIVEKIT_URL'),
                        ],
                    ]);
                }

            } else if ($isDirectSession) {
                $existingDirect = CallSession::where('appointment_id', (string) $appointmentId)
                    ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                    ->first();

                if ($existingDirect) {
                    $token = $this->generateLiveKitToken('call_' . $existingDirect->id, $user->id, trim($user->first_name . ' ' . $user->last_name) ?: 'User');
                    return response()->json([
                        'success' => true,
                        'message' => 'Direct call session already exists',
                        'data'    => [
                            'session_id'      => $existingDirect->id,
                            'call_session_id' => $existingDirect->id,
                            'session_context' => 'call_session:' . $existingDirect->id,
                            'appointment_id'  => (string) $appointmentId,
                            'call_type'       => $existingDirect->call_type,
                            'status'          => $existingDirect->status,
                            'started_at'      => $existingDirect->started_at ? $existingDirect->started_at->toISOString() : null,
                            'livekit_token'   => $token,
                            'livekit_url'     => env('LIVEKIT_URL'),
                        ],
                    ]);
                }
            }

            $availabilityResponse = $this->checkAvailability($request);
            $availabilityData     = $availabilityResponse->getData(true);
            if (!$availabilityData['success'] || !$availabilityData['can_make_call']) {
                return $availabilityResponse;
            }

            $totalRemaining = Subscription::getTotalRemaining($user->id, $callType);
            $doctorId       = null;

            if ($isDirectSession) {
                $doctorId = $request->input('doctor_id');
                if (!$doctorId) {
                    return response()->json(['success' => false, 'message' => 'Doctor ID is required for direct sessions'], 400);
                }
            } else {
                if ($appointment) {
                    $doctorId = (int) $appointment->doctor_id;
                }
            }

            // Patient guard
            $anyExistingPatientCall = \App\Models\CallSession::where('patient_id', $user->id)
                ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                ->where('appointment_id', '!=', (string) $appointmentId)
                ->first();

            if ($anyExistingPatientCall) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an active call session. Please end it before starting a new one.',
                    'error_code' => 'PARALLEL_SESSION_BLOCKED',
                ], 409);
            }

            // Doctor guard
            if ($doctorId) {
                $doctorBusyInText = \App\Models\TextSession::where('doctor_id', $doctorId)
                    ->whereIn('status', [\App\Models\TextSession::STATUS_ACTIVE, \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR])
                    ->where('updated_at', '>', now()->subMinutes(10))
                    ->exists();

                $doctorBusyInCall = \App\Models\CallSession::where('doctor_id', $doctorId)
                    ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                    ->where('appointment_id', '!=', (string) $appointmentId)
                    ->exists();

                if ($doctorBusyInText || $doctorBusyInCall) {
                    return response()->json([
                        'success'          => false,
                        'message'          => 'Doctor is currently in another session',
                        'error_code'       => 'DOCTOR_BUSY',
                        'debug_busy_call'  => $doctorBusyInCall,
                        'debug_busy_text'  => $doctorBusyInText
                    ], 409);
                }
            }

            $sessionCreationService = app(SessionCreationService::class);
            $sessionResult = $sessionCreationService->createCallSession(
                (int) $user->id, (int) $doctorId, (string) $callType,
                (string) $appointmentId, $reason, $appointment ? 'APPOINTMENT' : 'INSTANT'
            );

            if (!$sessionResult['success'] || empty($sessionResult['session'])) {
                return response()->json(['success' => false, 'message' => $sessionResult['message'] ?? 'Failed to start call session'], 400);
            }

            /** @var CallSession $callSession */
            $callSession  = $sessionResult['session'];
            $notified     = false;
            $tokensCount  = 0;

            try {
                $doctor = User::find($doctorId);
                if ($doctor) {
                    $tokensCount = !empty($doctor->push_token) ? 1 : 0;
                    Log::info('📣 Incoming call: preparing push', [
                        'appointment_id' => $appointmentId, 'call_type' => $callType,
                        'caller_id' => $user->id, 'doctor_id' => $doctorId, 'tokens_count' => $tokensCount,
                    ]);

                    try {
                        $notification = new \App\Notifications\IncomingCallNotification($callSession, $user);
                        if (method_exists($notification, 'toFcm')) {
                            $payload   = $notification->toFcm($doctor);
                            $sanitized = [
                                'title'        => $payload['title'] ?? null,
                                'body'         => $payload['body'] ?? null,
                                'data_keys'    => array_keys($payload['data'] ?? []),
                                'data_preview' => [
                                    'type'           => $payload['data']['type'] ?? null,
                                    'appointment_id' => $payload['data']['appointment_id'] ?? null,
                                    'call_type'      => $payload['data']['call_type'] ?? null,
                                    'doctor_id'      => $payload['data']['doctor_id'] ?? null,
                                    'caller_id'      => $payload['data']['caller_id'] ?? null,
                                ],
                            ];
                            Log::info('FCM payload (sanitized) for IncomingCallNotification', $sanitized);
                            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                                $doctor->notify($notification);
                                $notified = true;
                            } else {
                                Log::warning('⚠️ No token or push disabled for doctor; skipping push send', [
                                    'doctor_id' => $doctorId, 'push_enabled' => $doctor->push_notifications_enabled, 'has_token' => $tokensCount > 0,
                                ]);
                            }
                        } else {
                            Log::warning('IncomingCallNotification has no toFcm method - sending without payload preview');
                            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                                $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                                $notified = true;
                            }
                        }
                    } catch (\Throwable $t) {
                        Log::error('Error building/logging FCM payload for IncomingCallNotification', [
                            'error' => $t->getMessage(), 'trace' => config('app.debug') ? $t->getTraceAsString() : 'hidden',
                        ]);
                        if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                            $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                            $notified = true;
                        }
                    }

                    Log::info('📤 Incoming call push attempted', [
                        'appointment_id' => $appointmentId, 'tokens_count' => $tokensCount,
                        'result' => $notified ? 'success' : 'skipped_or_unknown',
                    ]);
                } else {
                    Log::warning('Doctor not found for call notification', ['doctor_id' => $doctorId, 'call_session_id' => $callSession->id]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to send incoming call notification', ['doctor_id' => $doctorId, 'call_session_id' => $callSession->id, 'error' => $e->getMessage()]);
            }

            $roomName = 'call_' . $callSession->id;
            $token    = $this->generateLiveKitToken($roomName, $user->id, trim($user->first_name . ' ' . $user->last_name) ?: 'User');

            Log::info("Call session started (LiveKit Token created)", [
                'user_id' => $user->id, 'call_session_id' => $callSession->id,
                'call_type' => $callType, 'appointment_id' => $appointmentId,
                'doctor_id' => $doctorId, 'remaining_calls' => $totalRemaining, 'room_name' => $roomName
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Call session started successfully',
                'data'    => [
                    'session_id'      => $callSession->id,
                    'call_session_id' => $callSession->id,
                    'session_context' => 'call_session:' . $callSession->id,
                    'appointment_id'  => $appointmentId,
                    'call_type'       => $callType,
                    'status'          => $callSession->status,
                    'started_at'      => $callSession->started_at->toISOString(),
                    'notified'        => $notified ?? false,
                    'tokens'          => $tokensCount ?? 0,
                    'last_notified_at' => now()->toISOString(),
                    'livekit_token'   => $token,
                    'livekit_url'     => env('LIVEKIT_URL'),
                ],
                'remaining_calls' => $totalRemaining,
                'call_type'       => $callType,
                'appointment_id'  => $appointmentId
            ]);

        } catch (\Exception $e) {
            Log::error("Error starting call session", [
                'user_id' => Auth::id(), 'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => 'Failed to start call session. Please try again.'], 500);
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $callSession = CallSession::where('appointment_id', (string) $appointmentId)
                ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$callSession) {
                return response()->json(['success' => true, 'data' => null, 'message' => 'No active call session found']);
            }

            if ((int) $callSession->patient_id !== (int) $user->id && (int) $callSession->doctor_id !== (int) $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access to session'], 403);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'              => $callSession->id,
                    'call_session_id' => $callSession->id,
                    'appointment_id'  => $callSession->appointment_id,
                    'patient_id'      => $callSession->patient_id,
                    'doctor_id'       => $callSession->doctor_id,
                    'status'          => $callSession->status,
                    'call_type'       => $callSession->call_type,
                    'is_connected'    => (bool) $callSession->connected_at,
                    'started_at'      => $callSession->created_at->toISOString(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching call session status", ['appointment_id' => $appointmentId, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to fetch call session status'], 500);
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $callType      = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');
            $sessionId     = $request->input('session_id');
            $sessionDuration = $request->input('session_duration', 0);
            $wasConnected  = (bool) $request->input('was_connected', false);

            if (!$wasConnected) {
                $fastPathResult = DB::transaction(function () use ($user, $callType, $appointmentId, $sessionId) {
                    $query = CallSession::query();
                    if ($sessionId) {
                        $query->where('id', $sessionId);
                    } elseif ($appointmentId) {
                        $query->where('appointment_id', (string) $appointmentId);
                    } else {
                        return response()->json(['success' => false, 'message' => 'Session ID or Appointment ID required'], 400);
                    }

                    $query->where(function ($q) use ($user) {
                        $q->where('patient_id', $user->id)->orWhere('doctor_id', $user->id);
                    });

                    $callSession = $query->where('status', '!=', CallSession::STATUS_ENDED)->orderByDesc('created_at')->lockForUpdate()->first();

                    if (!$callSession) {
                        return response()->json(['success' => true, 'message' => 'No active call session found to end (non-connected)']);
                    }

                    if (!$callSession->connected_at) {
                        Log::info("[CallState] Non-connected call ended by user - marking as CANCELLED (fast-path)", [
                            'call_session_id' => $callSession->id, 'appointment_id' => $appointmentId,
                            'status_before' => $callSession->status, 'ended_by' => $user->id,
                        ]);

                        $callSession->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => now(), 'last_activity_at' => now(), 'is_connected' => false, 'call_duration' => 0]);

                        try {
                            $peerId = ($user->id == $callSession->doctor_id) ? $callSession->patient_id : $callSession->doctor_id;
                            $peer   = User::find($peerId);
                            if ($peer && $peer->push_notifications_enabled && !empty($peer->push_token)) {
                                $peer->notify(new \App\Notifications\CallCancelledNotification($callSession, $user));
                            }
                        } catch (\Exception $notifyError) {
                            Log::warning("Failed to notify peer of call cancellation (fast-path)", ['error' => $notifyError->getMessage()]);
                        }

                        return response()->json(['success' => true, 'message' => 'Call cancelled before connection - no billing applied', 'session_duration' => 0, 'was_connected' => false]);
                    }

                    Log::warning("Inconsistent state: was_connected=false but connected_at is set - falling back to main end flow", [
                        'call_session_id' => $callSession->id, 'appointment_id' => $appointmentId,
                        'connected_at' => $callSession->connected_at, 'status' => $callSession->status,
                    ]);

                    return null;
                });

                if ($fastPathResult instanceof JsonResponse) {
                    return $fastPathResult;
                }
            }

            return DB::transaction(function () use ($user, $callType, $appointmentId, $sessionId, $sessionDuration, $wasConnected) {
                $query = CallSession::query();
                if ($sessionId) {
                    $query->where('id', $sessionId);
                } elseif ($appointmentId) {
                    $query->where('appointment_id', (string) $appointmentId);
                } else {
                    return response()->json(['success' => false, 'message' => 'Session ID or Appointment ID required'], 400);
                }

                $query->where(function ($q) use ($user) {
                    $q->where('patient_id', $user->id)->orWhere('doctor_id', $user->id);
                });

                $callSession = $query->lockForUpdate()->first();

                if (!$callSession) {
                    return response()->json(['success' => false, 'message' => 'Call session not found'], 404);
                }

                if (!$callSession->connected_at) {
                    if ($callSession->answered_at) {
                        Log::warning("RACE CONDITION: Call ended but connected_at missing despite being answered - fixing now", [
                            'call_session_id' => $callSession->id, 'answered_at' => $callSession->answered_at->toISOString(),
                        ]);
                        $callSession->update(['is_connected' => true, 'connected_at' => $callSession->answered_at, 'status' => CallSession::STATUS_ACTIVE]);
                        Log::info("RACE CONDITION FIXED", ['call_session_id' => $callSession->id, 'connected_at' => $callSession->connected_at->toISOString()]);
                    } else {
                        Log::info("Call ended without connection - no billing", ['call_session_id' => $callSession->id, 'appointment_id' => $appointmentId]);
                        $callSession->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => now(), 'last_activity_at' => now(), 'is_connected' => false, 'call_duration' => 0]);

                        try {
                            $peerId = ($user->id == $callSession->doctor_id) ? $callSession->patient_id : $callSession->doctor_id;
                            $peer   = User::find($peerId);
                            if ($peer && $peer->push_notifications_enabled && !empty($peer->push_token)) {
                                $peer->notify(new \App\Notifications\CallCancelledNotification($callSession, $user));
                            }
                        } catch (\Exception $notifyError) {
                            Log::warning("Failed to notify peer of call cancellation", ['error' => $notifyError->getMessage()]);
                        }

                        return response()->json([
                            'success' => true, 'message' => 'Call missed (provider did not join) - no billing',
                            'session_duration' => 0, 'was_connected' => false, 'sessions_deducted' => 0,
                            'deduction_result' => ['doctor_payment_success' => false, 'patient_deduction_success' => false, 'doctor_payment_amount' => 0, 'patient_sessions_deducted' => 0, 'auto_deductions' => 0, 'manual_deduction' => 0, 'errors' => []]
                        ]);
                    }
                }

                $callSession->refresh();

                Log::info("[CallState] Connected call ending - marking as ENDED", [
                    'call_session_id' => $callSession->id, 'appointment_id' => $appointmentId,
                    'status_before' => $callSession->status, 'ended_by' => $user->id,
                    'connected_at' => $callSession->connected_at?->toISOString(),
                ]);

                $callSession->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => now(), 'last_activity_at' => now(), 'is_connected' => (bool) $callSession->connected_at]);
                $callSession->refresh();

                $manualDeductionApplied = false;
                $connectedSeconds       = $callSession->connected_at ? $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now()) : 0;
                $minimumBillableSeconds = 60;

                if ($callSession->connected_at && !$callSession->manual_deduction_applied && $connectedSeconds >= $minimumBillableSeconds) {
                    $subscription = Subscription::getOldestActiveForDeduction($user->id, $callType);
                    if ($subscription) {
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
                        $subscription->$callTypeField = max(0, $subscription->$callTypeField - 1);
                        $subscription->save();

                        $doctor = User::find($callSession->doctor_id);
                        if ($doctor) {
                            $doctorWallet  = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor);
                            $currency      = \App\Services\DoctorPaymentService::getCurrency($doctor);

                            $doctorWallet->credit($paymentAmount, "Manual hangup payment for 1 {$callType} call session with " . $user->first_name . " " . $user->last_name, $callType, $callSession->id, 'call_sessions_manual', [
                                'patient_name' => $user->first_name . " " . $user->last_name, 'sessions_used' => 1, 'currency' => $currency, 'payment_amount' => $paymentAmount,
                            ]);

                            try {
                                $notificationService = new \App\Services\NotificationService();
                                $notificationService->createNotification($doctor->id, 'Payment Received', "You received a payment of {$paymentAmount} {$currency} from {$user->first_name} {$user->last_name}.", 'payment', [
                                    'amount' => $paymentAmount, 'currency' => $currency,
                                    'payment_id' => $doctorWallet->transactions()->latest()->first()->id ?? null,
                                    'patient_name' => $user->first_name . ' ' . $user->last_name,
                                ]);
                            } catch (\Exception $notificationError) {
                                Log::warning("Failed to send payment received notification (manual deduction)", ['call_session_id' => $callSession->id, 'error' => $notificationError->getMessage()]);
                            }
                        }

                        $callSession->update(['manual_deduction_applied' => true, 'sessions_used' => ($callSession->sessions_used ?? 0) + 1]);
                        $manualDeductionApplied = true;

                        Log::info("Manual hangup deduction applied", ['call_session_id' => $callSession->id, 'sessions_deducted' => 1, 'connected_seconds' => $connectedSeconds]);
                    }
                } elseif ($callSession->connected_at && !$callSession->manual_deduction_applied && $connectedSeconds < $minimumBillableSeconds) {
                    $callSession->update(['manual_deduction_applied' => true]);
                    Log::info("Manual hangup deduction SKIPPED — call too short", ['call_session_id' => $callSession->id, 'connected_seconds' => $connectedSeconds]);
                }

                $duration                 = $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now());
                $autoDeductions           = floor($duration / 600);
                $alreadyProcessed         = $callSession->auto_deductions_processed ?? 0;
                $remainingAutoDeductions  = max(0, $autoDeductions - $alreadyProcessed);

                $callSession->update(['call_duration' => $duration, 'auto_deductions_processed' => $autoDeductions]);

                $deductionResult = [
                    'doctor_payment_success' => false, 'patient_deduction_success' => false,
                    'doctor_payment_amount' => 0, 'patient_sessions_deducted' => 0,
                    'auto_deductions' => $autoDeductions, 'manual_deduction_applied' => $manualDeductionApplied, 'errors' => []
                ];

                if ($remainingAutoDeductions > 0) {
                    $subscription = Subscription::getOldestActiveForDeduction($user->id, $callType);
                    if ($subscription) {
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
                        $subscription->$callTypeField = max(0, $subscription->$callTypeField - $remainingAutoDeductions);
                        $subscription->save();

                        $deductionResult['patient_deduction_success']  = true;
                        $deductionResult['patient_sessions_deducted']  = $remainingAutoDeductions;

                        $callSession->auto_deductions_processed = $autoDeductions;
                        $callSession->sessions_used = ($callSession->sessions_used ?? 0) + $remainingAutoDeductions;
                        $callSession->save();

                        $doctor = User::find($callSession->doctor_id);
                        if ($doctor) {
                            $doctorWallet  = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $remainingAutoDeductions;
                            $currency      = \App\Services\DoctorPaymentService::getCurrency($doctor);

                            $doctorWallet->credit($paymentAmount, "Auto-deduction payment for {$remainingAutoDeductions} {$callType} call session(s) with " . $user->first_name . " " . $user->last_name, $callType, $callSession->id, 'call_sessions_auto', [
                                'patient_name' => $user->first_name . " " . $user->last_name, 'session_duration' => $duration,
                                'sessions_used' => $remainingAutoDeductions, 'auto_deductions' => $remainingAutoDeductions, 'currency' => $currency, 'payment_amount' => $paymentAmount,
                            ]);

                            try {
                                $notificationService = new \App\Services\NotificationService();
                                $notificationService->createNotification($doctor->id, 'Payment Received', "You received a payment of {$paymentAmount} {$currency} from {$user->first_name} {$user->last_name}.", 'payment', [
                                    'amount' => $paymentAmount, 'currency' => $currency,
                                    'payment_id' => $doctorWallet->transactions()->latest()->first()->id ?? null,
                                    'patient_name' => $user->first_name . ' ' . $user->last_name,
                                ]);
                            } catch (\Exception $notificationError) {
                                Log::warning("Failed to send payment received notification (auto deduction)", ['call_session_id' => $callSession->id, 'error' => $notificationError->getMessage()]);
                            }

                            $deductionResult['doctor_payment_success'] = true;
                            $deductionResult['doctor_payment_amount']  = $paymentAmount;
                        }
                    } else {
                        $deductionResult['errors'][] = 'No subscription with remaining calls found';
                    }
                }

                Log::info("Call session ended", [
                    'user_id' => $user->id, 'call_session_id' => $callSession->id,
                    'call_type' => $callType, 'appointment_id' => $appointmentId,
                    'duration_seconds' => $duration, 'was_connected' => (bool) $callSession->connected_at,
                    'auto_deductions' => $remainingAutoDeductions, 'manual_deduction_applied' => $manualDeductionApplied,
                ]);

                if ($callSession->connected_at) {
                    try {
                        $notificationService = new \App\Services\NotificationService();
                        $patient             = $callSession->patient;
                        $doctor              = $callSession->doctor;
                        $sessionType         = $callType === 'voice' ? 'audio' : ($callType === 'video' ? 'video' : 'text');
                        $durationMinutes     = floor($duration / 60);
                        $durationSeconds     = $duration % 60;
                        $durationFormatted   = $durationMinutes > 0
                            ? "{$durationMinutes} minute" . ($durationMinutes > 1 ? 's' : '') . ($durationSeconds > 0 ? " {$durationSeconds} second" . ($durationSeconds > 1 ? 's' : '') : '')
                            : "{$durationSeconds} second" . ($durationSeconds > 1 ? 's' : '');

                        if ($patient) {
                            $doctorName = $doctor ? ($doctor->first_name . ' ' . $doctor->last_name) : 'Doctor';
                            $notificationService->createNotification($patient->id, 'Session Ended', "Your {$sessionType} session with Dr. {$doctorName} has ended. Duration: {$durationFormatted}.", 'session', [
                                'duration' => $durationFormatted, 'session_type' => $sessionType, 'doctor_name' => $doctorName,
                                'patient_name' => $patient->first_name . ' ' . $patient->last_name,
                            ]);
                        }
                        if ($doctor) {
                            $patientName = $patient ? ($patient->first_name . ' ' . $patient->last_name) : 'Patient';
                            $notificationService->createNotification($doctor->id, 'Session Ended', "Your {$sessionType} session with {$patientName} has ended. Duration: {$durationFormatted}.", 'session', [
                                'duration' => $durationFormatted, 'session_type' => $sessionType,
                                'doctor_name' => $doctor->first_name . ' ' . $doctor->last_name, 'patient_name' => $patientName,
                            ]);
                        }
                    } catch (\Exception $notificationError) {
                        Log::warning("Failed to send session ended notification", ['call_session_id' => $callSession->id, 'error' => $notificationError->getMessage()]);
                    }
                }

                return response()->json([
                    'success' => true, 'message' => 'Call session ended successfully',
                    'duration_seconds' => $duration, 'was_connected' => (bool) $callSession->connected_at,
                    'auto_deductions' => $remainingAutoDeductions, 'manual_deduction_applied' => $manualDeductionApplied,
                    'deduction_result' => $deductionResult
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Error ending call session", [
                'user_id' => Auth::id(), 'call_type' => $request->input('call_type'),
                'appointment_id' => $request->input('appointment_id'),
                'was_connected' => (bool) $request->input('was_connected', false),
                'session_id' => $request->input('session_id'),
                'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => 'Failed to end call session', 'debug' => ['error' => $e->getMessage(), 'line' => $e->getLine(), 'file' => $e->getFile()]], 500);
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $sessionId     = $request->input('session_id');

            if (!$appointmentId && !$sessionId) {
                return response()->json(['success' => false, 'message' => 'Appointment ID or Session ID is required'], 400);
            }

            $query = CallSession::query();
            if ($sessionId) {
                $query->where('id', $sessionId);
            } else {
                $query->where('appointment_id', $appointmentId);
            }

            $callSession = $query->where('patient_id', $user->id)->where('status', '!=', CallSession::STATUS_ENDED)->latest()->first();

            if (!$callSession) {
                return response()->json(['success' => false, 'message' => 'Active call session not found'], 404);
            }

            $doctor      = User::find($callSession->doctor_id);
            if (!$doctor) {
                return response()->json(['success' => false, 'message' => 'Doctor not found'], 404);
            }

            $notified    = false;
            $tokensCount = !empty($doctor->push_token) ? 1 : 0;

            if ($tokensCount > 0 && $doctor->push_notifications_enabled) {
                try {
                    $doctor->notify(new \App\Notifications\IncomingCallNotification($callSession, $user));
                    $notified = true;
                } catch (\Exception $notifyError) {
                    Log::error("Failed to trigger re-notification", ['doctor_id' => $callSession->doctor_id, 'error' => $notifyError->getMessage()]);
                }
            }

            return response()->json([
                'success' => true, 'message' => 'Notification re-sent successfully',
                'data'    => ['notified' => $notified, 'tokens' => $tokensCount, 'last_notified_at' => now()->toISOString()]
            ]);

        } catch (\Exception $e) {
            Log::error("Error re-notifying call session", ['user_id' => Auth::id(), 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to re-send notification'], 500);
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $callType      = $request->input('call_type');
            $appointmentId = $request->input('appointment_id');

            return DB::transaction(function () use ($user, $callType, $appointmentId) {
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where('patient_id', $user->id)
                    ->where('status', '!=', CallSession::STATUS_ENDED)
                    ->lockForUpdate()->first();

                if (!$callSession) {
                    return response()->json(['success' => false, 'message' => 'No active call session found'], 404);
                }

                if (!$callSession->connected_at) {
                    if ($callSession->answered_at) {
                        $callSession->update(['is_connected' => true, 'connected_at' => $callSession->answered_at, 'status' => CallSession::STATUS_ACTIVE]);
                        $callSession->refresh();
                    } else {
                        return response()->json(['success' => false, 'message' => 'Call is not connected - cannot process billing'], 400);
                    }
                }

                $duration        = $callSession->connected_at->diffInSeconds($callSession->ended_at ?? now());
                $autoDeductions  = floor($duration / 600);
                $alreadyProcessed = $callSession->auto_deductions_processed ?? 0;
                $newDeductions   = max(0, $autoDeductions - $alreadyProcessed);
                $manualDeduction = $callSession->ended_at ? 1 : 0;

                $deductionResult = [
                    'deductions_processed' => 0, 'remaining_calls' => 0,
                    'auto_deductions' => $autoDeductions, 'new_deductions' => $newDeductions,
                    'manual_deduction' => $manualDeduction, 'errors' => []
                ];

                if ($newDeductions > 0) {
                    $subscription = Subscription::getOldestActiveForDeduction($user->id, $callType);
                    if ($subscription) {
                        $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
                        $subscription->$callTypeField = max(0, $subscription->$callTypeField - $newDeductions);
                        $subscription->save();

                        $callSession->auto_deductions_processed = $autoDeductions;
                        $callSession->sessions_used = ($callSession->sessions_used ?? 0) + $newDeductions;
                        $callSession->save();

                        $doctor = User::find($callSession->doctor_id);
                        if ($doctor) {
                            $doctorWallet  = \App\Models\DoctorWallet::getOrCreate($doctor->id);
                            $paymentAmount = \App\Services\DoctorPaymentService::getPaymentAmountForDoctor($callType, $doctor) * $newDeductions;
                            $currency      = \App\Services\DoctorPaymentService::getCurrency($doctor);
                            $doctorWallet->credit($paymentAmount, "Auto-deduction payment for {$newDeductions} {$callType} call session(s) with " . $user->first_name . " " . $user->last_name, $callType, $callSession->id, 'call_sessions_auto', [
                                'patient_name' => $user->first_name . " " . $user->last_name, 'session_duration' => $duration,
                                'sessions_used' => $newDeductions, 'auto_deductions' => $newDeductions, 'currency' => $currency, 'payment_amount' => $paymentAmount,
                            ]);
                        }

                        $deductionResult['deductions_processed'] = $newDeductions;
                        $deductionResult['remaining_calls']      = $subscription->$callTypeField;
                    } else {
                        $deductionResult['errors'][] = 'No subscription with remaining calls found';
                    }
                }

                return response()->json(['success' => true, 'message' => 'Call deduction processed successfully', 'data' => $deductionResult]);
            });

        } catch (\Exception $e) {
            Log::error("Error processing call deduction", ['user_id' => Auth::id(), 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to process call deduction'], 500);
        }
    }

    /**
     * Handle call answer from notification and provide LiveKit token
     */
    public function answer(Request $request): JsonResponse
    {
        $appointmentId = $request->input('appointment_id');
        $user          = Auth::user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
        }

        $callSession = CallSession::where('appointment_id', $appointmentId)
            ->where('status', '!=', CallSession::STATUS_ENDED)
            ->latest()->first();

        if (!$callSession) {
            return response()->json(['success' => false, 'message' => 'Active call session not found'], 404);
        }

        $callSession->update([
            'status'       => CallSession::STATUS_ACTIVE,
            'connected_at' => now(),
            'answered_at'  => now(),
            'answered_by'  => $user->id,
            'is_connected' => true,
        ]);

        $callSession->refresh();

        $token = $this->generateLiveKitToken('call_' . $callSession->id, $user->id, trim($user->first_name . ' ' . $user->last_name) ?: 'User');

        return response()->json([
            'success'         => true,
            'session_id'      => $callSession->id,
            'call_session_id' => $callSession->id,
            'livekit_token'   => $token,
            'livekit_url'     => env('LIVEKIT_URL'),
            'status'          => $callSession->status,
            'answered_at'     => $callSession->answered_at,
            'answered_by'     => $callSession->answered_by,
        ]);
    }

    /**
     * Mark call as connected
     */
    public function markConnected(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $callType      = $request->input('call_type');

            if (!$appointmentId) {
                return response()->json(['success' => false, 'message' => 'Appointment ID is required'], 400);
            }

            return DB::transaction(function () use ($user, $appointmentId, $callType) {
                $callSession = CallSession::where('appointment_id', $appointmentId)
                    ->where(function ($query) use ($user) {
                        $query->where('patient_id', $user->id)->orWhere('doctor_id', $user->id);
                    })
                    ->whereIn('status', [CallSession::STATUS_CONNECTING, CallSession::STATUS_ANSWERED, CallSession::STATUS_ACTIVE])
                    ->where('status', '!=', CallSession::STATUS_ENDED)
                    ->lockForUpdate()->first();

                if (!$callSession) {
                    $existingCall = CallSession::where('appointment_id', $appointmentId)->where(function ($query) use ($user) {
                        $query->where('patient_id', $user->id)->orWhere('doctor_id', $user->id);
                    })->first();

                    return response()->json([
                        'success' => false, 'message' => 'Call session not found or in invalid state for connection',
                        'debug'   => ['existing_status' => $existingCall ? $existingCall->status : null, 'existing_connected_at' => $existingCall && $existingCall->connected_at ? $existingCall->connected_at->toISOString() : null]
                    ], 404);
                }

                if ($callSession->is_connected && $callSession->connected_at) {
                    return response()->json(['success' => true, 'message' => 'Call already connected', 'data' => ['call_session_id' => $callSession->id, 'connected_at' => $callSession->connected_at->toISOString()]]);
                }

                $callSession->markAsConnected();

                return response()->json([
                    'success' => true, 'message' => 'Call marked as connected',
                    'data'    => ['call_session_id' => $callSession->id, 'status' => $callSession->status, 'is_connected' => $callSession->is_connected, 'connected_at' => $callSession->connected_at->toISOString()]
                ]);
            });

        } catch (\Exception $e) {
            Log::error("Error marking call as connected", ['user_id' => Auth::id(), 'appointment_id' => $request->input('appointment_id'), 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to mark call as connected'], 500);
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
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $appointmentId = $request->input('appointment_id');
            $callerId      = $request->input('caller_id');
            $sessionId     = $request->input('session_id');
            $reason        = $request->input('reason', 'declined_by_user');

            if (!$appointmentId) {
                return response()->json(['success' => false, 'message' => 'Missing required parameters: appointment_id'], 400);
            }

            $callSession = CallSession::where('appointment_id', $appointmentId)
                ->where('doctor_id', $user->id)
                ->where('status', '!=', CallSession::STATUS_ENDED)
                ->orderBy('created_at', 'desc')->first();

            if (!$callSession) {
                return response()->json(['success' => false, 'message' => 'Call session not found or already ended'], 404);
            }

            if ($callSession->declined_at) {
                return response()->json([
                    'success' => true, 'message' => 'Call already declined',
                    'data'    => ['call_session_id' => $callSession->id, 'status' => $callSession->status, 'declined_at' => $callSession->declined_at->toISOString()]
                ]);
            }

            $callSession->update([
                'status' => CallSession::STATUS_ENDED, 'declined_at' => now(), 'declined_by' => $user->id,
                'decline_reason' => $reason, 'ended_at' => now(), 'is_connected' => false, 'call_duration' => 0,
            ]);

            try {
                $patient = User::find($callSession->patient_id);
                if ($patient && $patient->push_notifications_enabled && !empty($patient->push_token)) {
                    $patient->notify(new \App\Notifications\CallDeclinedNotification($callSession, $user));
                }
            } catch (\Exception $notifyError) {
                Log::warning("Failed to notify patient of decline", ['call_session_id' => $callSession->id, 'error' => $notifyError->getMessage()]);
            }

            return response()->json([
                'success' => true, 'message' => 'Call declined successfully',
                'data'    => ['call_session_id' => $callSession->id, 'status' => CallSession::STATUS_ENDED, 'declined_at' => $callSession->declined_at, 'ended_at' => $callSession->ended_at, 'reason' => $reason]
            ]);

        } catch (\Exception $e) {
            Log::error("Error declining call", ['user_id' => Auth::id(), 'appointment_id' => $request->input('appointment_id'), 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Failed to decline call'], 500);
        }
    }

    /**
     * Server-initiated session end
     */
    public function serverEnd(Request $request): JsonResponse
    {
        $secret   = config('services.call_server.secret', env('CALL_SERVER_SECRET', ''));
        $provided = $request->header('X-Server-Secret', '');

        if (empty($secret) || !hash_equals($secret, $provided)) {
            Log::warning('serverEnd: unauthorized request', ['ip' => $request->ip(), 'appointment_id' => $request->input('appointment_id')]);
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $appointmentId = $request->input('appointment_id');
        $wasConnected  = (bool) $request->input('was_connected', false);
        $reason        = $request->input('reason', 'all_participants_disconnected');

        if (!$appointmentId) {
            return response()->json(['success' => false, 'message' => 'appointment_id required'], 400);
        }

        try {
            $updated = DB::transaction(function () use ($appointmentId, $wasConnected, $reason) {
                $callSession = CallSession::where('appointment_id', (string) $appointmentId)
                    ->whereIn('status', [CallSession::STATUS_ACTIVE, CallSession::STATUS_CONNECTING, CallSession::STATUS_WAITING_FOR_DOCTOR, CallSession::STATUS_ANSWERED])
                    ->lockForUpdate()->first();

                if (!$callSession) return null;

                $now = now();

                if (!$wasConnected && !$callSession->connected_at) {
                    $callSession->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => $now, 'last_activity_at' => $now, 'reason' => 'server_cleanup_' . $reason]);
                    Log::info('[serverEnd] Marked unconnected call as MISSED', ['appointment_id' => $appointmentId, 'session_id' => $callSession->id]);
                    return $callSession;
                }

                $callSession->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => $now, 'last_activity_at' => $now, 'reason' => 'server_cleanup_' . $reason]);
                Log::info('[serverEnd] Marked connected call as ENDED', ['appointment_id' => $appointmentId, 'session_id' => $callSession->id]);
                return $callSession;
            });

            if ($updated) {
                return response()->json(['success' => true, 'message' => 'Session ended by server cleanup', 'session_id' => $updated->id, 'status' => $updated->status, 'was_connected' => $wasConnected]);
            }

            return response()->json(['success' => true, 'message' => 'Session already ended — no action taken']);

        } catch (\Exception $e) {
            Log::error('[serverEnd] Error during server-initiated session end', ['appointment_id' => $appointmentId, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Internal error'], 500);
        }
    }
}
