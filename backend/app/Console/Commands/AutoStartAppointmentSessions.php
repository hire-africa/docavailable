<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
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
    protected $description = 'Unlock scheduled call appointments when within the start window (no session creation)';

    public function __construct()
    {
        parent::__construct();
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
            
            $this->info('🔄 Starting appointment call unlock scan...');

            $now = Carbon::now('UTC');
            $unlockCutoff = $now->copy()->addMinutes(15);
            
            // Selection criteria (CALLS ONLY): status=CONFIRMED, call_unlocked_at IS NULL, appointment_datetime_utc <= (now + 15min)
            $candidateAppointments = Appointment::where('status', Appointment::STATUS_CONFIRMED)
                ->whereNull('call_unlocked_at')
                ->whereIn('appointment_type', [Appointment::TYPE_AUDIO, Appointment::TYPE_VIDEO, 'voice'])
                ->where('appointment_datetime_utc', '<=', $unlockCutoff)
                ->orderBy('appointment_datetime_utc', 'asc')
                ->limit($limit)
                ->get();

            // Metric: appointments_due_count (gauge)
            $dueCount = AppointmentSessionMetrics::getDueAppointmentsCount();

            if ($candidateAppointments->isEmpty()) {
                if ($debug) {
                    $this->info('✅ No appointments due for call unlock');
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
                    $result = DB::transaction(function () use ($appointment, $now, $unlockCutoff, $debug, $runId) {
                        // Re-read appointment under lock to check if session_id was set by another process
                        $lockedAppointment = Appointment::where('id', $appointment->id)
                            ->lockForUpdate()
                            ->first();

                        // Idempotency check: if already unlocked or status changed, skip
                        if ($lockedAppointment->call_unlocked_at !== null) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: already unlocked, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'already_unlocked'];
                        }

                        if ($lockedAppointment->status !== Appointment::STATUS_CONFIRMED) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: status changed to {$lockedAppointment->status}, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'status_changed'];
                        }

                        // Only unlock audio/video appointments (calls)
                        $type = strtolower((string) ($lockedAppointment->appointment_type ?? ''));
                        if (!in_array($type, [Appointment::TYPE_AUDIO, Appointment::TYPE_VIDEO, 'voice'], true)) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: not a call appointment ({$type}), skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'not_a_call'];
                        }
                        
                        // Validate appointment has required data
                        if (!$lockedAppointment->patient_id || !$lockedAppointment->doctor_id) {
                            throw new \Exception('Missing doctor or patient');
                        }

                        // Eligibility check: appointment time reached or within unlock window
                        if (!$lockedAppointment->appointment_datetime_utc || $lockedAppointment->appointment_datetime_utc->gt($unlockCutoff)) {
                            if ($debug) {
                                $this->line("⏭️  Appointment {$appointment->id}: not yet within unlock window, skipping");
                            }
                            return ['action' => 'skipped', 'reason' => 'not_within_unlock_window'];
                        }

                        $lockedAppointment->update([
                            'call_unlocked_at' => $now,
                        ]);

                        if ($debug) {
                            $this->line("✅ Appointment {$appointment->id}: Call unlocked");
                        }

                        return [
                            'action' => 'created',
                            'modality' => 'call_unlock',
                        ];
                    });

                    if ($result['action'] === 'created') {
                        $processedCount++;

                        // Per-appointment event log: created
                        Log::info('appointment_session_conversion', [
                            'appointment_id' => $appointment->id,
                            'result' => 'created',
                            'session_id' => null,
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

            $this->info("📊 Summary: {$processedCount} unlocked, {$skippedCount} skipped, {$errorCount} errors");

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
