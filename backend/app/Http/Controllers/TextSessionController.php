<?php

namespace App\Http\Controllers;

use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\MessageStorageService;
use App\Services\NotificationService;
use App\Services\TimezoneService;
use App\Services\AnonymizationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log; // Added Log facade

class TextSessionController extends Controller
{
    protected $messageStorageService;
    protected $notificationService;
    protected $anonymizationService;

    public function __construct(MessageStorageService $messageStorageService, NotificationService $notificationService, AnonymizationService $anonymizationService)
    {
        $this->messageStorageService = $messageStorageService;
        $this->notificationService = $notificationService;
        $this->anonymizationService = $anonymizationService;
    }

    /**
     * Start a new text session.
     */
    public function start(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'doctor_id' => 'required|integer|exists:users,id',
                'reason' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $patientId = auth()->id();
            $doctorId = $request->input('doctor_id');
            $reason = $request->input('reason');

            // Check if doctor exists (removed approval and online status restrictions)
            $doctor = User::where('id', $doctorId)
                ->where('user_type', 'doctor')
                ->first();

            if (!$doctor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Doctor not found'
                ], 404);
            }

            // ENFORCE subscription requirement - patients must have active subscription
            $subscription = Subscription::where('user_id', $patientId)
                ->where('status', 1) // 1 = active, 0 = inactive, 2 = expired
                ->where('is_active', true)
                ->first();

            // Check if subscription exists and is active
            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found. Please subscribe to a plan to start a text session.'
                ], 403);
            }

            // Check if patient has text sessions remaining
            $sessionsRemaining = $subscription->text_sessions_remaining ?? 0;
            if ($sessionsRemaining <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have no text sessions remaining in your subscription. Please upgrade your plan or wait for renewal.'
                ], 403);
            }

            // Use transaction to ensure atomicity and prevent race conditions
            $textSession = DB::transaction(function () use ($patientId, $doctorId, $reason, $sessionsRemaining) {
                // Lock and check for existing session again within transaction
                $existingSession = TextSession::where('patient_id', $patientId)
                    ->where('doctor_id', $doctorId)
                    ->whereIn('status', [TextSession::STATUS_ACTIVE, TextSession::STATUS_WAITING_FOR_DOCTOR])
                    ->lockForUpdate()
                    ->first();

                if ($existingSession) {
                    throw new \Exception('You already have an active session with this doctor');
                }

                // Create text session
                $textSession = TextSession::create([
                    'patient_id' => $patientId,
                    'doctor_id' => $doctorId,
                    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
                    'started_at' => now(),
                    'last_activity_at' => now(),
                    'sessions_used' => 0,
                    'sessions_remaining_before_start' => $sessionsRemaining,
                    'reason' => $reason,
                ]);

                // Create chat room
                $chatRoomName = "text_session_{$textSession->id}";
                $chatRoomId = DB::table('chat_rooms')->insertGetId([
                    'name' => $chatRoomName,
                    'type' => 'text_session',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Update session with chat_id
                $textSession->update(['chat_id' => $chatRoomId]);

                // Add participants
                DB::table('chat_room_participants')->insert([
                    [
                        'chat_room_id' => $chatRoomId,
                        'user_id' => $patientId,
                        'role' => 'member',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'chat_room_id' => $chatRoomId,
                        'user_id' => $doctorId,
                        'role' => 'member',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                ]);

                return $textSession;
            });

            $textSessionId = $textSession->id;

            // Clear any existing message cache for this text session to prevent old messages from showing
            // This ensures each new text session starts with a clean chat history
            try {
                $this->messageStorageService->clearMessages($textSessionId, 'text_session');
                Log::info("Cleared message cache for new text session", [
                    'text_session_id' => $textSessionId,
                    'patient_id' => $patientId,
                    'doctor_id' => $doctorId
                ]);
            } catch (\Exception $e) {
                Log::warning("Failed to clear message cache for new text session", [
                    'text_session_id' => $textSessionId,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the session creation if cache clearing fails
            }

            // Get the created session to calculate remaining time
            $session = TextSession::find($textSessionId);
            
            // Send notifications to both patient and doctor
            $this->notificationService->sendTextSessionNotification($session, 'started', 'Your text session has started');
            
            return response()->json([
                'success' => true,
                'message' => 'Text session started successfully',
                'data' => [
                    'session_id' => $textSessionId,
                    'appointment_id' => $textSessionId, // For compatibility with frontend
                    'doctor' => [
                        'id' => $doctor->id,
                        'name' => $doctor->display_name ?? "{$doctor->first_name} {$doctor->last_name}",
                        'response_time' => 2, // 2 minutes response time
                    ],
                    'chat_room_id' => $chatRoom,
                    'sessions_remaining' => $subscription ? $subscription->text_sessions_remaining : $sessionsRemaining,
                    'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                    'remaining_sessions' => $session->getRemainingSessions(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start text session: ' . $e->getMessage()
            ], 500);
        }
    }



    /**
     * Check if doctor has responded within 90 seconds
     */
    public function checkResponse($sessionId): JsonResponse
    {
        try {
            $session = TextSession::find($sessionId);
            
            Log::info("Session status check requested", [
                'session_id' => $sessionId,
                'session_found' => $session ? 'yes' : 'no',
                'session_status' => $session ? $session->status : 'not_found',
                'current_time' => now()
            ]);
            
            if (!$session) {
                Log::error("Session not found for status check", [
                    'session_id' => $sessionId
                ]);
                
                return response()->json([
                    'success' => false, 
                    'message' => 'Session not found'
                ], 404);
            }
            
            // Check if session has expired waiting for doctor
            if ($session->status === TextSession::STATUS_WAITING_FOR_DOCTOR) {
                Log::info("Session is waiting for doctor", [
                    'session_id' => $sessionId,
                    'doctor_response_deadline' => $session->doctor_response_deadline,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id
                ]);
                
                // If doctor_response_deadline is not set, patient hasn't sent first message yet
                if (!$session->doctor_response_deadline) {
                    Log::info("No deadline set - patient hasn't sent first message", [
                        'session_id' => $sessionId
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'status' => 'waiting',
                        'timeRemaining' => null, // No timer started yet
                        'remainingTimeMinutes' => $session->getRemainingTimeMinutes(),
                        'remainingSessions' => $session->getRemainingSessions(),
                        'message' => 'Waiting for patient to send first message'
                    ]);
                }
                
                // Use doctor_response_deadline to calculate remaining time
                $currentTime = now();
                $deadline = $session->doctor_response_deadline;
                
                // Calculate time remaining using timestamp comparison
                $currentTimestamp = $currentTime->timestamp;
                $deadlineTimestamp = $deadline->timestamp;
                $timeRemaining = max(0, $deadlineTimestamp - $currentTimestamp);
                
                Log::info("Calculating time remaining", [
                    'session_id' => $sessionId,
                    'current_time' => $currentTime,
                    'deadline' => $deadline,
                    'current_timestamp' => $currentTimestamp,
                    'deadline_timestamp' => $deadlineTimestamp,
                    'time_remaining' => $timeRemaining,
                    'is_expired' => $timeRemaining <= 0
                ]);
                
                if ($timeRemaining <= 0) {
                    Log::info("Session expired - auto-expiring", [
                        'session_id' => $sessionId,
                        'time_remaining' => $timeRemaining,
                        'deadline' => $deadline,
                        'current_time' => $currentTime,
                        'current_status' => $session->status
                    ]);
                    
                    // Auto-expire the session
                    try {
                        $updateResult = $session->update([
                            'status' => TextSession::STATUS_EXPIRED,
                            'ended_at' => now()
                        ]);
                        
                        // Refresh to verify update
                        $session->refresh();
                        
                        Log::info("Session update result", [
                            'session_id' => $sessionId,
                            'update_successful' => $updateResult,
                            'new_status' => $session->status,
                            'ended_at' => $session->ended_at,
                            'is_expired' => $session->status === TextSession::STATUS_EXPIRED
                        ]);
                    } catch (\Exception $updateError) {
                        Log::error("CRITICAL: Failed to update session to expired", [
                            'session_id' => $sessionId,
                            'error' => $updateError->getMessage(),
                            'trace' => $updateError->getTraceAsString()
                        ]);
                        // Still try to return expired status even if DB update fails
                    }
                    
                    // Broadcast session-expired event via WebSocket
                    try {
                        $webrtcUrl = env('WEBRTC_CHAT_SERVER_URL', 'https://docavailable-3vbdv.ondigitalocean.app:8089');
                        $broadcastUrl = "{$webrtcUrl}/broadcast-session-expired";
                        
                        $ch = curl_init($broadcastUrl);
                        curl_setopt($ch, CURLOPT_POST, true);
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                            'sessionId' => $sessionId,
                            'patientId' => $session->patient_id,
                            'doctorId' => $session->doctor_id,
                            'reason' => 'Doctor did not respond within 90 seconds'
                        ]));
                        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 2); // Short timeout
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For development
                        
                        $response = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);
                        
                        Log::info("Broadcast session-expired event", [
                            'session_id' => $sessionId,
                            'http_code' => $httpCode,
                            'response' => $response
                        ]);
                    } catch (\Exception $e) {
                        Log::warning("Failed to broadcast session-expired event", [
                            'session_id' => $sessionId,
                            'error' => $e->getMessage()
                        ]);
                        // Don't fail the expiry if broadcast fails
                    }
                    
                    return response()->json([
                        'success' => true,
                        'status' => 'expired',
                        'timeRemaining' => 0,
                        'message' => 'Session expired - no session will be deducted'
                    ]);
                }
                
                Log::info("Session still waiting with time remaining", [
                    'session_id' => $sessionId,
                    'time_remaining' => $timeRemaining,
                    'remaining_time_minutes' => $session->getRemainingTimeMinutes()
                ]);
                
                return response()->json([
                    'success' => true,
                    'status' => 'waiting',
                    'timeRemaining' => $timeRemaining,
                    'remainingTimeMinutes' => $session->getRemainingTimeMinutes(),
                    'remainingSessions' => $session->getRemainingSessions(),
                    'message' => 'Waiting for doctor response'
                ]);
            }
            
            // Check if active session has run out of time
            if ($session->status === TextSession::STATUS_ACTIVE && $session->hasRunOutOfTime()) {
                Log::info("Active session has run out of time - auto-ending", [
                    'session_id' => $sessionId,
                    'elapsed_minutes' => $session->getElapsedMinutes(),
                    'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                    'total_allowed_minutes' => $session->getTotalAllowedMinutes()
                ]);
                
                // Auto-end the session and process payment/deduction
                $session->update([
                    'status' => TextSession::STATUS_ENDED,
                    'ended_at' => now()
                ]);
                
                // Process payment and deduction
                try {
                    $paymentService = new \App\Services\DoctorPaymentService();
                    $paymentResult = $paymentService->processSessionEnd($session, true); // true for manual end
                    
                    Log::info("Auto-ended session payment processing result", [
                        'session_id' => $sessionId,
                        'doctor_payment_success' => $paymentResult['doctor_payment_success'],
                        'patient_deduction_success' => $paymentResult['patient_deduction_success'],
                        'sessions_deducted' => $paymentResult['patient_sessions_deducted'],
                        'elapsed_minutes' => $session->getElapsedMinutes(),
                        'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                        'total_allowed_minutes' => $session->getTotalAllowedMinutes()
                    ]);
                } catch (\Exception $e) {
                    Log::error("Failed to process payment for auto-ended session", [
                        'session_id' => $sessionId,
                        'error' => $e->getMessage()
                    ]);
                }
                
                return response()->json([
                    'success' => true,
                    'status' => 'ended',
                    'timeRemaining' => 0,
                    'message' => 'Session has ended - time limit reached'
                ]);
            }
            
            // Check if active session should end due to insufficient sessions
            if ($session->status === TextSession::STATUS_ACTIVE && $session->shouldAutoEndDueToInsufficientSessions()) {
                Log::info("Active session should end due to insufficient sessions", [
                    'session_id' => $sessionId,
                    'session_details' => $session->getSessionStatusDetails()
                ]);
                
                // Auto-end the session and process payment/deduction
                $session->update([
                    'status' => TextSession::STATUS_ENDED,
                    'ended_at' => now()
                ]);
                
                try {
                    $paymentService = new \App\Services\DoctorPaymentService();
                    $paymentResult = $paymentService->processSessionEnd($session, true);
                    Log::info("Auto-ended session due to insufficient sessions - payment processing result", ['session_id' => $sessionId, 'result' => $paymentResult]);
                } catch (\Exception $e) {
                    Log::error("Failed to process payment for session ended due to insufficient sessions", ['session_id' => $sessionId, 'error' => $e->getMessage()]);
                }
                
                return response()->json([
                    'success' => true,
                    'status' => 'ended',
                    'timeRemaining' => 0,
                    'message' => 'Session has ended - no sessions remaining'
                ]);
            }
            
            // Session is active and has time remaining
            Log::info("Session is active with time remaining", [
                'session_id' => $sessionId,
                'status' => $session->status,
                'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                'elapsed_minutes' => $session->getElapsedMinutes()
            ]);
            
            // Trigger auto-deduction processing for active sessions
            try {
                $paymentService = new \App\Services\DoctorPaymentService();
                $autoDeductionResult = $paymentService->processAutoDeduction($session);
                
                Log::info("Auto-deduction processed during status check", [
                    'session_id' => $sessionId,
                    'auto_deduction_result' => $autoDeductionResult,
                    'elapsed_minutes' => $session->getElapsedMinutes(),
                    'auto_deductions_processed' => $session->auto_deductions_processed,
                    'sessions_used' => $session->sessions_used
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to process auto-deduction during status check", [
                    'session_id' => $sessionId,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the status check if auto-deduction fails
            }
            
            return response()->json([
                'success' => true,
                'status' => 'active',
                'timeRemaining' => null, // Not applicable for active sessions
                'remainingTimeMinutes' => $session->getRemainingTimeMinutes(),
                'remainingSessions' => $session->getRemainingSessions(),
                'message' => 'Session is active'
            ]);
            
        } catch (\Exception $e) {
            Log::error("Error checking session response", [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to check session status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active sessions (for global monitoring).
     */
    public function getAllActiveSessions(Request $request): JsonResponse
    {
        try {
            // Clear any cached query plans to handle schema changes
            DB::statement('DISCARD PLANS');
            
            $sessions = TextSession::with(['patient', 'doctor'])
                ->where('status', 'active')
                ->whereNotNull('activated_at')
                ->orderBy('activated_at', 'desc')
                ->get();

            $sessionsData = $sessions->map(function ($session) {
                return [
                    'id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id,
                    'status' => $session->status,
                    'activated_at' => $session->activated_at,
                    'created_at' => $session->created_at,
                    'updated_at' => $session->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $sessionsData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch all active sessions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active sessions for the authenticated user.
     */
    public function activeSessions(Request $request): JsonResponse
    {
        try {
            // Clear any cached query plans to handle schema changes
            DB::statement('DISCARD PLANS');
            
            $userId = auth()->id();
            $userType = auth()->user()->user_type;

            $query = TextSession::with(['patient', 'doctor'])
                ->whereIn('status', ['active', 'waiting_for_doctor']);

            if ($userType === 'doctor') {
                $query->where('doctor_id', $userId);
            } else {
                $query->where('patient_id', $userId);
            }

            $sessions = $query->orderBy('last_activity_at', 'desc')->get();

            // Add remaining time information to each session
            $sessionsWithTime = $sessions->map(function ($session) use ($userType) {
                $sessionData = [
                    'id' => $session->id,
                    'status' => $session->status,
                    'started_at' => $session->started_at,
                    'ended_at' => $session->ended_at,
                    'last_activity_at' => $session->last_activity_at,
                    'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                    'remaining_sessions' => $session->getRemainingSessions(),
                    'elapsed_minutes' => $session->getElapsedMinutes(),
                    'sessions_used' => $session->sessions_used,
                    'sessions_remaining_before_start' => $session->sessions_remaining_before_start,
                    'patient' => $session->patient,
                    'doctor' => $session->doctor,
                ];

                // Apply anonymization for doctors viewing patient data
                if ($userType === 'doctor' && $session->patient && $this->anonymizationService->isAnonymousModeEnabled($session->patient)) {
                    $anonymizedPatientData = $this->anonymizationService->getAnonymizedUserData($session->patient);
                    $sessionData['patient'] = $anonymizedPatientData;
                    $sessionData['patient_name'] = $anonymizedPatientData['display_name'];
                } else if ($userType === 'doctor' && $session->patient) {
                    $sessionData['patient_name'] = $session->patient->first_name . ' ' . $session->patient->last_name;
                }

                // Apply anonymization for patients viewing doctor data
                if ($userType === 'patient' && $session->doctor && $this->anonymizationService->isAnonymousModeEnabled($session->doctor)) {
                    $anonymizedDoctorData = $this->anonymizationService->getAnonymizedUserData($session->doctor);
                    $sessionData['doctor'] = $anonymizedDoctorData;
                }

                return $sessionData;
            });

            return response()->json([
                'success' => true,
                'data' => $sessionsWithTime
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sessions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * End a text session.
     */
    public function endSession(Request $request, $sessionId): JsonResponse
    {
        try {
            $userId = auth()->id();
            $userType = auth()->user()->user_type;

            // First check if the session exists
            $session = TextSession::find($sessionId);
            
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Text session not found. It may have already been ended or deleted.'
                ], 404);
            }

            // Check if session is already ended
            if ($session->status === TextSession::STATUS_ENDED) {
                return response()->json([
                    'success' => true,
                    'message' => 'Session was already ended',
                    'data' => [
                        'session' => $session,
                        'already_ended' => true
                    ]
                ]);
            }

            // Check if user is authorized to end this session
            if ($userType === 'doctor' && $session->doctor_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to end this session'
                ], 403);
            }

            if ($userType === 'patient' && $session->patient_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to end this session'
                ], 403);
            }

            // End the session using the new queue-based approach with atomic operations
            // Preserve the original reason when ending manually
            $originalReason = $session->reason ?: 'General Checkup';
            $endResult = $session->endManually($originalReason);
            
            if (!$endResult) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to end session. It may have already been ended or is not active.'
                ], 400);
            }

            // Process payment after session is ended (outside transaction)
            try {
                \Log::info('Processing payment for manual session end', [
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id,
                ]);
                
                $paymentService = new \App\Services\DoctorPaymentService();
                $paymentResult = $paymentService->processManualEndDeduction($session);
                
                if ($paymentResult) {
                    \Log::info('Payment processing successful for manual end', [
                        'session_id' => $sessionId,
                        'user_id' => $userId,
                    ]);
                } else {
                    \Log::warning('Payment processing failed for manual end, but session was ended', [
                        'session_id' => $sessionId,
                        'user_id' => $userId,
                    ]);
                }
            } catch (\Exception $paymentError) {
                \Log::error('Payment processing error for manual end', [
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'error' => $paymentError->getMessage(),
                    'trace' => $paymentError->getTraceAsString(),
                ]);
                // Don't fail the session end if payment processing fails
            }

            // Send notifications to both patient and doctor
            $this->notificationService->sendTextSessionNotification($session, 'ended', 'Your text session has ended');
            
            return response()->json([
                'success' => true,
                'message' => 'Session ended successfully',
                'data' => [
                    'session' => $session,
                    'ended_successfully' => true
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error ending text session:', [
                'session_id' => $sessionId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to end session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific text session by ID.
     */
    public function getSession(Request $request, $sessionId): JsonResponse
    {
        try {
            $user = auth()->user();
            
            $session = TextSession::with(['patient.subscription', 'doctor'])
                ->where('id', $sessionId)
                ->first();
                
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Text session not found'
                ], 404);
            }
            
            // Check if user is part of this session
            if ($session->patient_id !== $user->id && $session->doctor_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to session'
                ], 403);
            }
            
            // Get actual subscription balance
            $actualSessionsRemaining = 0;
            if ($session->patient && $session->patient->subscription) {
                $actualSessionsRemaining = $session->patient->subscription->text_sessions_remaining;
            }
            
            // Apply anonymization if needed
            $patientData = $session->patient;
            $doctorData = $session->doctor;
            
            // If current user is doctor and patient has anonymous mode enabled, anonymize patient data
            if ($user->id === $session->doctor_id && $this->anonymizationService->isAnonymousModeEnabled($session->patient)) {
                $patientData = $this->anonymizationService->getAnonymizedUserData($session->patient);
                \Log::info('🔍 [TextSessionController] Anonymizing patient data for doctor', [
                    'session_id' => $sessionId,
                    'doctor_id' => $user->id,
                    'patient_id' => $session->patient_id,
                    'original_name' => $session->patient->display_name ?? $session->patient->first_name . ' ' . $session->patient->last_name,
                    'anonymized_name' => $patientData['display_name']
                ]);
            }
            
            // If current user is patient and doctor has anonymous mode enabled, anonymize doctor data
            if ($user->id === $session->patient_id && $this->anonymizationService->isAnonymousModeEnabled($session->doctor)) {
                $doctorData = $this->anonymizationService->getAnonymizedUserData($session->doctor);
                \Log::info('🔍 [TextSessionController] Anonymizing doctor data for patient', [
                    'session_id' => $sessionId,
                    'patient_id' => $user->id,
                    'doctor_id' => $session->doctor_id,
                    'original_name' => $session->doctor->display_name ?? $session->doctor->first_name . ' ' . $session->doctor->last_name,
                    'anonymized_name' => $doctorData['display_name']
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $session->id,
                    'status' => $session->status,
                    'started_at' => $session->started_at,
                    'ended_at' => $session->ended_at,
                    'last_activity_at' => $session->last_activity_at,
                    'remaining_time_minutes' => $session->getRemainingTimeMinutes(),
                    'remaining_sessions' => $actualSessionsRemaining, // Use actual subscription balance
                    'elapsed_minutes' => $session->getElapsedMinutes(),
                    'sessions_used' => $session->sessions_used,
                    'sessions_remaining_before_start' => $session->sessions_remaining_before_start,
                    'patient' => $patientData,
                    'doctor' => $doctorData,
                    // Add other_participant_name and other_participant_profile_picture_url for frontend compatibility
                    'other_participant_name' => $user->id === $session->doctor_id ? 
                        ($patientData['display_name'] ?? 'Patient') : 
                        ($doctorData['display_name'] ?? 'Doctor'),
                    'other_participant_profile_picture_url' => $user->id === $session->doctor_id ? 
                        ($patientData['profile_picture_url'] ?? null) : 
                        ($doctorData['profile_picture_url'] ?? null),
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update session status.
     */
    public function updateStatus(Request $request, $sessionId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|string|in:waiting_for_doctor,active,ended'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $session = TextSession::find($sessionId);
            
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found'
                ], 404);
            }

            $status = $request->input('status');
            $oldStatus = $session->status;
            
            // Update session status
            $session->update([
                'status' => $status,
                'updated_at' => now()
            ]);

            // If status changed to active, set activated_at and trigger timer
            if ($status === 'active' && $oldStatus !== 'active') {
                $session->update([
                    'activated_at' => now()
                ]);
                
                Log::info("Session activated - timer should start immediately", [
                    'session_id' => $sessionId,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id,
                    'activated_at' => now(),
                    'old_status' => $oldStatus,
                    'new_status' => $status
                ]);
                
                // Trigger immediate timer start
                $this->triggerImmediateTimerStart($session);
            }

            Log::info("Session status updated", [
                'session_id' => $sessionId,
                'new_status' => $status,
                'old_status' => $oldStatus,
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session status updated successfully',
                'data' => [
                    'session_id' => $sessionId,
                    'status' => $status
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to update session status", [
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update session status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Trigger immediate timer start for activated session
     */
    private function triggerImmediateTimerStart(TextSession $session)
    {
        try {
            // This will be picked up by the global monitor on its next check
            // We could also implement a more direct notification system here
            Log::info("Session activation trigger sent", [
                'session_id' => $session->id,
                'patient_id' => $session->patient_id,
                'activated_at' => $session->activated_at
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to trigger immediate timer start", [
                'session_id' => $session->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Process auto-deduction for a text session
     */
    public function processAutoDeduction(Request $request, $sessionId): JsonResponse
    {
        try {
            $session = TextSession::find($sessionId);
            
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found'
                ], 404);
            }
            
            if ($session->status !== TextSession::STATUS_ACTIVE) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session is not active'
                ], 400);
            }
            
            $elapsedMinutes = $session->getElapsedMinutes();
            $expectedDeductions = floor($elapsedMinutes / 10);
            $alreadyProcessed = $session->auto_deductions_processed ?? 0;
            $newDeductions = $expectedDeductions - $alreadyProcessed;
            
            if ($newDeductions > 0) {
                $paymentService = new DoctorPaymentService();
                $success = $paymentService->processAutoDeduction($session);
                
                if ($success) {
                    // Service handles the update now
                    // Refresh session to get latest data
                    $session->refresh();
                    
                    Log::info("Auto-deduction processed via API", [
                        'session_id' => $sessionId,
                        'deductions_processed' => $newDeductions,
                        'total_deductions' => $expectedDeductions,
                        'triggered_by' => $request->input('triggered_by', 'api')
                    ]);
                    
                    // Send notification about deduction
                    $this->notificationService->sendTextSessionNotification(
                        $session, 
                        'session_deduction', 
                        "Session deduction: {$newDeductions} session(s) deducted"
                    );
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Auto-deduction processed successfully',
                        'data' => [
                            'deductions_processed' => $newDeductions,
                            'total_deductions' => $expectedDeductions
                        ]
                    ]);
                } else {
                    // CRITICAL: If payment fails, we must end the session to prevent free usage
                    Log::warning("Auto-deduction failed - Terminating session", ['session_id' => $sessionId]);
                    
                    $session->update([
                        'status' => TextSession::STATUS_ENDED,
                        'ended_at' => now(),
                        'ended_by' => 'system', // System ended due to payment failure
                        'reason' => 'Insufficient funds for auto-deduction'
                    ]);
                    
                    $this->notificationService->sendTextSessionNotification(
                        $session, 
                        'session_ended', 
                        "Session ended due to insufficient funds."
                    );

                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to process payment. Session has been ended.'
                    ], 402); // 402 Payment Required
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'No new deductions needed',
                'data' => [
                    'deductions_processed' => 0,
                    'total_deductions' => $expectedDeductions
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error processing auto-deduction:', [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to process auto-deduction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available doctors for text sessions.
     */
    public function availableDoctors(Request $request): JsonResponse
    {
        try {
            $doctors = User::where('user_type', 'doctor')
                // Removed status and online restrictions - show all doctors
                ->select([
                    'id',
                    'first_name',
                    'last_name',
                    'display_name',
                    'specialization',
                    'rating',
                    'years_of_experience',
                    'city',
                    'country',
                    'profile_picture_url',
                    'languages_spoken',
                    'is_online'
                ])
                ->get()
                ->map(function ($doctor) {
                    return [
                        'id' => $doctor->id,
                        'name' => $doctor->display_name ?? "{$doctor->first_name} {$doctor->last_name}",
                        'specialization' => $doctor->specialization ?? 'General Medicine',
                        'rating' => $doctor->rating ?? 4.5,
                        'years_of_experience' => $doctor->years_of_experience ?? 5,
                        'location' => implode(', ', array_filter([$doctor->city, $doctor->country])),
                        'profile_picture_url' => $doctor->profile_picture_url,
                        'languages_spoken' => $doctor->languages_spoken,
                        'is_online' => $doctor->is_online,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $doctors
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available doctors: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a text session from a text appointment when appointment time is reached.
     */
    public function createFromAppointment(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'appointment_id' => 'required|integer|exists:appointments,id',
                'doctor_id' => 'required|integer|exists:users,id',
                'patient_id' => 'required|integer|exists:users,id',
                'appointment_type' => 'required|string|in:text',
                'reason' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $appointmentId = $request->input('appointment_id');
            $doctorId = $request->input('doctor_id');
            $patientId = $request->input('patient_id');
            $reason = $request->input('reason');

            // Verify the appointment exists and is a text appointment
            $appointment = \App\Models\Appointment::find($appointmentId);
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            if ($appointment->appointment_type !== 'text') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only text appointments can be converted to text sessions'
                ], 400);
            }

            if ($appointment->status !== 'confirmed' && $appointment->status !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment must be confirmed to create text session'
                ], 400);
            }

            // Get user timezone and check if appointment time has been reached
            $userTimezone = TimezoneService::getUserTimezone($request);
            $isTimeReached = TimezoneService::isAppointmentTimeReached(
                $appointment->appointment_date, 
                $appointment->appointment_time, 
                $userTimezone, 
                5 // 5 minute buffer
            );
            
            // Debug logging for appointment time validation
            Log::info('🕐 [TextSessionController] Time validation debug', [
                'appointment_id' => $appointmentId,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'user_timezone' => $userTimezone,
                'is_time_reached' => $isTimeReached,
                'current_time_utc' => now()->utc()->toDateTimeString(),
                'app_timezone' => config('app.timezone', 'UTC')
            ]);
            
            if (!$isTimeReached) {
                Log::info('⏰ [TextSessionController] Appointment time not reached', [
                    'appointment_id' => $appointmentId,
                    'user_timezone' => $userTimezone
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment time has not been reached yet'
                ], 400);
            }

            // Check if text session already exists for this appointment
            $existingSession = TextSession::where('appointment_id', $appointmentId)->first();
            if ($existingSession) {
                return response()->json([
                    'success' => true,
                    'message' => 'Text session already exists for this appointment',
                    'data' => [
                        'session_id' => $existingSession->id,
                        'appointment_id' => $existingSession->appointment_id,
                        'status' => $existingSession->status,
                        'created_at' => $existingSession->created_at,
                    ]
                ]);
            }

            // Get patient's subscription
            $subscription = Subscription::where('user_id', $patientId)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found for patient'
                ], 400);
            }

            if ($subscription->text_sessions_remaining <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No text sessions remaining in subscription'
                ], 400);
            }

            // Create text session
            $textSession = TextSession::create([
                'appointment_id' => $appointmentId,
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'status' => 'waiting_for_doctor',
                'reason' => $reason ?: $appointment->reason,
                'sessions_remaining_before_start' => $subscription->text_sessions_remaining,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Deduct one text session from subscription
            $subscription->decrement('text_sessions_remaining');

            // Update text session with new remaining count
            $textSession->update([
                'sessions_remaining_before_start' => $subscription->fresh()->text_sessions_remaining
            ]);

            // Get doctor information
            $doctor = User::find($doctorId);

            Log::info("Text session created from appointment", [
                'session_id' => $textSession->id,
                'appointment_id' => $appointmentId,
                'doctor_id' => $doctorId,
                'patient_id' => $patientId,
                'sessions_remaining' => $subscription->text_sessions_remaining
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Text session created successfully from appointment',
                'data' => [
                    'id' => $textSession->id,
                    'appointment_id' => $textSession->appointment_id,
                    'doctor_id' => $textSession->doctor_id,
                    'patient_id' => $textSession->patient_id,
                    'status' => $textSession->status,
                    'reason' => $textSession->reason,
                    'sessions_remaining' => $subscription->text_sessions_remaining,
                    'created_at' => $textSession->created_at,
                    'doctor' => [
                        'id' => $doctor->id,
                        'name' => $doctor->display_name ?? "{$doctor->first_name} {$doctor->last_name}",
                        'first_name' => $doctor->first_name,
                        'last_name' => $doctor->last_name,
                    ],
                    'remaining_time_minutes' => 90, // 90 minutes for text sessions
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Error creating text session from appointment", [
                'error' => $e->getMessage(),
                'appointment_id' => $request->input('appointment_id'),
                'patient_id' => $request->input('patient_id'),
                'doctor_id' => $request->input('doctor_id'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create text session from appointment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse appointment date and time to create a DateTime object.
     */
    private function parseAppointmentDateTime($dateStr, $timeStr, $userTimezone = null)
    {
        try {
            if (!$dateStr || !$timeStr) {
                return null;
            }

            // Use user's timezone if provided, otherwise fall back to app timezone
            $targetTimezone = $userTimezone ?: config('app.timezone', 'UTC');
            
            // Handle different date formats
            if (strpos($dateStr, '/') !== false) {
                // Format: MM/DD/YYYY
                $dateParts = explode('/', $dateStr);
                if (count($dateParts) === 3) {
                    $month = (int)$dateParts[0];
                    $day = (int)$dateParts[1];
                    $year = (int)$dateParts[2];
                    
                    // Handle time format (remove AM/PM if present)
                    $timeStr = preg_replace('/\s*(AM|PM)/i', '', $timeStr);
                    $timeParts = explode(':', $timeStr);
                    $hour = (int)$timeParts[0];
                    $minute = (int)$timeParts[1];
                    
                    // Create Carbon instance in the target timezone
                    return \Carbon\Carbon::create($year, $month, $day, $hour, $minute, 0, $targetTimezone);
                }
            } else {
                // Format: YYYY-MM-DD - parse in target timezone
                return \Carbon\Carbon::parse($dateStr . ' ' . $timeStr, $targetTimezone);
            }
        } catch (\Exception $e) {
            Log::error("Error parsing appointment date/time", [
                'date' => $dateStr,
                'time' => $timeStr,
                'timezone' => $userTimezone,
                'error' => $e->getMessage()
            ]);
            return null;
        }
        
        return null;
    }
} 