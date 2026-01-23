<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\Appointment;
use App\Services\MessageStorageService;
use App\Services\AnonymizationService;
use App\Services\FeatureFlags;
use App\Services\SessionContextGuard;
use App\Notifications\ChatMessageNotification;
use Illuminate\Support\Facades\Log;
use App\Events\ChatMessageSent;
use App\Events\ChatMessageReaction;
use App\Events\ChatUserTyping;

class ChatController extends Controller
{
    protected $messageStorageService;
    protected $anonymizationService;

    public function __construct(MessageStorageService $messageStorageService, AnonymizationService $anonymizationService)
    {
        $this->messageStorageService = $messageStorageService;
        $this->anonymizationService = $anonymizationService;
    }

    /**
     * Enforce session context guardrail for appointment-based chat operations
     * 
     * Returns null if allowed, or JsonResponse if blocked
     */
    private function enforceAppointmentSessionContext($appointment, $appointmentId, $operation = 'chat_operation'): ?JsonResponse
    {
        if (!$appointment) {
            return null; // Not an appointment, let other logic handle it
        }

        // ENFORCEMENT: Appointments are schedulers/eligibility only. Live chat must be session-based.
        // Always block appointment-scoped chat operations and return canonical session context when available.
        $textSession = \App\Models\TextSession::where('appointment_id', (int) $appointment->id)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($textSession) {
            $textSession->applyLazyExpiration();
            $sessionContext = 'text_session:' . $textSession->id;

            Log::warning('SessionContextGuard: Chat operation blocked - appointment identifier used for chat', [
                'appointment_id' => $appointment->id,
                'session_id' => $textSession->id,
                'operation' => $operation,
                'session_context' => $sessionContext,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Chat must be accessed through session context. Please use the session endpoint.',
                'session_id' => $textSession->id,
                'error_code' => 'SESSION_CONTEXT_REQUIRED',
                'session_context' => $sessionContext,
            ], 400);
        }

        Log::warning('SessionContextGuard: Chat operation blocked - appointment has no session yet', [
            'appointment_id' => $appointment->id,
            'operation' => $operation,
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Session is not ready yet. Please wait for the session to start.',
            'error_code' => 'SESSION_NOT_READY',
            'appointment_id' => $appointment->id,
        ], 403);
    }

    /**
     * Determine the canonical session context format for a session_id
     * 
     * Checks if session_id refers to a text session or call session
     * Returns: text_session:{id} or call_session:{id}
     */
    private function determineSessionContextFormat($sessionId): string
    {
        // Try text session first (more common for chat)
        $textSession = \App\Models\TextSession::find($sessionId);
        if ($textSession) {
            // Apply lazy expiration at read-time
            $textSession->applyLazyExpiration();
            return 'text_session:' . $sessionId;
        }

        // Try call session
        $callSession = \App\Models\CallSession::find($sessionId);
        if ($callSession) {
            return 'call_session:' . $sessionId;
        }

        // Fallback: assume text session (most chat operations are text)
        // This should rarely happen if session_id is properly linked
        Log::warning('SessionContextGuard: Could not determine session type, defaulting to text_session', [
            'session_id' => $sessionId,
        ]);

        return 'text_session:' . $sessionId;
    }

    /**
     * Helper method to handle text session ID format and verify access
     */
    private function handleAppointmentIdAndVerifyAccess($appointmentId, $user)
    {
        // Handle direct session ID format (direct_session_12345) - instant calls
        if (strpos($appointmentId, 'direct_session_') === 0) {
            $callSession = \App\Models\CallSession::with(['patient', 'doctor'])
                ->where('appointment_id', $appointmentId)
                ->first();

            if ($callSession) {
                // Check if user is part of this call session
                if ($callSession->patient_id !== $user->id && $callSession->doctor_id !== $user->id) {
                    return [
                        'success' => false,
                        'message' => 'Unauthorized access to chat',
                        'status' => 403
                    ];
                }

                return [
                    'success' => true,
                    'actualId' => $appointmentId, // Keep the string ID for direct sessions
                    'type' => 'direct_session',
                    'data' => $callSession
                ];
            }

            return [
                'success' => false,
                'message' => 'Direct session not found',
                'status' => 404
            ];
        }

        // Handle text/call session ID formats (text_session_123, text_session:123, call_session:123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = \App\Models\TextSession::find($actualId);

            if ($textSession) {
                // Apply lazy expiration at read-time
                $textSession->applyLazyExpiration();

                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return [
                        'success' => false,
                        'message' => 'Unauthorized access to chat',
                        'status' => 403
                    ];
                }

                return [
                    'success' => true,
                    'actualId' => $actualId,
                    'type' => 'text_session',
                    'data' => $textSession
                ];
            }

