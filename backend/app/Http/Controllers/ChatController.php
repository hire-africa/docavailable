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
     * Helper method to handle text session ID format and verify access
     */
    private function handleAppointmentIdAndVerifyAccess($appointmentId, $user)
    {
        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
        // If not found as appointment, try as text session
        if (!$appointment) {
            $textSession = DB::table('text_sessions')
                ->where('id', $actualId)
                ->first();
                
            if ($textSession) {
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
        
        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
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
        
        // Get messages from cache storage
        $messages = $this->messageStorageService->getMessages($actualId, 'appointment');
        
        // Apply anonymization if needed
        $messages = $this->applyAnonymizationToMessages($messages, $user, $appointment);
            
        return response()->json([
            'success' => true,
            'data' => $messages
        ]);
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
        
        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = Appointment::with(['patient', 'doctor'])
            ->where('id', $actualId)
            ->first();
        
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
            // Check if user is part of this appointment
            if ($appointment->patient_id !== $user->id && $appointment->doctor_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to chat'
                ], 403);
            }
            
            $otherParticipantId = $appointment->patient_id === $user->id ? $appointment->doctor_id : $appointment->patient_id;
            $otherParticipantName = $appointment->patient_id === $user->id 
                ? 'Dr. ' . $appointment->doctor->first_name . ' ' . $appointment->doctor->last_name
                : $appointment->patient->first_name . ' ' . $appointment->patient->last_name;
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
        
        // Store message in cache
        // Use numeric ID for MessageStorageService methods
        $sessionType = (!$appointment && strpos($appointmentId, 'text_session_') === 0) ? 'text_session' : 'appointment';
        $message = $this->messageStorageService->storeMessage($actualId, $messageData, $sessionType);
        
        // Update chat room keys for tracking
        // Use numeric ID for MessageStorageService methods
        $this->messageStorageService->updateChatRoomKeys($actualId, $sessionType);
        
        // Handle text session logic
        if (!$appointment && strpos($appointmentId, 'text_session_') === 0) {
            $sessionId = str_replace('text_session_', '', $appointmentId);
            $session = \App\Models\TextSession::find($sessionId);
            
            Log::info("Text session message received", [
                'appointment_id' => $appointmentId,
                'session_id' => $sessionId,
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'session_found' => $session ? 'yes' : 'no',
                'session_status' => $session ? $session->status : 'not_found',
                'session_patient_id' => $session ? $session->patient_id : 'not_found',
                'session_doctor_id' => $session ? $session->doctor_id : 'not_found',
                'doctor_response_deadline' => $session ? $session->doctor_response_deadline : 'not_set',
                'message_type' => $request->message_type ?? 'text',
                'message_length' => strlen($request->message)
            ]);
            
            if ($session) {
                // Check if this is the first patient message (to start the 90-second timer)
                if ($session->status === \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR && $user->id === $session->patient_id) {
                    Log::info("Patient message detected in waiting session", [
                        'session_id' => $sessionId,
                        'patient_id' => $session->patient_id,
                        'current_deadline' => $session->doctor_response_deadline,
                        'user_id' => $user->id,
                        'message' => substr($request->message, 0, 50) . '...'
                    ]);
                    
                    // FIXED: Set deadline when patient sends ANY message while waiting
                    // This prevents race conditions and ensures deadline is always set
                    if (!$session->doctor_response_deadline) {
                        $newDeadline = now()->addSeconds(90);
                        $session->update([
                            'doctor_response_deadline' => $newDeadline
                        ]);
                        
                        Log::info("90-second timer started", [
                            'session_id' => $sessionId,
                            'deadline_set_to' => $newDeadline,
                            'current_time' => now(),
                            'time_until_deadline' => 90
                        ]);
                    } else {
                        Log::info("Deadline already set, not updating", [
                            'session_id' => $sessionId,
                            'existing_deadline' => $session->doctor_response_deadline,
                            'time_remaining' => $session->doctor_response_deadline->diffInSeconds(now())
                        ]);
                    }
                }
                
                // Check if this is the first doctor message (to activate the session)
                if ($session->status === \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR && $user->id === $session->doctor_id) {
                    Log::info("Doctor message detected in waiting session, activating", [
                        'session_id' => $sessionId,
                        'doctor_id' => $session->doctor_id,
                        'user_id' => $user->id,
                        'message' => substr($request->message, 0, 50) . '...'
                    ]);
                    
                    // FIXED: Activate session when doctor sends ANY message while waiting
                    // This prevents race conditions where both patient and doctor send messages quickly
                    $session->activate();
                    
                    Log::info("Session activated by doctor", [
                        'session_id' => $sessionId,
                        'activated_at' => now(),
                        'previous_status' => \App\Models\TextSession::STATUS_WAITING_FOR_DOCTOR,
                        'new_status' => \App\Models\TextSession::STATUS_ACTIVE,
                        'auto_deductions' => 'scheduler-based',
                        'auto_ending' => 'existing-process'
                    ]);
                }
            } else {
                Log::error("Text session not found", [
                    'session_id' => $sessionId,
                    'appointment_id' => $appointmentId,
                    'user_id' => $user->id
                ]);
            }
        }
        
        // Handle appointment join tracking (patient/doctor joins by sending message)
        if ($appointment) {
            // Check if this is the first message from patient
            if ($user->id === $appointment->patient_id && !$appointment->patient_joined) {
                \App\Models\Appointment::where('id', $appointment->id)->update([
                    'patient_joined' => now()
                ]);
            }
            
            // Check if this is the first message from doctor
            if ($user->id === $appointment->doctor_id && !$appointment->doctor_joined) {
                \App\Models\Appointment::where('id', $appointment->id)->update([
                    'doctor_joined' => now()
                ]);
            }
            
            $this->sendChatNotification($user, $appointment, $request->message, $message['id']);
        } else {
            // Text session message notification
            if (isset($session) && $session) {
                try {
                    $recipient = ($user->id === $session->patient_id) ? \App\Models\User::find($session->doctor_id) : \App\Models\User::find($session->patient_id);
                    if ($recipient && $recipient->push_notifications_enabled && $recipient->push_token) {
                        $notificationData = [
                            'session_id' => $session->id,
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
                    Log::error('❌ Failed to send text session message notification: '.$e->getMessage(), [
                        'session_id' => $session->id
                    ]);
                }
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
        
        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
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
                
        // Determine the other participant's name and profile picture for text session
        $otherParticipantName = '';
        $otherParticipantId = null;
        if ($user->id === $textSession->doctor_id) {
            $otherParticipantName = $textSession->patient_first_name . ' ' . $textSession->patient_last_name;
            $otherParticipantId = $textSession->patient_id;
        } else {
            $otherParticipantName = 'Dr. ' . $textSession->doctor_first_name . ' ' . $textSession->doctor_last_name;
            $otherParticipantId = $textSession->doctor_id;
        }

        $otherParticipantProfilePath = null;
        $otherParticipantProfileUrl = null;
        if ($otherParticipantId) {
            $otherUser = \App\Models\User::find($otherParticipantId);
            if ($otherUser) {
                // Check if the other user has anonymous mode enabled
                if ($this->anonymizationService->isAnonymousModeEnabled($otherUser)) {
                    $otherParticipantName = $this->anonymizationService->getAnonymizedDisplayName($otherUser);
                    $otherParticipantProfilePath = null;
                    $otherParticipantProfileUrl = null;
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
                    $otherParticipantName = $this->anonymizationService->getAnonymizedDisplayName($otherUser);
                    $otherParticipantProfilePath = null;
                    $otherParticipantProfileUrl = null;
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
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'appointment_type' => $appointment->appointment_type ?? 'text', // Include appointment type with fallback
                'status' => $appointment->status,
                'doctor_id' => $appointment->doctor_id,
                'patient_id' => $appointment->patient_id,
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
        
        // Handle text session ID format (text_session_123)
        $actualId = $appointmentId;
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
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
        
        // Get messages for local storage
        $data = $this->messageStorageService->getMessagesForLocalStorage($actualId, 'appointment');
        
        return response()->json([
            'success' => true,
            'data' => $data
        ]);
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
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
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
        
        // Sync messages from local storage
        $result = $this->messageStorageService->syncFromLocalStorage($actualId, $request->messages, 'appointment');
        
        return response()->json([
            'success' => true,
            'data' => $result
        ]);
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
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
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
        if (strpos($appointmentId, 'text_session_') === 0) {
            $actualId = str_replace('text_session_', '', $appointmentId);
        }
        
        // Convert to integer for database queries
        $actualId = (int) $actualId;
        
        // First, try to find it as a regular appointment
        $appointment = DB::table('appointments')
            ->where('id', $actualId)
            ->first();
        
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
        $user = DB::table('users')
            ->where('id', $userId)
            ->select('first_name', 'last_name', 'user_type')
            ->first();
            
        if (!$user) {
            return 'Unknown User';
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
        if (!$this->anonymizationService->isAnonymousModeEnabled($otherParticipant)) {
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
} 