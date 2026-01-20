<?php

namespace App\Services;

use App\Models\TextSession;
use App\Models\CallSession;
use App\Models\User;
use App\Models\Subscription;
use App\Services\MessageStorageService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Session Creation Service
 * 
 * Reusable service for creating sessions (text or call) that can be used by:
 * - Talk Now controllers (source=INSTANT)
 * - Appointment auto-start job (source=APPOINTMENT)
 * 
 * Architecture:
 * - Thin orchestration wrapper around existing session creation logic
 * - No side effects beyond what existing controllers do
 * - Preserves existing billing/socket/payout behavior
 * - Accepts source parameter but does not branch behavior on it yet
 */
class SessionCreationService
{
    protected $messageStorageService;
    protected $notificationService;

    public function __construct(
        MessageStorageService $messageStorageService,
        NotificationService $notificationService
    ) {
        $this->messageStorageService = $messageStorageService;
        $this->notificationService = $notificationService;
    }

    /**
     * Create a text session
     * 
     * @param int $patientId
     * @param int $doctorId
     * @param string|null $reason
     * @param string $source 'INSTANT' | 'APPOINTMENT'
     * @param int|null $appointmentId Optional appointment ID for appointment-based sessions
     * @return array ['success' => bool, 'session' => TextSession|null, 'message' => string]
     */
    public function createTextSession(
        int $patientId,
        int $doctorId,
        ?string $reason = null,
        string $source = 'INSTANT',
        ?int $appointmentId = null
    ): array {
        try {
            // Get patient's subscription
            $subscription = Subscription::where('user_id', $patientId)
                ->where('is_active', true)
                ->first();

            if (!$subscription) {
                return [
                    'success' => false,
                    'session' => null,
                    'message' => 'No active subscription found for patient'
                ];
            }

            $sessionsRemaining = $subscription->text_sessions_remaining;

            if ($sessionsRemaining <= 0) {
                return [
                    'success' => false,
                    'session' => null,
                    'message' => 'You have no text sessions remaining in your subscription. Please upgrade your plan or wait for renewal.'
                ];
            }

            // Use transaction to ensure atomicity and prevent race conditions
            $windowSeconds = (int) config('app.text_session_response_window', 300);

            $textSession = DB::transaction(function () use ($patientId, $doctorId, $reason, $sessionsRemaining, $appointmentId, $windowSeconds) {
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
                $sessionData = [
                    'patient_id' => $patientId,
                    'doctor_id' => $doctorId,
                    'status' => TextSession::STATUS_WAITING_FOR_DOCTOR,
                    'started_at' => now(),
                    'last_activity_at' => now(),
                    'sessions_used' => 0,
                    'sessions_remaining_before_start' => $sessionsRemaining,
                    'reason' => $reason,
                    'doctor_response_deadline' => null, // Set to null initially - will be set when patient sends first message
                ];

                // Add appointment_id if provided (for appointment-based sessions)
                if ($appointmentId !== null) {
                    $sessionData['appointment_id'] = $appointmentId;
                }

                $textSession = TextSession::create($sessionData);

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

            // Clear any existing message cache for this text session
            try {
                $this->messageStorageService->clearMessages($textSessionId, 'text_session');
                Log::info("Cleared message cache for new text session", [
                    'text_session_id' => $textSessionId,
                    'patient_id' => $patientId,
                    'doctor_id' => $doctorId,
                    'source' => $source,
                    'appointment_id' => $appointmentId,
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
            // Note: This preserves existing notification behavior
            $this->notificationService->sendTextSessionNotification($session, 'started', 'Your text session has started');

            Log::info("Text session created successfully", [
                'session_id' => $textSessionId,
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'source' => $source,
                'appointment_id' => $appointmentId,
            ]);

            return [
                'success' => true,
                'session' => $session,
                'message' => 'Text session started successfully'
            ];

        } catch (\Exception $e) {
            Log::error("Error creating text session", [
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'source' => $source,
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'session' => null,
                'message' => 'Failed to start text session: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create a call session
     * 
     * @param int $patientId
     * @param int $doctorId
     * @param string $callType 'voice' | 'video'
     * @param string $appointmentId Appointment ID (can be direct_session_* for instant calls)
     * @param string|null $reason
     * @param string $source 'INSTANT' | 'APPOINTMENT'
     * @return array ['success' => bool, 'session' => CallSession|null, 'message' => string]
     */
    public function createCallSession(
        int $patientId,
        int $doctorId,
        string $callType,
        string $appointmentId,
        ?string $reason = null,
        string $source = 'INSTANT'
    ): array {
        try {
            if (!in_array($callType, ['voice', 'video'])) {
                return [
                    'success' => false,
                    'session' => null,
                    'message' => 'Invalid call type. Must be voice or video'
                ];
            }

            // Get subscription for remaining sessions count
            $subscription = Subscription::where('user_id', $patientId)->first();
            $callTypeField = $callType === 'voice' ? 'voice_calls_remaining' : 'video_calls_remaining';
            $sessionsRemainingBeforeStart = $subscription ? $subscription->$callTypeField : 0;

            // Check if there's already an active call session
            $existingSession = CallSession::where('patient_id', $patientId)
                ->where('doctor_id', $doctorId)
                ->whereIn('status', [
                    CallSession::STATUS_ACTIVE,
                    CallSession::STATUS_CONNECTING,
                    CallSession::STATUS_WAITING_FOR_DOCTOR,
                    CallSession::STATUS_ANSWERED,
                ])
                ->first();

            if ($existingSession) {
                return [
                    'success' => false,
                    'session' => null,
                    'message' => 'You already have an active call session with this doctor'
                ];
            }

            // Create call session record
            $callSession = CallSession::create([
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'status' => CallSession::STATUS_CONNECTING,
                'started_at' => now(),
                'last_activity_at' => now(),
                'reason' => $reason,
                'sessions_used' => 0, // Start with 0, will be deducted after 10 minutes and on hangup
                'sessions_remaining_before_start' => $sessionsRemainingBeforeStart,
                'is_connected' => false,
                'call_duration' => 0,
            ]);

            // Notify the doctor about the incoming call via FCM
            // Note: This preserves existing notification behavior from CallSessionController
            // The notification is handled by PushNotificationService in the controller
            // For appointment-based calls, we'll send appointment-specific notifications
            // via the auto-start command's notification handler

            Log::info("Call session created successfully", [
                'session_id' => $callSession->id,
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'source' => $source,
            ]);

            return [
                'success' => true,
                'session' => $callSession,
                'message' => 'Call session started successfully'
            ];

        } catch (\Exception $e) {
            Log::error("Error creating call session", [
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'call_type' => $callType,
                'appointment_id' => $appointmentId,
                'source' => $source,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'session' => null,
                'message' => 'Failed to start call session: ' . $e->getMessage()
            ];
        }
    }
}
