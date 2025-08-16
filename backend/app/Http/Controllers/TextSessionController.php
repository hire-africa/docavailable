<?php

namespace App\Http\Controllers;

use App\Models\TextSession;
use App\Models\User;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TextSessionController extends Controller
{
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

            // Removed subscription check - allow all patients to start text sessions
            $subscription = Subscription::where('user_id', $patientId)
                ->where('status', 1) // 1 = active, 0 = inactive, 2 = expired
                ->where('is_active', true)
                ->first();

            // If no subscription exists, create a temporary one or use default values
            if (!$subscription) {
                // For testing purposes, we'll allow the session without subscription
                $sessionsRemaining = 10; // Default sessions
            } else {
                $sessionsRemaining = $subscription->text_sessions_remaining ?? 10;
            }

            // Check if there's already an active session between this patient and doctor
            $existingSession = TextSession::where('patient_id', $patientId)
                ->where('doctor_id', $doctorId)
                ->whereIn('status', [TextSession::STATUS_ACTIVE, TextSession::STATUS_WAITING_FOR_DOCTOR])
                ->first();

            if ($existingSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an active session with this doctor'
                ], 400);
            }

            // Reset any aborted transactions first
            try {
                DB::statement('ROLLBACK');
            } catch (Exception $e) {
                // Ignore rollback errors
            }

            // Create text session using raw SQL to avoid transaction issues
            $textSessionId = DB::select("
                INSERT INTO text_sessions (patient_id, doctor_id, status, started_at, last_activity_at, sessions_used, sessions_remaining_before_start, reason, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                RETURNING id
            ", [
                $patientId, 
                $doctorId, 
                TextSession::STATUS_WAITING_FOR_DOCTOR, 
                now(), 
                now(), 
                0, // FIXED: Start with 0 sessions used, not 1
                $sessionsRemaining, 
                $reason, 
                now(), 
                now()
            ])[0]->id;

            // Create a chat room for this session using raw SQL to avoid quoting issues
            $chatRoomName = "text_session_{$textSessionId}";
            $chatRoom = DB::select("
                INSERT INTO chat_rooms (name, type, created_at, updated_at) 
                VALUES (?, ?, ?, ?) 
                RETURNING id
            ", [$chatRoomName, 'text_session', now(), now()])[0]->id;

            // Update the text session with the chat_id
            DB::update("
                UPDATE text_sessions 
                SET chat_id = ? 
                WHERE id = ?
            ", [$chatRoom, $textSessionId]);

            // Add participants to chat room using raw SQL
            DB::insert("
                INSERT INTO chat_room_participants (chat_room_id, user_id, role, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?)
            ", [$chatRoom, $patientId, 'member', now(), now()]);

                        DB::insert("
                INSERT INTO chat_room_participants (chat_room_id, user_id, role, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?)
            ", [$chatRoom, $doctorId, 'member', now(), now()]);

            // Get the created session to calculate remaining time
            $session = TextSession::find($textSessionId);
            
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
            
            if (!$session) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Session not found'
                ], 404);
            }
            
            // Check if session has expired waiting for doctor
            if ($session->status === TextSession::STATUS_WAITING_FOR_DOCTOR) {
                // If doctor_response_deadline is not set, patient hasn't sent first message yet
                if (!$session->doctor_response_deadline) {
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
                
                if ($timeRemaining <= 0) {
                    // Auto-expire the session
                    $session->update([
                        'status' => TextSession::STATUS_EXPIRED,
                        'ended_at' => now()
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'status' => 'expired',
                        'timeRemaining' => 0,
                        'message' => 'Session expired - no session will be deducted'
                    ]);
                }
                
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
                // Auto-end the session
                $session->update([
                    'status' => TextSession::STATUS_ENDED,
                    'ended_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'status' => 'ended',
                    'timeRemaining' => 0,
                    'message' => 'Session has ended - time limit reached'
                ]);
            }
            
            // Session is active and has time remaining
            return response()->json([
                'success' => true,
                'status' => 'active',
                'timeRemaining' => 0, // No time limit for active sessions
                'remainingTimeMinutes' => $session->getRemainingTimeMinutes(),
                'remainingSessions' => $session->getRemainingSessions(),
                'message' => 'Session is active'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check response: ' . $e->getMessage()
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
            $sessionsWithTime = $sessions->map(function ($session) {
                return [
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

            // End the session first
            $session->endSession();

            // Process payment and deduction using the comprehensive service
            $paymentService = new \App\Services\DoctorPaymentService();
            $paymentResult = $paymentService->processSessionEnd($session, true); // true for manual end

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
                    'session' => $session,
                    'payment_processing' => $paymentResult
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
            
            $session = TextSession::with(['patient', 'doctor'])
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
            
            return response()->json([
                'success' => true,
                'data' => [
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
} 