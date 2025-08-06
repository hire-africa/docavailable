<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TextSession;
use App\Services\DoctorPaymentService;

class ProcessAutoDeductions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:process-auto-deductions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process auto-deductions for active text sessions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing auto-deductions for active text sessions...');

        $activeSessions = TextSession::whereIn('status', [
            TextSession::STATUS_ACTIVE,
            TextSession::STATUS_WAITING_FOR_DOCTOR
        ])->get();

        $processedCount = 0;
        $paymentService = new DoctorPaymentService();

        foreach ($activeSessions as $session) {
            try {
                $elapsedMinutes = $session->getElapsedMinutes();
                $autoDeductions = floor($elapsedMinutes / 10);
                
                if ($autoDeductions > 0) {
                    $success = $paymentService->processAutoDeduction($session);
                    
                    if ($success) {
                        $processedCount++;
                        $this->info("Processed auto-deduction for session {$session->id}: {$autoDeductions} sessions deducted");
                    } else {
                        $this->warn("Failed to process auto-deduction for session {$session->id}");
                    }
                }
            } catch (\Exception $e) {
                $this->error("Error processing session {$session->id}: " . $e->getMessage());
            }
        }

        $this->info("Completed processing auto-deductions. Processed: {$processedCount} sessions");
    }
} 