<?php

namespace App\Jobs;

use App\Models\CallSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PromoteCallToConnected implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $callSessionId;
    public $appointmentId;
    
    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;
    
    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = 5;

    /**
     * Create a new job instance.
     */
    public function __construct($callSessionId, $appointmentId)
    {
        $this->callSessionId = $callSessionId;
        $this->appointmentId = $appointmentId;
    }

    /**
     * Execute the job.
     * CRITICAL: This is the server-owned promotion from answered -> connected
     * Happens automatically after grace period, independent of WebRTC events
     * 
     * PRODUCTION-SAFE: Handles race conditions where call ended but connected_at was never set
     */
    public function handle(): void
    {
        Log::info("PromoteCallToConnected: Job execution started", [
            'call_session_id' => $this->callSessionId,
            'appointment_id' => $this->appointmentId,
            'attempt' => $this->attempts(),
            'max_tries' => $this->tries
        ]);

        try {
            $callSession = CallSession::where('id', $this->callSessionId)
                ->lockForUpdate()
                ->first();

            if (!$callSession) {
                Log::warning("PromoteCallToConnected: Call session not found", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId
                ]);
                return;
            }

            Log::info("PromoteCallToConnected: Call session found", [
                'call_session_id' => $this->callSessionId,
                'current_status' => $callSession->status,
                'answered_at' => $callSession->answered_at ? $callSession->answered_at->toISOString() : null,
                'connected_at' => $callSession->connected_at ? $callSession->connected_at->toISOString() : null,
                'ended_at' => $callSession->ended_at ? $callSession->ended_at->toISOString() : null,
                'is_connected' => $callSession->is_connected
            ]);

            // Idempotent: Skip if already has connected_at
            if ($callSession->connected_at) {
                Log::info("PromoteCallToConnected: Call already has connected_at - promotion already completed", [
                    'call_session_id' => $this->callSessionId,
                    'connected_at' => $callSession->connected_at->toISOString(),
                ]);
                return;
            }

            // Only promote if answered_at exists
            if (!$callSession->answered_at) {
                Log::info("PromoteCallToConnected: Call not answered yet, skipping", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId
                ]);
                return;
            }

            // Promote to connected (authoritative lifecycle transition)
            // Uses model method for idempotency and consistent status handling
            $callSession->markAsConnected();

            $callSession->refresh();

            Log::info("PromoteCallToConnected: SUCCESS - Call promoted to connected", [
                'call_session_id' => $this->callSessionId,
                'appointment_id' => $this->appointmentId,
                'connected_at' => $callSession->connected_at->toISOString(),
                'answered_at' => $callSession->answered_at ? $callSession->answered_at->toISOString() : null,
                'is_connected' => $callSession->is_connected,
                'status' => $callSession->status,
            ]);

            // Send session started notifications to both patient and doctor
            try {
                $notificationService = new \App\Services\NotificationService();
                $patient = $callSession->patient;
                $doctor = $callSession->doctor;
                
                // Determine session type for display
                $sessionType = $callSession->call_type === 'voice' ? 'audio' : ($callSession->call_type === 'video' ? 'video' : 'text');
                
                if ($patient) {
                    $doctorName = $doctor ? ($doctor->first_name . ' ' . $doctor->last_name) : 'Doctor';
                    $notificationService->createNotification(
                        $patient->id,
                        'Session Started',
                        "Your {$sessionType} session with Dr. {$doctorName} has started.",
                        'session',
                        [
                            'session_type' => $sessionType,
                            'doctor_name' => $doctorName,
                            'patient_name' => $patient->first_name . ' ' . $patient->last_name,
                            'session_id' => $callSession->id,
                        ]
                    );
                }
                
                if ($doctor) {
                    $patientName = $patient ? ($patient->first_name . ' ' . $patient->last_name) : 'Patient';
                    $notificationService->createNotification(
                        $doctor->id,
                        'Session Started',
                        "Your {$sessionType} session with {$patientName} has started.",
                        'session',
                        [
                            'session_type' => $sessionType,
                            'doctor_name' => $doctor->first_name . ' ' . $doctor->last_name,
                            'patient_name' => $patientName,
                            'session_id' => $callSession->id,
                        ]
                    );
                }
            } catch (\Exception $notificationError) {
                // Log but don't fail the job if notification fails
                Log::warning("Failed to send session started notification", [
                    'call_session_id' => $this->callSessionId,
                    'error' => $notificationError->getMessage()
                ]);
            }

        } catch (\Exception $e) {
            Log::error("PromoteCallToConnected: ERROR - Exception during promotion", [
                'call_session_id' => $this->callSessionId,
                'appointment_id' => $this->appointmentId,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}

