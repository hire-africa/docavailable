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
    protected $description = 'Process expired text sessions that haven\'t received doctor replies within 90 seconds or have run out of time';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing expired text sessions...');

        // Find sessions that have been waiting for doctor for more than 90 seconds
        // FIXED: Only expire sessions where patient has sent a message (doctor_response_deadline is set)
        $waitingExpiredSessions = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
            ->whereNotNull('doctor_response_deadline')
            ->where('doctor_response_deadline', '<=', now())
            ->get();
            
        $this->info("Found {$waitingExpiredSessions->count()} sessions waiting for doctor with expired deadline");
        
        // Log details for debugging
        foreach ($waitingExpiredSessions as $session) {
            $this->info("  Session {$session->id}: Started at {$session->started_at}, Deadline: {$session->doctor_response_deadline}");
        }

        // Find active sessions that have run out of time - FIXED: Use proper logic instead of SQL
        $timeExpiredSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
            ->get()
            ->filter(function($session) {
                return $session->hasRunOutOfTime();
            });

        $allExpiredSessions = $waitingExpiredSessions->merge($timeExpiredSessions);

        if ($allExpiredSessions->isEmpty()) {
            $this->info('No expired text sessions found.');
            return;
        }

        $this->info("Found {$allExpiredSessions->count()} expired text sessions.");

        $processedCount = 0;
        $paymentService = new DoctorPaymentService();

        foreach ($allExpiredSessions as $session) {
            try {
                $this->info("Processing session {$session->id} (Patient: {$session->patient->first_name}, Doctor: {$session->doctor->first_name})");
                
                if ($session->status === TextSession::STATUS_WAITING_FOR_DOCTOR) {
                    // Session expired waiting for doctor - no deduction
                    $session->update([
                        'status' => TextSession::STATUS_EXPIRED,
                        'ended_at' => now()
                    ]);
                    
                    $this->info("Session {$session->id} expired waiting for doctor - no session deducted from patient");
                } else {
                    // Session ran out of time - process auto-deductions first, then end
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
                        
                        // Now end the session
                        $session->update([
                            'status' => TextSession::STATUS_ENDED,
                            'ended_at' => now()
                        ]);
                        
                        $this->info("Session {$session->id} ended successfully");
                    });
                }
                
                $processedCount++;
                
            } catch (\Exception $e) {
                $this->error("Error processing session {$session->id}: " . $e->getMessage());
            }
        }

        $this->info("Completed processing expired text sessions. Processed: {$processedCount} sessions");
    }
}