            return [
                'success' => false,
                'message' => 'Appointment or text session not found',
                'status' => 404
            ];
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return [
                'success' => false,
                'message' => 'Unauthorized access to chat',
                'status' => 403
            ];
        }

        return [
            'success' => true,
            'actualId' => $actualId,
            'type' => 'appointment',
            'data' => $appointment
        ];
    }

    /**
     * Handle 405 Method Not Allowed errors for chat endpoints
     */
    public function handleMethodNotAllowed(Request $request, $appointmentId): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Method not allowed for this endpoint',
            'allowed_methods' => ['GET', 'POST'],
            'endpoint' => $request->path(),
            'method' => $request->method()
        ], 405);
    }

    /**
     * Get chat messages for an appointment
     */
    public function getMessages(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Handle direct session ID format (direct_session_12345) - instant calls
        if (strpos($appointmentId, 'direct_session_') === 0) {
            $callSession = \App\Models\CallSession::with(['patient', 'doctor'])
                ->where('appointment_id', $appointmentId)
                ->first();

            if ($callSession) {
                // Check if user is part of this call session
                if ($callSession->patient_id !== $user->id && $callSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Get messages using the call session ID
                $messages = $this->messageStorageService->getMessages($callSession->id, 'call_session');

                // Apply anonymization if needed
                $messages = $this->applyAnonymizationToMessages($messages, $user, (object) [
                    'patient_id' => $callSession->patient_id,
                    'doctor_id' => $callSession->doctor_id
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $messages
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Direct session not found'
            ], 404);
        }

        // Handle text/call session ID formats (text_session_123, text_session:123, call_session:123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = \App\Models\TextSession::find($actualId);

            if ($textSession) {
                // Apply lazy expiration at read-time
                $textSession->applyLazyExpiration();

                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Get messages from cache storage
                $messages = $this->messageStorageService->getMessages($actualId, 'text_session');

                // Apply anonymization if needed
                $messages = $this->applyAnonymizationToMessages($messages, $user, $textSession);

                return response()->json([
                    'success' => true,
                    'data' => $messages
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'getMessages');
        if ($guardrailResponse !== null) {
            return $guardrailResponse;
        }

        return response()->json([
            'success' => false,
            'message' => 'Chat must be accessed through session context.',
            'error_code' => 'SESSION_CONTEXT_REQUIRED'
        ], 400);
    }



    /**
     * Send a message
     */
    public function sendMessage(Request $request, $appointmentId): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'message_type' => 'nullable|string|in:text,image,voice',
            'media_url' => 'nullable|string',
            'temp_id' => 'nullable|string' // Accept temp_id from client
        ]);

        $user = Auth::user();

        // Rate limiting: Check if user has sent a message recently
        $messageType = $request->message_type ?? 'text';
        $rateLimitKey = "message_rate_limit_{$user->id}_{$appointmentId}_{$messageType}";
        $lastMessageTime = Cache::get($rateLimitKey);
        $currentTime = now();

        // Different rate limits for different message types
        $rateLimitSeconds = 0; // No rate limiting for text messages
        if ($messageType === 'voice') {
            $rateLimitSeconds = 0; // No rate limit for voice messages
        } else if ($messageType === 'image') {
            $rateLimitSeconds = 0; // No rate limit for image messages
        }

        // Rate limiting disabled

        // Skip rate limiting entirely for now
        if (false) { // Disabled rate limiting
            if ($lastMessageTime) {
                $timeSinceLastMessage = $currentTime->diffInSeconds($lastMessageTime);
                \Log::info("Time since last message", [
                    'time_since_last' => $timeSinceLastMessage,
                    'rate_limit_seconds' => $rateLimitSeconds
                ]);

                if ($timeSinceLastMessage < $rateLimitSeconds) {
                    \Log::warning("Rate limit exceeded", [
                        'user_id' => $user->id,
                        'message_type' => $messageType,
                        'time_since_last' => $timeSinceLastMessage,
                        'rate_limit_seconds' => $rateLimitSeconds
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => "Please wait {$rateLimitSeconds} seconds before sending another {$messageType} message"
                    ], 429);
                }
            }
        }

        // Rate limiting disabled

        // Handle direct session ID format (direct_session_12345) - instant calls
        // IMPORTANT: Direct sessions don't have appointment records
        if (strpos($appointmentId, 'direct_session_') === 0) {
            $callSession = \App\Models\CallSession::with(['patient', 'doctor'])
                ->where('appointment_id', $appointmentId)
                ->first();

            if ($callSession) {
                // Check if user is part of this call session
                if ($callSession->patient_id !== $user->id && $callSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Prepare message data
                $messageData = [
                    'sender_id' => $user->id,
                    'sender_name' => $this->getUserName($user->id),
                    'message' => $request->message,
                    'message_type' => $request->message_type ?? 'text',
                    'media_url' => $request->media_url ?? null,
                    'temp_id' => $request->temp_id ?? null,
                    'id' => $request->message_id ?? null
                ];

                // Store message using call session ID
                $message = $this->messageStorageService->storeMessage($callSession->id, $messageData, 'call_session');

                // Update chat room keys
                $this->messageStorageService->updateChatRoomKeys($callSession->id, 'call_session');

                return response()->json([
                    'success' => true,
                    'data' => $message
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Direct session not found'
            ], 404);
        }

        // Handle text/call session ID formats (text_session_123, text_session:123, call_session:123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = Appointment::with(['patient', 'doctor'])
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->join('users as doctor', 'text_sessions.doctor_id', '=', 'doctor.id')
                ->join('users as patient', 'text_sessions.patient_id', '=', 'patient.id')
                ->where('text_sessions.id', $actualId)
                ->select(
                    'text_sessions.*',
                    'doctor.first_name as doctor_first_name',
                    'doctor.last_name as doctor_last_name',
                    'patient.first_name as patient_first_name',
                    'patient.last_name as patient_last_name'
                )
                ->first();

            if ($textSession) {
                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // For text sessions, we'll use the text session data
                $otherParticipantId = $user->id === $textSession->doctor_id ? $textSession->patient_id : $textSession->doctor_id;
                $otherParticipantName = $user->id === $textSession->doctor_id
                    ? $textSession->patient_first_name . ' ' . $textSession->patient_last_name
                    : 'Dr. ' . $textSession->doctor_first_name . ' ' . $textSession->doctor_last_name;
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment or text session not found'
                ], 404);
            }
        } else {
            // Check if user is part of this appointment (authorization first)
            if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to chat'
                ], 403);
            }

            // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
            $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'sendMessage');
            if ($guardrailResponse !== null) {
                return $guardrailResponse;
            }
        }

        // Handle text session logic with atomic expiry enforcement BEFORE storing message
        // This ensures expired/ended sessions reject messages before they're stored
        $session = null;
        if (!$appointment && (strpos($appointmentId, 'text_session_') === 0 || strpos($appointmentId, 'text_session:') === 0)) {
            $sessionId = str_replace(['text_session_', 'text_session:'], '', $appointmentId);

            // Use transaction with lockForUpdate() for atomic operations
            $session = DB::transaction(function () use ($sessionId, $user, $request, $appointmentId) {
                // Lock the session row for update to prevent race conditions
                $session = \App\Models\TextSession::where('id', $sessionId)
                    ->lockForUpdate()
                    ->first();

                if (!$session) {
                    Log::error("Text session not found", [
                        'session_id' => $sessionId,
                        'appointment_id' => $appointmentId,
                        'user_id' => $user->id
                    ]);
                    abort(404, 'Session not found');
                }

                // Apply lazy expiration at read-time
                $session->applyLazyExpiration();

                Log::info("Text session message received", [
                    'appointment_id' => $appointmentId,
                    'session_id' => $sessionId,
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'session_status' => $session->status,
                    'doctor_response_deadline' => $session->doctor_response_deadline,
                    'message_type' => $request->message_type ?? 'text',
                ]);

                // FINAL BACKEND RULES: Reject messages if session is expired, ended, or cancelled
                if (in_array($session->status, ['expired', 'ended', 'cancelled'])) {
                    Log::warning("Message rejected - session is not active", [
                        'session_id' => $sessionId,
                        'status' => $session->status,
                        'user_id' => $user->id
                    ]);
                    abort(403, 'Session is not active');
                }

                // FINAL BACKEND RULES: Handle waiting_for_doctor status (or pending) with atomic conditional update
                $now = now();

                // Handle patient's first message: Set doctor_response_deadline when patient sends first message
                if (
                    $user->id === $session->patient_id &&
                    $session->status === \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR &&
                    !$session->doctor_response_deadline
                ) {

                    // Set deadline to 5 minutes from now when patient sends first message
                    $deadlineSet = \App\Models\TextSession::where('id', $sessionId)
                        ->where('status', \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR)
                        ->where('patient_id', $user->id)
                        ->whereNull('doctor_response_deadline')
                        ->update([
                            'doctor_response_deadline' => $now->copy()->addSeconds(config('app.text_session_response_window')),
                        ]);

                    if ($deadlineSet > 0) {
                        $session->refresh();
                        Log::info("Doctor response deadline set by patient's first message", [
                            'session_id' => $sessionId,
                            'deadline' => $session->doctor_response_deadline,
                            'response_window_seconds' => config('app.text_session_response_window')
                        ]);
                    }
                }

                // Only process if this is the doctor's message
                if ($user->id === $session->doctor_id) {
                    // Atomic update 1: Expire session if deadline passed
                    // Only expire if: status = waiting_for_doctor AND doctor_response_deadline <= now()
                    // Never overwrite: active, ended, cancelled
                    $expiredCount = \App\Models\TextSession::where('id', $sessionId)
                        ->where('status', \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR)
                        ->where('doctor_id', $user->id)
                        ->whereNotNull('doctor_response_deadline')
                        ->where('doctor_response_deadline', '<=', $now)
                        ->update([
                            'status' => \App\Models\TextSession::STATUS_EXPIRED,
                            'ended_at' => $now,
                            'reason' => 'Doctor did not respond within ' . (config('app.text_session_response_window') / 60) . ' minutes',
                        ]);

                    if ($expiredCount > 0) {
                        Log::info("Session expired - doctor response deadline passed (atomic update)", [
                            'session_id' => $sessionId,
                            'deadline' => $session->doctor_response_deadline,
                            'current_time' => $now,
                            'seconds_past_deadline' => $session->doctor_response_deadline ? $now->diffInSeconds($session->doctor_response_deadline) : 0
                        ]);

                        abort(403, 'Session expired');
                    }

                    // Atomic update 2: Activate session if deadline not passed
                    $activatedCount = \App\Models\TextSession::where('id', $sessionId)
                        ->whereIn('status', ['waiting_for_doctor', 'pending'])
                        ->where('doctor_id', $user->id)
                        ->where(function ($query) use ($now) {
                            $query->whereNull('doctor_response_deadline')
                                ->orWhere('doctor_response_deadline', '>', $now);
                        })
                        ->update([
                            'status' => 'active',
                            'activated_at' => $now,
                        ]);

                    if ($activatedCount > 0) {
                        // Refresh session to get updated values
                        $session->refresh();

                        Log::info("Session activated by doctor's first message (atomic update)", [
                            'session_id' => $sessionId,
                            'activated_at' => $now,
                            'deadline' => $session->doctor_response_deadline,
                            'seconds_remaining' => $session->doctor_response_deadline ? $session->doctor_response_deadline->diffInSeconds($now) : null
                        ]);
                    }
                }

                // Update last_activity_at on every message (for active sessions)
                if ($session->status === 'active') {
                    $session->update(['last_activity_at' => now()]);
                }

                return $session;
            });
        }

        // Prepare message data
        $messageData = [
            'sender_id' => $user->id,
            'sender_name' => $this->getUserName($user->id),
            'message' => $request->message,
            'message_type' => $request->message_type ?? 'text',
            'media_url' => $request->media_url ?? null,
            'temp_id' => $request->temp_id ?? null, // Include temp_id if provided
            'id' => $request->message_id ?? null // Include message_id from WebRTC if provided
        ];

        // Store message in cache (only if session validation passed)
        // Use numeric ID for MessageStorageService methods
        // Determine session type: use 'text_session' for text sessions, 'appointment' for appointments
        $sessionType = ($isTextSession || isset($textSession)) ? 'text_session' : 'appointment';
        $message = $this->messageStorageService->storeMessage($actualId, $messageData, $sessionType);

        // Update chat room keys for tracking
        // Use numeric ID for MessageStorageService methods
        $this->messageStorageService->updateChatRoomKeys($actualId, $sessionType);

        // Text session message notification
        if (isset($session) && $session) {
            try {
                $recipient = ($user->id === $session->patient_id) ? \App\Models\User::find($session->doctor_id) : \App\Models\User::find($session->patient_id);
                if ($recipient && $recipient->push_notifications_enabled && $recipient->push_token) {
                    $notificationData = [
                        'session_id' => $session->id,
                        'sender_id' => $user->id,
                        'sender_name' => $this->getUserName($user->id),
                        'message_preview' => substr($request->message ?? '', 0, 50),
                        'message_id' => $message['id']
                    ];
                    $recipient->notify(new \App\Notifications\TextSessionMessageNotification($notificationData));
                    Log::info('📤 Text session push sent', [
                        'session_id' => $session->id,
                        'recipient_id' => $recipient->id
                    ]);
                } else {
                    Log::info('⚠️ Text session push skipped (no token or disabled)', [
                        'session_id' => $session->id,
                        'recipient_id' => $recipient->id ?? 'unknown'
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('❌ Failed to send text session message notification: ' . $e->getMessage(), [
                    'session_id' => $session->id
                ]);
            }
        }

        // Return the message
        return response()->json([
            'success' => true,
            'data' => $message
        ]);
    }

    /**
     * Get chat info (appointment details)
     */
    public function getChatInfo($appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Handle direct session ID format (direct_session_12345) - instant calls
        // IMPORTANT: Direct sessions are instant calls with no appointment record
        if (strpos($appointmentId, 'direct_session_') === 0) {
            $callSession = \App\Models\CallSession::with(['patient', 'doctor'])
                ->where('appointment_id', $appointmentId)
                ->first();

            if ($callSession) {
                // Check if user is part of this call session
                if ($callSession->patient_id !== $user->id && $callSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Determine the other participant's name
                $otherParticipantName = '';
                $otherParticipantId = null;
                if ($user->id === $callSession->doctor_id) {
                    $otherParticipantName = $callSession->patient->first_name . ' ' . $callSession->patient->last_name;
                    $otherParticipantId = $callSession->patient_id;
                } else {
                    $otherParticipantName = 'Dr. ' . $callSession->doctor->first_name . ' ' . $callSession->doctor->last_name;
                    $otherParticipantId = $callSession->doctor_id;
                }

                // Get profile picture with anonymization check
                $otherParticipantProfileUrl = null;
                $otherParticipantProfilePath = null;
                if ($otherParticipantId) {
                    $otherUser = \App\Models\User::find($otherParticipantId);
                    if ($otherUser) {
                        if ($this->anonymizationService->isAnonymousModeEnabled($otherUser)) {
                            $anonymizedData = $this->anonymizationService->getAnonymizedUserData($otherUser);
                            $otherParticipantName = $anonymizedData['display_name'];
                            $otherParticipantProfilePath = $anonymizedData['profile_picture'];
                            $otherParticipantProfileUrl = $anonymizedData['profile_picture_url'];
                        } else {
                            $otherParticipantProfilePath = $otherUser->profile_picture;
                            $otherParticipantProfileUrl = $otherUser->profile_picture_url;
                        }
                    }
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'appointment_id' => $appointmentId,
                        'other_participant_name' => $otherParticipantName,
                        'appointment_date' => $callSession->created_at?->toDateString(),
                        'appointment_time' => $callSession->created_at?->format('H:i'),
                        'appointment_type' => $callSession->call_type === 'voice' ? 'audio' : 'video',
                        'status' => $callSession->status,
                        'doctor_id' => $callSession->doctor_id,
                        'patient_id' => $callSession->patient_id,
                        'session_id' => $callSession->id,
                        'session_context' => 'call_session:' . $callSession->id,
                        'other_participant_profile_picture' => $otherParticipantProfilePath,
                        'other_participant_profile_picture_url' => $otherParticipantProfileUrl,
                        'is_direct_session' => true
                    ]
                ]);
            }

            // Direct session not found
            return response()->json([
                'success' => false,
                'message' => 'Direct session not found'
            ], 404);
        }

        // Handle text/call session ID formats (text_session_123, text_session:123, call_session:123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->join('users as doctor', 'appointments.doctor_id', '=', 'doctor.id')
                ->join('users as patient', 'appointments.patient_id', '=', 'patient.id')
                ->where('appointments.id', $actualId)
                ->select(
                    'appointments.*',
                    'doctor.first_name as doctor_first_name',
                    'doctor.last_name as doctor_last_name',
                    'patient.first_name as patient_first_name',
                    'patient.last_name as patient_last_name'
                )
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = \App\Models\TextSession::with(['patient', 'doctor'])
                ->where('id', $actualId)
                ->first();

            if ($textSession) {
                // Apply lazy expiration at read-time
                $textSession->applyLazyExpiration();

                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Determine the other participant's name and profile picture for text session
                $otherParticipantName = '';
                $otherParticipantId = null;
                if ($user->id === $textSession->doctor_id) {
                    $otherParticipantName = $textSession->patient->first_name . ' ' . $textSession->patient->last_name;
                    $otherParticipantId = $textSession->patient_id;
                    \Log::info('🔍 [ChatController] Doctor viewing patient', [
                        'doctor_id' => $user->id,
                        'patient_id' => $otherParticipantId,
                        'original_patient_name' => $otherParticipantName
                    ]);
                } else {
                    $otherParticipantName = 'Dr. ' . $textSession->doctor->first_name . ' ' . $textSession->doctor->last_name;
                    $otherParticipantId = $textSession->doctor_id;
                    \Log::info('🔍 [ChatController] Patient viewing doctor', [
                        'patient_id' => $user->id,
                        'doctor_id' => $otherParticipantId,
                        'original_doctor_name' => $otherParticipantName
                    ]);
                }

                $otherParticipantProfilePath = null;
                $otherParticipantProfileUrl = null;
                if ($otherParticipantId) {
                    $otherUser = \App\Models\User::find($otherParticipantId);
                    if ($otherUser) {
                        \Log::info('🔍 [ChatController] Found other user', [
                            'other_user_id' => $otherUser->id,
                            'other_user_name' => $otherUser->display_name ?? $otherUser->first_name . ' ' . $otherUser->last_name,
                            'privacy_preferences' => $otherUser->privacy_preferences
                        ]);

                        // Check if the other user has anonymous mode enabled
                        $isAnonymous = $this->anonymizationService->isAnonymousModeEnabled($otherUser);
                        \Log::info('🔍 [ChatController] Anonymization check', [
                            'other_user_id' => $otherUser->id,
                            'is_anonymous' => $isAnonymous
                        ]);

                        if ($isAnonymous) {
                            $anonymizedData = $this->anonymizationService->getAnonymizedUserData($otherUser);
                            $otherParticipantName = $anonymizedData['display_name'];
                            $otherParticipantProfilePath = $anonymizedData['profile_picture'];
                            $otherParticipantProfileUrl = $anonymizedData['profile_picture_url'];
                            \Log::info('🔍 [ChatController] Applied anonymization', [
                                'original_name' => $otherUser->display_name ?? $otherUser->first_name . ' ' . $otherUser->last_name,
                                'anonymized_name' => $otherParticipantName,
                                'anonymized_picture' => $otherParticipantProfileUrl
                            ]);
                        } else {
                            $otherParticipantProfilePath = $otherUser->profile_picture;
                            $otherParticipantProfileUrl = $otherUser->profile_picture_url;
                            \Log::info('🔍 [ChatController] No anonymization applied', [
                                'name' => $otherParticipantName,
                                'picture' => $otherParticipantProfileUrl
                            ]);
                        }
                    }
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'appointment_id' => $appointmentId,
                        'other_participant_name' => $otherParticipantName,
                        'appointment_date' => $textSession->started_at,
                        'appointment_time' => date('H:i', strtotime($textSession->started_at)),
                        'appointment_type' => 'text', // Text sessions are always text type
                        'status' => $textSession->status,
                        'doctor_id' => $textSession->doctor_id,
                        'patient_id' => $textSession->patient_id,
                        'other_participant_profile_picture' => $otherParticipantProfilePath,
                        'other_participant_profile_picture_url' => $otherParticipantProfileUrl
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // Determine the other participant's name and profile picture
        $otherParticipantName = '';
        $otherParticipantId = null;
        if ($user->id === $appointment->doctor_id) {
            $otherParticipantName = $appointment->patient_first_name . ' ' . $appointment->patient_last_name;
            $otherParticipantId = $appointment->patient_id;
        } else {
            $otherParticipantName = 'Dr. ' . $appointment->doctor_first_name . ' ' . $appointment->doctor_last_name;
            $otherParticipantId = $appointment->doctor_id;
        }

        $otherParticipantProfilePath = null;
        $otherParticipantProfileUrl = null;
        if ($otherParticipantId) {
            $otherUser = \App\Models\User::find($otherParticipantId);
            if ($otherUser) {
                // Check if the other user has anonymous mode enabled
                if ($this->anonymizationService->isAnonymousModeEnabled($otherUser)) {
                    $anonymizedData = $this->anonymizationService->getAnonymizedUserData($otherUser);
                    $otherParticipantName = $anonymizedData['display_name'];
                    $otherParticipantProfilePath = $anonymizedData['profile_picture'];
                    $otherParticipantProfileUrl = $anonymizedData['profile_picture_url'];
                } else {
                    $otherParticipantProfilePath = $otherUser->profile_picture;
                    $otherParticipantProfileUrl = $otherUser->profile_picture_url;
                }
            }
        }

        $sessionStatus = null;
        $resolvedSessionId = null;
        if (($appointment->appointment_type ?? 'text') === 'text') {
            $textSession = \App\Models\TextSession::where('appointment_id', (int) $appointment->id)
                ->orderBy('created_at', 'desc')
                ->first();
            if ($textSession) {
                $textSession->applyLazyExpiration();
                $resolvedSessionId = $textSession->id;
                $sessionStatus = $textSession->status;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'appointment_id' => $appointmentId,
                'other_participant_name' => $otherParticipantName,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'appointment_type' => $appointment->appointment_type ?? 'text', // Include appointment type with fallback
                'status' => $appointment->status,
                'doctor_id' => $appointment->doctor_id,
                'patient_id' => $appointment->patient_id,
                'session_id' => $resolvedSessionId,
                'call_unlocked_at' => $appointment->call_unlocked_at, // When call appointment time was reached
                'session_context' => $resolvedSessionId ? ('text_session:' . $resolvedSessionId) : null,
                'session_status' => $sessionStatus,
                'other_participant_profile_picture' => $otherParticipantProfilePath,
                'other_participant_profile_picture_url' => $otherParticipantProfileUrl
            ]
        ]);
    }

    /**
     * Get messages for local storage sync
     */
    public function getMessagesForLocalStorage(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Handle text/call session ID formats (text_session_123, text_session:123, call_session:123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->where('id', $actualId)
                ->first();

            if ($textSession) {
                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Get messages for local storage
                $data = $this->messageStorageService->getMessagesForLocalStorage($actualId, 'text_session');

                return response()->json([
                    'success' => true,
                    'data' => $data
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'getMessagesForLocalStorage');
        if ($guardrailResponse !== null) {
            return $guardrailResponse;
        }

        return response()->json([
            'success' => false,
            'message' => 'Chat must be accessed through session context.',
            'error_code' => 'SESSION_CONTEXT_REQUIRED'
        ], 400);
    }

    /**
     * Sync messages from local storage to server
     */
    public function syncFromLocalStorage(Request $request, $appointmentId): JsonResponse
    {
        $request->validate([
            'messages' => 'required|array'
        ]);

        $user = Auth::user();

        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->where('id', $actualId)
                ->first();

            if ($textSession) {
                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Sync messages from local storage
                $result = $this->messageStorageService->syncFromLocalStorage($actualId, $request->messages, 'text_session');

                return response()->json([
                    'success' => true,
                    'data' => $result
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'syncFromLocalStorage');
        if ($guardrailResponse !== null) {
            return $guardrailResponse;
        }

        return response()->json([
            'success' => false,
            'message' => 'Chat must be accessed through session context.',
            'error_code' => 'SESSION_CONTEXT_REQUIRED'
        ], 400);
    }

    /**
     * Add a reaction to a message
     */
    public function addReaction(Request $request, $appointmentId, $messageId): JsonResponse
    {
        $request->validate([
            'reaction' => 'required|string|max:10'
        ]);

        $user = Auth::user();

        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->where('id', $actualId)
                ->first();

            if ($textSession) {
                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Add reaction to message
                $result = $this->messageStorageService->addReaction($actualId, $messageId, $user->id, $request->reaction);

                return response()->json([
                    'success' => true,
                    'data' => $result
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'addReaction');
        if ($guardrailResponse !== null) {
            return $guardrailResponse;
        }

        // Add reaction to message
        $result = $this->messageStorageService->addReaction($actualId, $messageId, $user->id, $request->reaction);

        if ($result) {
            // Broadcast removed - will use alternative solution

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to add reaction'
        ], 400);
    }

    /**
     * Remove a reaction from a message
     */
    public function removeReaction(Request $request, $appointmentId, $messageId): JsonResponse
    {
        $request->validate([
            'reaction' => 'required|string|max:10'
        ]);

        $user = Auth::user();

        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        $isTextSession = false;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'text_session:') === 0) {
            $actualId = str_replace('text_session:', '', $appointmentId);
            $isTextSession = true;
        } elseif (strpos($appointmentId, 'call_session:') === 0) {
            $actualId = str_replace('call_session:', '', $appointmentId);
        }

        // Convert to integer for database queries
        $actualId = (int) $actualId;

        // First, try to find it as a regular appointment (only if not explicitly a text session)
        $appointment = null;
        if (!$isTextSession) {
            $appointment = DB::table('appointments')
                ->where('id', $actualId)
                ->first();
        }

        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->where('id', $actualId)
                ->first();

            if ($textSession) {
                // Check if user is part of this text session
                if ($textSession->patient_id !== $user->id && $textSession->doctor_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to chat'
                    ], 403);
                }

                // Get reaction from query string for DELETE requests
                $reaction = $request->query('reaction') ?? $request->input('reaction');

                if (!$reaction) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Reaction parameter is required'
                    ], 400);
                }

                // Remove reaction from message
                $result = $this->messageStorageService->removeReaction($actualId, $messageId, $user->id, $reaction);

                return response()->json([
                    'success' => true,
                    'data' => $result
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Appointment or text session not found'
            ], 404);
        }

        // Check if user is part of this appointment
        if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to chat'
            ], 403);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        $guardrailResponse = $this->enforceAppointmentSessionContext($appointment, $appointmentId, 'removeReaction');
        if ($guardrailResponse !== null) {
            return $guardrailResponse;
        }

        // Get reaction from query string for DELETE requests
        $reaction = $request->query('reaction') ?? $request->input('reaction');

        if (!$reaction) {
            return response()->json([
                'success' => false,
                'message' => 'Reaction parameter is required'
            ], 400);
        }

        // Remove reaction from message
        $result = $this->messageStorageService->removeReaction($actualId, $messageId, $user->id, $reaction);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Mark messages as read for an appointment
     */
    public function markAsRead(Request $request, $appointmentId): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|integer',
            'timestamp' => 'required|string'
        ]);

        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        if ($accessResult['type'] === 'appointment' && isset($accessResult['data'])) {
            $guardrailResponse = $this->enforceAppointmentSessionContext($accessResult['data'], $appointmentId, 'markAsRead');
            if ($guardrailResponse !== null) {
                return $guardrailResponse;
            }
        }

        // Mark messages as read
        $result = $this->messageStorageService->markMessagesAsRead($accessResult['actualId'], $request->user_id, $request->timestamp, $accessResult['type']);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Force fix delivery status for messages with read entries
     */
    public function fixDeliveryStatus(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // Force fix delivery status
        $result = $this->messageStorageService->fixDeliveryStatus($accessResult['actualId'], $accessResult['type']);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Start typing indicator
     */
    public function startTyping(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        if ($accessResult['type'] === 'appointment' && isset($accessResult['data'])) {
            $guardrailResponse = $this->enforceAppointmentSessionContext($accessResult['data'], $appointmentId, 'startTyping');
            if ($guardrailResponse !== null) {
                return $guardrailResponse;
            }
        }

        // Start typing indicator
        $result = $this->messageStorageService->startTyping($accessResult['actualId'], $user->id, $this->getUserName($user->id));

        if ($result) {
            // Broadcast removed - will use alternative solution

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to start typing indicator'
        ], 400);
    }

    /**
     * Stop typing indicator
     */
    public function stopTyping(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        if ($accessResult['type'] === 'appointment' && isset($accessResult['data'])) {
            $guardrailResponse = $this->enforceAppointmentSessionContext($accessResult['data'], $appointmentId, 'stopTyping');
            if ($guardrailResponse !== null) {
                return $guardrailResponse;
            }
        }

        // Stop typing indicator
        $result = $this->messageStorageService->stopTyping($accessResult['actualId'], $user->id);

        if ($result) {
            // Broadcast removed - will use alternative solution

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to stop typing indicator'
        ], 400);
    }

    /**
     * Get typing users for an appointment
     */
    public function getTypingUsers(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // Get typing users
        $typingUsers = $this->messageStorageService->getTypingUsers($accessResult['actualId']);

        return response()->json([
            'success' => true,
            'data' => $typingUsers
        ]);
    }

    /**
     * Reply to a message
     */
    public function replyToMessage(Request $request, $appointmentId, $messageId): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'message' => 'required|string|max:1000',
            'message_type' => 'required|in:text,image,voice',
            'media_url' => 'nullable|string'
        ]);

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // ⚠️ GUARDRAIL: Enforce session context for appointment-based chat
        if ($accessResult['type'] === 'appointment' && isset($accessResult['data'])) {
            $guardrailResponse = $this->enforceAppointmentSessionContext($accessResult['data'], $appointmentId, 'replyToMessage');
            if ($guardrailResponse !== null) {
                return $guardrailResponse;
            }
        }

        // Get the original message to reply to
        $originalMessage = $this->messageStorageService->getMessage($accessResult['actualId'], $messageId, $accessResult['type']);
        if (!$originalMessage) {
            return response()->json([
                'success' => false,
                'message' => 'Original message not found'
            ], 404);
        }

        // Create reply message
        $replyMessage = $this->messageStorageService->createReplyMessage(
            $accessResult['actualId'],
            $request->message,
            $request->message_type,
            $user->id,
            $user->first_name . ' ' . $user->last_name,
            $messageId,
            $originalMessage['message'],
            $originalMessage['sender_name'] ?? 'Unknown',
            $request->media_url
        );

        if ($replyMessage) {
            return response()->json([
                'success' => true,
                'message' => 'Reply sent successfully',
                'data' => $replyMessage
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to send reply'
        ], 500);
    }

    /**
     * Get user name by ID
     */
    private function getUserName($userId): string
    {
        $user = \App\Models\User::find($userId);

        if (!$user) {
            return 'Unknown User';
        }

        // Check if anonymous mode is enabled
        if ($this->anonymizationService->isAnonymousModeEnabled($user)) {
            return $this->anonymizationService->getAnonymizedDisplayName($user);
        }

        $name = $user->first_name . ' ' . $user->last_name;

        // Add Dr. prefix for doctors
        if ($user->user_type === 'doctor') {
            $name = 'Dr. ' . $name;
        }

        return $name;
    }

    /**
     * Clear all messages for an appointment
     */
    public function clearMessages(Request $request, $appointmentId): JsonResponse
    {
        $user = Auth::user();

        // Use helper method to handle appointment ID and verify access
        $accessResult = $this->handleAppointmentIdAndVerifyAccess($appointmentId, $user);

        if (!$accessResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessResult['message']
            ], $accessResult['status']);
        }

        // Clear messages from server storage
        $result = $this->messageStorageService->clearMessages($accessResult['actualId'], $accessResult['type']);

        if ($result) {
            return response()->json([
                'success' => true,
                'message' => 'Messages cleared successfully'
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear messages'
            ], 500);
        }
    }

    /**
     * Send chat notification to the other participant
     */
    private function sendChatNotification(User $sender, Appointment $appointment, string $message, string $messageId): void
    {
        try {
            Log::info("🔔 Starting chat notification process", [
                'appointment_id' => $appointment->id,
                'sender_id' => $sender->id,
                'message_id' => $messageId
            ]);

            // Determine the recipient (the other participant)
            $recipient = null;
            if ($sender->id === $appointment->patient_id) {
                $recipient = $appointment->doctor;
                Log::info("📤 Sending to doctor", ['doctor_id' => $recipient->id ?? 'null']);
            } else {
                $recipient = $appointment->patient;
                Log::info("📤 Sending to patient", ['patient_id' => $recipient->id ?? 'null']);
            }

            if (!$recipient) {
                Log::warning("❌ No recipient found for chat notification", [
                    'appointment_id' => $appointment->id,
                    'sender_id' => $sender->id
                ]);
                return;
            }

            Log::info("👤 Recipient found", [
                'recipient_id' => $recipient->id,
                'push_notifications_enabled' => $recipient->push_notifications_enabled,
                'has_push_token' => !empty($recipient->push_token),
                'push_token' => $recipient->push_token ? 'exists' : 'missing'
            ]);

            // Don't send notification if recipient has disabled push notifications
            if (!$recipient->push_notifications_enabled || !$recipient->push_token) {
                Log::info("⚠️ Recipient has disabled push notifications or no token", [
                    'recipient_id' => $recipient->id,
                    'appointment_id' => $appointment->id,
                    'push_notifications_enabled' => $recipient->push_notifications_enabled,
                    'has_push_token' => !empty($recipient->push_token)
                ]);
                return;
            }

            Log::info("🚀 Attempting to send notification", [
                'recipient_id' => $recipient->id,
                'fcm_server_key' => config('services.fcm.server_key') ? 'configured' : 'missing',
                'fcm_project_id' => config('services.fcm.project_id') ? 'configured' : 'missing'
            ]);

            // Send the notification
            $notification = new ChatMessageNotification($sender, $appointment, $message, $messageId);
            $recipient->notify($notification);

            Log::info("✅ Chat notification sent successfully", [
                'appointment_id' => $appointment->id,
                'sender_id' => $sender->id,
                'recipient_id' => $recipient->id,
                'message_id' => $messageId
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Failed to send chat notification: " . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'sender_id' => $sender->id,
                'message_id' => $messageId,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
        }
    }

    /**
     * Apply anonymization to messages if the other participant has anonymous mode enabled
     */
    private function applyAnonymizationToMessages($messages, $currentUser, $sessionData)
    {
        // Determine the other participant
        $otherParticipantId = null;
        if ($currentUser->id == $sessionData->patient_id) {
            $otherParticipantId = $sessionData->doctor_id;
        } else {
            $otherParticipantId = $sessionData->patient_id;
        }

        // Get the other participant
        $otherParticipant = User::find($otherParticipantId);
        if (!$otherParticipant) {
            return $messages;
        }

        // Check if the other participant has anonymous mode enabled
        $isAnonymous = $this->anonymizationService->isAnonymousModeEnabled($otherParticipant);
        \Log::info('🔍 [ChatController] Anonymization check', [
            'other_participant_id' => $otherParticipantId,
            'other_participant_name' => $otherParticipant->display_name ?? $otherParticipant->first_name . ' ' . $otherParticipant->last_name,
            'is_anonymous' => $isAnonymous,
            'privacy_preferences' => $otherParticipant->privacy_preferences
        ]);

        if (!$isAnonymous) {
            return $messages;
        }

        // Apply anonymization to messages
        $anonymizedMessages = [];
        foreach ($messages as $message) {
            $anonymizedMessage = $message;

            // If this message is from the other participant, anonymize it
            if ($message['sender_id'] == $otherParticipantId) {
                $anonymizedMessage = $this->anonymizationService->getAnonymizedMessageData($message, $otherParticipant);
            }

            $anonymizedMessages[] = $anonymizedMessage;
        }

        return $anonymizedMessages;
    }

    /**
     * Get paginated chat history for web clients (read-only)
     * 
     * This endpoint fetches encrypted messages from the database and decrypts them
     * only after authorization. Supports pagination for efficient loading.
     * 
     * @param Request $request
     * @param string $conversationId - Format: text_session_123 or direct_session_123
     * @return JsonResponse
     */
    public function getChatHistory(Request $request, string $conversationId): JsonResponse
    {
        // Validate pagination parameters
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'since_id' => 'nullable|string' // For incremental sync
        ]);

        $user = Auth::user();
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 50);
        $sinceId = $request->input('since_id');

        // Step 1: AUTHORIZATION - Verify user access BEFORE any data retrieval
        $accessCheck = $this->handleAppointmentIdAndVerifyAccess($conversationId, $user);

        if (!$accessCheck['success']) {
            return response()->json([
                'success' => false,
                'message' => $accessCheck['message']
            ], $accessCheck['status']);
        }

        $sessionData = $accessCheck['data'];
        $sessionType = $accessCheck['type'];

        // Determine sender_id and receiver_id for database query
        $senderId = null;
        $receiverId = null;

        if ($sessionType === 'text_session') {
            $senderId = $user->id;
            $receiverId = $user->id === $sessionData->patient_id
                ? $sessionData->doctor_id
                : $sessionData->patient_id;
        } elseif ($sessionType === 'direct_session') {
            $senderId = $user->id;
            $receiverId = $user->id === $sessionData->patient_id
                ? $sessionData->doctor_id
                : $sessionData->patient_id;
        }

        // Step 2: FETCH ENCRYPTED MESSAGES from database (after authorization)
        $query = DB::table('chats')
            ->where(function ($q) use ($senderId, $receiverId) {
                $q->where(function ($subQ) use ($senderId, $receiverId) {
                    $subQ->where('sender_id', $senderId)
                        ->where('receiver_id', $receiverId);
                })->orWhere(function ($subQ) use ($senderId, $receiverId) {
                    $subQ->where('sender_id', $receiverId)
                        ->where('receiver_id', $senderId);
                });
            })
            ->orderBy('created_at', 'desc');

        // Apply incremental sync filter if provided
        if ($sinceId) {
            $query->where('id', '>', $sinceId);
        }

        // Paginate results
        $offset = ($page - 1) * $perPage;
        $encryptedMessages = $query->offset($offset)
            ->limit($perPage)
            ->get();

        $totalCount = DB::table('chats')
            ->where(function ($q) use ($senderId, $receiverId) {
                $q->where(function ($subQ) use ($senderId, $receiverId) {
                    $subQ->where('sender_id', $senderId)
                        ->where('receiver_id', $receiverId);
                })->orWhere(function ($subQ) use ($senderId, $receiverId) {
                    $subQ->where('sender_id', $receiverId)
                        ->where('receiver_id', $senderId);
                });
            })
            ->count();

        // Step 3: DECRYPT MESSAGES (only after authorization)
        $decryptedMessages = [];

        foreach ($encryptedMessages as $encryptedMsg) {
            try {
                // Decrypt message content using EncryptionUtil
                $plaintext = \App\Utils\EncryptionUtil::decryptMessage(
                    $encryptedMsg->encrypted_content,
                    $encryptedMsg->encryption_iv,
                    $encryptedMsg->encryption_tag
                );

                // Build response message (plaintext not cached)
                $decryptedMessages[] = [
                    'id' => $encryptedMsg->id,
                    'sender_id' => $encryptedMsg->sender_id,
                    'message' => $plaintext, // Decrypted content
                    'message_type' => 'text', // Can be enhanced to support other types
                    'created_at' => $encryptedMsg->created_at,
                    'origin_platform' => $encryptedMsg->origin_platform,
                    'is_own_message' => $encryptedMsg->sender_id === $user->id
                ];
            } catch (\Exception $e) {
                // Log decryption failure but don't expose details to client
                Log::error('Failed to decrypt message', [
                    'message_id' => $encryptedMsg->id,
                    'error' => $e->getMessage()
                ]);

                // Skip message or return placeholder
                $decryptedMessages[] = [
                    'id' => $encryptedMsg->id,
                    'sender_id' => $encryptedMsg->sender_id,
                    'message' => '[Message decryption failed]',
                    'message_type' => 'text',
                    'created_at' => $encryptedMsg->created_at,
                    'origin_platform' => $encryptedMsg->origin_platform,
                    'is_own_message' => $encryptedMsg->sender_id === $user->id,
                    'decryption_error' => true
                ];
            }
        }

        // Step 4: RETURN RESPONSE (decrypted messages not cached)
        return response()->json([
            'success' => true,
            'data' => [
                'messages' => $decryptedMessages,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $totalCount,
                    'has_more' => ($offset + count($encryptedMessages)) < $totalCount
                ]
            ]
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}