<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TextSession;
use App\Services\DoctorPaymentService;
use Illuminate\Support\Facades\DB;

class ProcessExpiredTextSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:process-expired-text-sessions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process expired text sessions (backup/cleanup only - lazy expiration at read-time is primary mechanism)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing expired text sessions (backup cleanup - lazy expiration is primary)...');

        // NOTE: Lazy expiration at read-time is the primary mechanism for correctness.
        // This command is for backup/cleanup only and should not be relied upon for correctness.
        // Sessions are expired lazily when read via applyLazyExpiration().
        
        // Atomic conditional update: Only expire sessions with status = waiting_for_doctor AND deadline passed
        // Never overwrite active, ended, or cancelled statuses
        $now = now();
        $expiredCount = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
            ->whereNotNull('doctor_response_deadline')
            ->where('doctor_response_deadline', '<', $now)
            ->update([
                'status' => TextSession::STATUS_EXPIRED,
                'ended_at' => $now,
                'reason' => 'Doctor did not respond within ' . (config('app.text_session_response_window') / 60) . ' minutes',
            ]);

        $this->info("Atomically expired {$expiredCount} sessions waiting for doctor with expired deadline (backup cleanup)");

        // Find active sessions that have run out of time - these should be ENDED, not expired
        // Active sessions that run out of time are handled separately (they get ended, not expired)
        $timeExpiredSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
            ->get()
            ->filter(function($session) {
                return $session->hasRunOutOfTime();
            });

        if ($expiredCount === 0 && $timeExpiredSessions->isEmpty()) {
            $this->info('No expired text sessions found.');
            return;
        }

        $processedCount = $expiredCount;
        $paymentService = new DoctorPaymentService();

        // Process active sessions that have run out of time (these get ENDED, not expired)
        foreach ($timeExpiredSessions as $session) {
            try {
                $this->info("Processing session {$session->id} (Patient: {$session->patient->first_name}, Doctor: {$session->doctor->first_name})");
                
                // Active sessions that run out of time should be ENDED, not expired
                // Use atomic conditional update to ensure we don't overwrite if status changed
                // First, lock and check the session
                $session = TextSession::where('id', $session->id)
                    ->lockForUpdate()
                    ->first();
                
                if (!$session || $session->status !== TextSession::STATUS_ACTIVE) {
                    $this->info("Session {$session->id} is no longer active, skipping");
                    continue;
                }
                
                // Process auto-deductions first, then end
                DB::transaction(function () use ($session, $paymentService) {
                        // Process any pending auto-deductions before ending
                        $elapsedMinutes = now()->diffInMinutes($session->activated_at);
                        $expectedDeductions = max(0, floor($elapsedMinutes / 10)); // Ensure non-negative
                        $alreadyProcessed = $session->auto_deductions_processed ?? 0;
                        $newDeductions = $expectedDeductions - $alreadyProcessed;

                        $this->info("Session {$session->id}: Debug - Elapsed: {$elapsedMinutes}min, Expected: {$expectedDeductions}, Already: {$alreadyProcessed}, New: {$newDeductions}");

                        if ($newDeductions > 0) {
                            $this->info("Session {$session->id}: Processing {$newDeductions} auto-deductions before ending");
                            
                            // Deduct sessions from patient's subscription
                            $patient = $session->patient;
                            $patient->subscription->decrement('text_sessions_remaining', $newDeductions);
                            
                            // Award doctor earnings
                            $earningsPerSession = 50; // $0.50 per session
                            $totalEarnings = $newDeductions * $earningsPerSession;
                            $doctor = $session->doctor;
                            $doctor->increment('wallet_balance', $totalEarnings);
                            
                            // Update session with new deductions
                            $session->update([
                                'sessions_used' => $expectedDeductions,
                                'auto_deductions_processed' => $expectedDeductions,
                            ]);
                            
                            $this->info("Session {$session->id}: {$newDeductions} sessions deducted, doctor awarded ${$totalEarnings/100}");
                        } else {
                            $this->info("Session {$session->id}: No new auto-deductions needed (already processed: {$alreadyProcessed})");
                        }
                        
                        // Now end the session with atomic conditional update
                        $endedCount = TextSession::where('id', $session->id)
                            ->where('status', TextSession::STATUS_ACTIVE)
                            ->update([
                                'status' => TextSession::STATUS_ENDED,
                                'ended_at' => now()
                            ]);
                        
                        if ($endedCount > 0) {
                            $this->info("Session {$session->id} ended successfully");
                        } else {
                            $this->info("Session {$session->id} status changed during processing, skipping end");
                        }
                    });
                
                $processedCount++;
                
            } catch (\Exception $e) {
                $this->error("Error processing session {$session->id}: " . $e->getMessage());
            }
        }

        $this->info("Completed processing expired text sessions. Processed: {$processedCount} sessions");
    }
}
