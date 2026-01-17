<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Services\SessionCreationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Services\AppointmentSessionMetrics;
use Illuminate\Support\Str;

/**
 * One-Time Manual Recovery Script for Appointment Sessions
 * 
 * Architecture:
 * - Manually executable Artisan command (never automatic, not in scheduler)
 * - Requires explicit --execute flag (default is dry-run)
 * - Idempotent: uses row-level locks + transactions to prevent duplicate sessions
 * - Never affects instant sessions (only queries appointments table)
 * - Processes in batches with optional limit
 * - Fails per appointment, not all-or-nothing
 * 
 * Purpose:
 * - One-time recovery for appointments that should have had sessions created
 * - Backfills session_id for past confirmed appointments that missed auto-start
 * - Safe to re-run (idempotent)
 */
class RecoverAppointmentSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:recover-sessions 
                            {--lookback=24h : Lookback window (24h, 7d, 30d, or "all" for no limit)}
                            {--limit=100 : Maximum number of appointments to process per run}
                            {--execute : Actually execute the recovery (default is dry-run)}
                            {--debug : Show detailed debug information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'One-time manual recovery: Create sessions for past confirmed appointments that missed auto-start (dry-run by default, requires --execute)';

    protected $sessionCreationService;

    public function __construct(SessionCreationService $sessionCreationService)
    {
        parent::__construct();
        $this->sessionCreationService = $sessionCreationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = !$this->option('execute');
        $lookback = $this->option('lookback');
        $limit = (int) $this->option('limit');
        $debug = $this->option('debug');

        if ($isDryRun) {
            $this->warn('⚠️  DRY-RUN MODE - No changes will be made');
            $this->info('   Use --execute flag to actually create sessions');
            $this->newLine();
        } else {
            $this->warn('⚠️  EXECUTION MODE - Sessions will be created');
            if (!$this->confirm('Are you sure you want to proceed?', false)) {
                $this->info('Cancelled by operator');
                return 0;
            }
            $this->newLine();
        }

        // Parse lookback window
        $lookbackDate = $this->parseLookbackWindow($lookback);
        if ($lookbackDate === null && $lookback !== 'all') {
            $this->error("Invalid lookback window: {$lookback}. Use 24h, 7d, 30d, or 'all'");
            return 1;
        }

        $startTime = microtime(true);
        $runId = (string) Str::uuid();
        
        $this->info('🔄 Starting appointment session recovery...');
        $this->info("   Lookback: {$lookback}");
        $this->info("   Limit: {$limit}");
        $this->info("   Mode: " . ($isDryRun ? 'DRY-RUN' : 'EXECUTE'));
        $this->newLine();

        $now = Carbon::now('UTC');

        // Selection criteria: status=CONFIRMED, appointment_datetime_utc < now_utc(), session_id IS NULL
        $query = Appointment::where('status', Appointment::STATUS_CONFIRMED)
            ->whereNull('session_id')
            ->where('appointment_datetime_utc', '<', $now);

        // Apply lookback window if specified
        if ($lookbackDate !== null) {
            $query->where('appointment_datetime_utc', '>=', $lookbackDate);
            $this->info("   Filtering appointments from: {$lookbackDate->toDateTimeString()} UTC");
        } else {
            $this->warn('   ⚠️  No lookback limit - processing ALL past appointments');
        }

        $candidateAppointments = $query
            ->orderBy('appointment_datetime_utc', 'asc')
            ->limit($limit)
            ->get();

        if ($candidateAppointments->isEmpty()) {
            $this->info('✅ No appointments found matching criteria');
            return 0;
        }

        $this->info("📋 Found {$candidateAppointments->count()} candidate appointment(s)");
        $this->newLine();

        $stats = [
            'created' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];
        $attemptedCount = 0;

        $auditLog = [];

        foreach ($candidateAppointments as $appointment) {
            $attemptedCount++;
            
            try {
                $result = $this->processAppointment($appointment, $isDryRun, $debug, $runId);
                
                $stats[$result['action']]++;
                
                // Per-appointment event log
                $logData = [
                    'appointment_id' => $appointment->id,
                    'result' => $result['action'],
                    'session_id' => $result['session_id'] ?? null,
                    'failure_reason' => $result['reason'] ?? null,
                    'source' => 'APPOINTMENT',
                    'job_run_id' => $runId,
                ];
                
                if ($result['action'] === 'created' && !$isDryRun) {
                    // Metric: appointment_sessions_created_total (counter)
                    AppointmentSessionMetrics::recordSessionCreated(
                        $appointment->id,
                        $result['session_id'],
                        $result['modality'] ?? 'unknown'
                    );
                    Log::info('appointment_session_conversion', $logData);
                } elseif ($result['action'] === 'skipped') {
                    Log::info('appointment_session_conversion', $logData);
                }
                
                $auditLog[] = [
                    'appointment_id' => $appointment->id,
                    'appointment_datetime_utc' => $appointment->appointment_datetime_utc?->toDateTimeString(),
                    'appointment_type' => $appointment->appointment_type,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'action' => $result['action'],
                    'session_id' => $result['session_id'] ?? null,
                    'reason' => $result['reason'] ?? null,
                    'error' => $result['error'] ?? null,
                    'timestamp' => now()->toDateTimeString(),
                ];

                // Display progress
                $this->displayProgress($appointment, $result, $isDryRun, $debug);

            } catch (\Exception $e) {
                $stats['failed']++;
                $errorMsg = $e->getMessage();
                $failureReason = self::classifyFailureReason($errorMsg);
                
                // Metric: appointment_session_conversion_failed_total (counter)
                if (!$isDryRun) {
                    AppointmentSessionMetrics::recordConversionFailed(
                        $appointment->id,
                        $failureReason,
                        $errorMsg
                    );
                }
                
                // Per-appointment event log: failed
                Log::error('appointment_session_conversion', [
                    'appointment_id' => $appointment->id,
                    'result' => 'failed',
                    'session_id' => null,
                    'failure_reason' => $failureReason,
                    'error_message' => $errorMsg,
                    'source' => 'APPOINTMENT',
                    'job_run_id' => $runId,
                    'trace' => $e->getTraceAsString(),
                ]);
                
                $auditLog[] = [
                    'appointment_id' => $appointment->id,
                    'appointment_datetime_utc' => $appointment->appointment_datetime_utc?->toDateTimeString(),
                    'appointment_type' => $appointment->appointment_type,
                    'patient_id' => $appointment->patient_id,
                    'doctor_id' => $appointment->doctor_id,
                    'action' => 'failed',
                    'session_id' => null,
                    'reason' => $failureReason,
                    'error' => $errorMsg,
                    'timestamp' => now()->toDateTimeString(),
                ];

                $this->error("❌ Appointment {$appointment->id}: {$errorMsg}");
            }
        }

        // Summary
        $this->newLine();
        $this->info('📊 Summary:');
        $this->line("   Created: {$stats['created']}");
        $this->line("   Skipped: {$stats['skipped']}");
        $this->line("   Failed:  {$stats['failed']}");
        $this->newLine();

        // Audit log output
        if ($debug || !$isDryRun) {
            $this->info('📝 Audit Log (structured):');
            foreach ($auditLog as $entry) {
                $this->line(json_encode($entry, JSON_PRETTY_PRINT));
            }
        }

        // Per-run summary log
        $runtimeMs = (microtime(true) - $startTime) * 1000;
        Log::info('appointment_recovery_run', [
            'run_id' => $runId,
            'due_count' => $candidateAppointments->count(),
            'attempted_count' => $attemptedCount,
            'created_count' => $stats['created'],
            'skipped_count' => $stats['skipped'],
            'failed_count' => $stats['failed'],
            'runtime_ms' => round($runtimeMs, 2),
            'source' => 'APPOINTMENT',
            'mode' => $isDryRun ? 'dry-run' : 'execute',
            'lookback' => $lookback,
            'limit' => $limit,
        ]);

        return 0;
    }

    /**
     * Process a single appointment with idempotency guarantees
     */
    private function processAppointment(Appointment $appointment, bool $isDryRun, bool $debug, string $runId): array
    {
        // Critical: Use row-level lock + transaction for idempotency
        return DB::transaction(function () use ($appointment, $isDryRun, $debug) {
            // Re-read appointment under lock to check if session_id was set by another process
            $lockedAppointment = Appointment::where('id', $appointment->id)
                ->lockForUpdate()
                ->first();

            if (!$lockedAppointment) {
                return [
                    'action' => 'skipped',
                    'reason' => 'appointment_not_found',
                ];
            }

            // Idempotency check: if session_id is already set or status changed, skip
            if ($lockedAppointment->session_id !== null) {
                return [
                    'action' => 'skipped',
                    'reason' => 'session_id_already_set',
                    'session_id' => $lockedAppointment->session_id,
                ];
            }

            if ($lockedAppointment->status !== Appointment::STATUS_CONFIRMED) {
                return [
                    'action' => 'skipped',
                    'reason' => 'status_changed',
                    'current_status' => $lockedAppointment->status,
                ];
            }

            // Determine session modality from appointment data
            $modality = $this->determineModality($lockedAppointment);
            
            if (!$modality) {
                return [
                    'action' => 'skipped',
                    'reason' => 'unknown_modality',
                ];
            }

            if ($isDryRun) {
                return [
                    'action' => 'created',
                    'reason' => 'dry_run',
                    'modality' => $modality,
                ];
            }

            // Single authoritative call creation path is /call-sessions/start.
            // Recovery should not create call_sessions.
            if ($modality === 'call') {
                if (empty($lockedAppointment->call_unlocked_at)) {
                    $lockedAppointment->update([
                        'call_unlocked_at' => now('UTC'),
                    ]);
                }

                return [
                    'action' => 'created',
                    'session_id' => null,
                    'modality' => 'call_unlock',
                ];
            }

            // Text session recovery can still backfill the authoritative text session linkage
            $sessionResult = $this->createSessionForAppointment(
                $lockedAppointment,
                $modality
            );

            if (!$sessionResult['success']) {
                throw new \Exception($sessionResult['message']);
            }

            $session = $sessionResult['session'];
            $sessionId = $session->id;

            $lockedAppointment->update([
                'session_id' => $sessionId,
            ]);

            return [
                'action' => 'created',
                'session_id' => $sessionId,
                'modality' => $modality,
            ];
        });
    }

    /**
     * Create session for appointment using SessionCreationService
     */
    private function createSessionForAppointment(Appointment $appointment, string $modality): array
    {
        $patientId = $appointment->patient_id;
        $doctorId = $appointment->doctor_id;
        $reason = $appointment->reason ?? 'Scheduled Appointment (Recovery)';

        if ($modality === 'text') {
            $result = $this->sessionCreationService->createTextSession(
                $patientId,
                $doctorId,
                $reason,
                'APPOINTMENT', // source parameter
                $appointment->id // appointmentId parameter
            );
            
            // Return in format expected by processAppointment
            if ($result['success']) {
                return [
                    'success' => true,
                    'session' => $result['session'],
                    'message' => $result['message'],
                ];
            } else {
                return [
                    'success' => false,
                    'session' => null,
                    'message' => $result['message'],
                ];
            }
        }
    }

    /**
     * Determine session modality from appointment data
     */
    private function determineModality(Appointment $appointment): ?string
    {
        $appointmentType = $appointment->appointment_type;

        if ($appointmentType === 'text') {
            return 'text';
        } elseif (in_array($appointmentType, ['audio', 'voice'])) {
            return 'call';
        } elseif ($appointmentType === 'video') {
            return 'call';
        }

        return null;
    }

    /**
     * Parse lookback window string to Carbon date
     */
    private function parseLookbackWindow(string $lookback): ?Carbon
    {
        if ($lookback === 'all') {
            return null;
        }

        try {
            // Parse formats like "24h", "7d", "30d"
            if (preg_match('/^(\d+)(h|d)$/i', $lookback, $matches)) {
                $value = (int) $matches[1];
                $unit = strtolower($matches[2]);
                
                if ($unit === 'h') {
                    return Carbon::now('UTC')->subHours($value);
                } elseif ($unit === 'd') {
                    return Carbon::now('UTC')->subDays($value);
                }
            }
        } catch (\Exception $e) {
            // Invalid format
        }

        return null;
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

    /**
     * Display progress for a single appointment
     */
    private function displayProgress(Appointment $appointment, array $result, bool $isDryRun, bool $debug): void
    {
        $action = $result['action'];
        $prefix = $isDryRun ? '[DRY-RUN]' : '';

        if ($action === 'created') {
            if ($isDryRun) {
                $this->line("✅ {$prefix} Would create session for appointment {$appointment->id} (modality: {$result['modality']})");
            } else {
                $this->line("✅ Created session {$result['session_id']} for appointment {$appointment->id} (modality: {$result['modality']})");
            }
        } elseif ($action === 'skipped') {
            $reason = $result['reason'] ?? 'unknown';
            if ($debug) {
                $this->line("⏭️  Skipped appointment {$appointment->id}: {$reason}");
            }
        } elseif ($action === 'failed') {
            $error = $result['error'] ?? 'unknown error';
            $this->error("❌ Failed appointment {$appointment->id}: {$error}");
        }
    }
}
