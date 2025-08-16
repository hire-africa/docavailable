<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TextSession;
use App\Services\DoctorPaymentService;

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
        $waitingExpiredSessions = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
            ->where('started_at', '<=', now()->subSeconds(90))
            ->get();

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
                    // Session ran out of time - process final deduction
                    $session->update([
                        'status' => TextSession::STATUS_ENDED,
                        'ended_at' => now()
                    ]);
                    
                    // Process final deduction
                    $sessionsToDeduct = $session->getSessionsToDeduct(true); // Manual end
                    $paymentService->processSessionEnd($session, true);
                    
                    $this->info("Session {$session->id} ran out of time - {$sessionsToDeduct} sessions deducted from patient");
                }
                
                $processedCount++;
                
            } catch (\Exception $e) {
                $this->error("Error processing session {$session->id}: " . $e->getMessage());
            }
        }

        $this->info("Completed processing expired text sessions. Processed: {$processedCount} sessions");
    }
}
