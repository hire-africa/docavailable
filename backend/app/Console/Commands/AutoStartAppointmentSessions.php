<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Services\SessionCreationService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Services\AppointmentSessionMetrics;
use Illuminate\Support\Str;

/**
 * Auto-Start Appointment Sessions Command
 * 
 * Architecture:
 * - Scheduled worker (runs every 60s via cron)
 * - Distributed lock prevents concurrent runs across multiple app instances
 * - Idempotent: uses row-level locks + transactions to prevent duplicate sessions
 * - Batch processing with hard limit to keep each tick fast
 * - Never interferes with instant sessions (only queries appointments table)
 */
class AutoStartAppointmentSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:auto-start-sessions 
                            {--limit=50 : Maximum number of appointments to process per run}
                            {--debug : Show detailed debug information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically start sessions for appointments that are due (idempotent, no instant interference)';

    protected $sessionCreationService;
    protected $notificationService;

    public function __construct(
        SessionCreationService $sessionCreationService,
        NotificationService $notificationService
    ) {
        parent::__construct();
        $this->sessionCreationService = $sessionCreationService;
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $debug = $this->option('debug');
        $limit = (int) $this->option('limit');

        // Distributed lock: ensure only one instance runs at a time
        $lock = Cache::lock('appointments:auto-start-sessions', 120); // 2 minute lock timeout

        if (!$lock->get()) {
            if ($debug) {
                $this->info('⏸️  Another instance is already running, skipping...');
            }
            return 0;
        }

        try {
            $startTime = microtime(true);
            $runId = (string) Str::uuid();
            
            $this->info('🔄 Starting appointment auto-start scan...');

            $now = Carbon::now('UTC');
            
            // Selection criteria: status=CONFIRMED, session_id IS NULL, appointment_datetime_utc <= now_utc()
            $candidateAppointments = Appointment::where('status', Appointment::STATUS_CONFIRMED)
                ->whereNull('session_id')
                ->where('appointment_datetime_utc', '<=', $now)
                ->orderBy('appointment_datetime_utc', 'asc')
                ->limit($limit)
                ->get();

            // Metric: appointments_due_count (gauge)
            $dueCount = AppointmentSessionMetrics::getDueAppointmentsCount();

            if ($candidateAppointments->isEmpty()) {
                if ($debug) {
                    $this->info('✅ No appointments due for auto-start');
                }
                
                // Per-run summary log (even when no appointments)
                $runtimeMs = (microtime(true) - $startTime) * 1000;
                Log::info('appointment_auto_start_run', [
                    'run_id' => $runId,
                    'due_count' => $dueCount,
                    'attempted_count' => 0,
                    'created_count' => 0,
                    'skipped_count' => 0,
                    'failed_count' => 0,
                    'runtime_ms' => round($runtimeMs, 2),
                    'source' => 'APPOINTMENT',
                ]);
                
                return 0;
            }

            $this->info("📋 Found {$candidateAppointments->count()} candidate appointment(s)");

            $processedCount = 0;
            $skippedCount = 0;
            $errorCount = 0;
            $attemptedCount = 0;

            foreach ($candidateAppointments as $appointment) {
                $attemptedCount++;
                
                try {
                    // Critical: Use row-level lock + transaction for idempotency
                    $result = DB::transaction(function () use ($appointment, $now, $debug, $runId) {
                        // Re-read appointment under lock to check if session_id was set by another process
                        $lockedAppointment = Appointment::where('id', $appointment->id)
                            ->lockForUpdate()
                            ->first();

                        // Idempotency check: if session_id is already set or status changed, skip
                        if ($lockedAppointment->session_id !== null) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: session_id already set, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'session_id_already_set'];
                        }

                        if ($lockedAppointment->status !== Appointment::STATUS_CONFIRMED) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: status changed to {$lockedAppointment->status}, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'status_changed'];
                        }

                        // Determine session modality from appointment data
                        $modality = $this->determineModality($lockedAppointment);
                        
                        if (!$modality) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: unable to determine modality, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'unknown_modality'];
                        }
                        
                        // Validate appointment has required data
                        if (!$lockedAppointment->patient_id || !$lockedAppointment->doctor_id) {
                            throw new \Exception('Missing doctor or patient');
                        }

                        // Create session using the shared service
                        $sessionResult = $this->createSessionForAppointment(
                            $lockedAppointment,
                            $modality
                        );

                        if (!$sessionResult['success']) {
                            // Classify failure reason and throw exception
                            $failureReason = self::classifyFailureReason($sessionResult['message']);
                            $exception = new \Exception($sessionResult['message']);
                            $exception->failureReason = $failureReason; // Store as dynamic property
                            throw $exception;
                        }

                        $session = $sessionResult['session'];
                        $sessionId = $session->id;

                        $appointmentUpdate = [
                            'session_id' => $sessionId,
                        ];

                        if ($modality !== 'text') {
                            $appointmentUpdate['status'] = Appointment::STATUS_IN_PROGRESS;
                        }

                        $lockedAppointment->update($appointmentUpdate);

                        if ($debug) {
                            $this->line("✅ Appointment {$appointment->id}: Created {$modality} session {$sessionId}");
                        }

                        return [
                            'action' => 'created',
                            'session_id' => $sessionId,
                            'modality' => $modality,
                            'session' => $session,
                        ];
                    });

                    if ($result['action'] === 'created') {
                        $processedCount++;

                        // Metric: appointment_sessions_created_total (counter)
                        AppointmentSessionMetrics::recordSessionCreated(
                            $appointment->id,
                            $result['session_id'],
                            $result['modality']
                        );

                        // Send notifications AFTER transaction commits (idempotent)
                        $this->sendNotifications($appointment, $result['session'], $result['modality']);

                        // Per-appointment event log: created
                        Log::info('appointment_session_conversion', [
                            'appointment_id' => $appointment->id,
                            'result' => 'created',
                            'session_id' => $result['session_id'],
                            'modality' => $result['modality'],
                            'source' => 'APPOINTMENT',
                            'job_run_id' => $runId,
                        ]);
                    } else {
                        $skippedCount++;
                        
                        // Per-appointment event log: skipped
                        Log::info('appointment_session_conversion', [
                            'appointment_id' => $appointment->id,
                            'result' => 'skipped',
                            'session_id' => null,
                            'failure_reason' => $result['reason'] ?? null,
                            'source' => 'APPOINTMENT',
                            'job_run_id' => $runId,
                        ]);
                    }

                } catch (\Exception $e) {
                    $errorCount++;
                    
                    // Classify failure reason (check if stored in exception, otherwise classify from message)
                    $failureReason = $e->failureReason ?? self::classifyFailureReason($e->getMessage());
                    
                    // Metric: appointment_session_conversion_failed_total (counter)
                    AppointmentSessionMetrics::recordConversionFailed(
                        $appointment->id,
                        $failureReason,
                        $e->getMessage()
                    );
                    
                    $this->error("❌ Error processing appointment {$appointment->id}: " . $e->getMessage());
                    
                    // Per-appointment event log: failed
                    Log::error('appointment_session_conversion', [
                        'appointment_id' => $appointment->id,
                        'result' => 'failed',
                        'session_id' => null,
                        'failure_reason' => $failureReason,
                        'error_message' => $e->getMessage(),
                        'source' => 'APPOINTMENT',
                        'job_run_id' => $runId,
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }

            $this->info("📊 Summary: {$processedCount} started, {$skippedCount} skipped, {$errorCount} errors");

            // Per-run summary log
            $runtimeMs = (microtime(true) - $startTime) * 1000;
            Log::info('appointment_auto_start_run', [
                'run_id' => $runId,
                'due_count' => $dueCount,
                'attempted_count' => $attemptedCount,
                'created_count' => $processedCount,
                'skipped_count' => $skippedCount,
                'failed_count' => $errorCount,
                'runtime_ms' => round($runtimeMs, 2),
                'source' => 'APPOINTMENT',
            ]);

            return 0;

        } finally {
            $lock->release();
        }
    }

    /**
     * Determine session modality from appointment data
     * 
     * @param Appointment $appointment
     * @return string|null 'text' | 'voice' | 'video' | null
     */
    protected function determineModality(Appointment $appointment): ?string
    {
        // Use appointment_type field if available
        if ($appointment->appointment_type) {
            $type = strtolower($appointment->appointment_type);
            
            // Map appointment types to session modalities
            if ($type === Appointment::TYPE_TEXT || $type === 'text') {
                return 'text';
            }
            if ($type === Appointment::TYPE_AUDIO || $type === 'audio' || $type === 'voice') {
                return 'voice';
            }
            if ($type === Appointment::TYPE_VIDEO || $type === 'video') {
                return 'video';
            }
        }

        // Default to text if modality cannot be determined
        // This is a safe default that ensures the job can still process appointments
        return 'text';
    }

    /**
     * Create session for appointment using the shared service
     * 
     * @param Appointment $appointment
     * @param string $modality 'text' | 'voice' | 'video'
     * @return array
     */
    protected function createSessionForAppointment(Appointment $appointment, string $modality): array
    {
        $patientId = $appointment->patient_id;
        $doctorId = $appointment->doctor_id;
        $reason = $appointment->reason;
        $appointmentId = $appointment->id;

        if ($modality === 'text') {
            return $this->sessionCreationService->createTextSession(
                $patientId,
                $doctorId,
                $reason,
                'APPOINTMENT',
                $appointmentId
            );
        } else {
            // For call sessions, use appointment ID as the appointment_id parameter
            // This links the call session to the appointment
            $appointmentIdString = (string) $appointmentId;
            
            return $this->sessionCreationService->createCallSession(
                $patientId,
                $doctorId,
                $modality, // 'voice' or 'video'
                $appointmentIdString,
                $reason,
                'APPOINTMENT'
            );
        }
    }

    /**
     * Send notifications to both parties (idempotent)
     * 
     * @param Appointment $appointment
     * @param mixed $session TextSession or CallSession
     * @param string $modality
     */
    protected function sendNotifications(Appointment $appointment, $session, string $modality): void
    {
        try {
            // Idempotency: Use dedup key to prevent duplicate notifications
            $dedupKey = "appointment:{$appointment->id}:session_started:{$session->id}";
            
            // Check if notification was already sent (using cache with TTL)
            // TTL of 24 hours is acceptable for appointment notifications
            if (Cache::has($dedupKey)) {
                Log::info("Notification already sent, skipping", [
                    'appointment_id' => $appointment->id,
                    'session_id' => $session->id,
                    'dedup_key' => $dedupKey,
                ]);
                return;
            }

            // Send appointment-specific notifications
            // Note: SessionCreationService already sends session notifications,
            // but we add appointment-specific context here
            $this->notificationService->sendAppointmentSessionStartedNotification(
                $appointment,
                $session,
                $modality
            );

            // Mark notification as sent (24 hour TTL)
            Cache::put($dedupKey, true, now()->addHours(24));

            Log::info("Notifications sent for appointment session start", [
                'appointment_id' => $appointment->id,
                'session_id' => $session->id,
                'modality' => $modality,
            ]);

        } catch (\Exception $e) {
            // Don't fail the job if notifications fail
            Log::warning("Failed to send appointment session notifications", [
                'appointment_id' => $appointment->id,
                'session_id' => $session->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Classify failure reason for metrics and monitoring
     * 
     * Standardized failure categories:
     * - invalid_appointment_state
     * - missing_doctor_or_patient
     * - createSession_validation_failed
     * - createSession_conflict_existing_session
     * - db_update_failed
     * - notification_failed (should not mark conversion failed if session creation succeeded)
     * 
     * @param string $errorMessage
     * @return string
     */
    protected static function classifyFailureReason(string $errorMessage): string
    {
        $errorLower = strtolower($errorMessage);
        
        if (strpos($errorLower, 'missing') !== false || strpos($errorLower, 'no active subscription') !== false) {
            return 'missing_doctor_or_patient';
        }
        
        if (strpos($errorLower, 'already have an active session') !== false || strpos($errorLower, 'existing session') !== false) {
            return 'createSession_conflict_existing_session';
        }
        
        if (strpos($errorLower, 'validation') !== false || strpos($errorLower, 'invalid') !== false) {
            return 'createSession_validation_failed';
        }
        
        if (strpos($errorLower, 'database') !== false || strpos($errorLower, 'update') !== false || strpos($errorLower, 'transaction') !== false) {
            return 'db_update_failed';
        }
        
        if (strpos($errorLower, 'notification') !== false) {
            return 'notification_failed';
        }
        
        // Default category
        return 'unknown_error';
    }
}
