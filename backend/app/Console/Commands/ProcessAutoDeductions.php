<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TextSession;
use App\Services\DoctorPaymentService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessAutoDeductions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:process-auto-deductions {--debug : Show detailed debug information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process auto-deductions for active text sessions every 10 minutes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Processing auto-deductions for active text sessions...');
        
        $debug = $this->option('debug');
        
        // Get active sessions that have been activated
        $activeSessions = TextSession::where('status', TextSession::STATUS_ACTIVE)
            ->whereNotNull('activated_at')
            ->get();
            
        if ($debug) {
            $this->info("Found {$activeSessions->count()} active sessions");
        }
        
        $processedCount = 0;
        $skippedCount = 0;
        $errorCount = 0;
        $paymentService = new DoctorPaymentService();

        foreach ($activeSessions as $session) {
            try {
                $elapsedMinutes = $session->getElapsedMinutes();
                $expectedDeductions = floor($elapsedMinutes / 10);
                $alreadyProcessed = $session->auto_deductions_processed ?? 0;
                $newDeductions = $expectedDeductions - $alreadyProcessed;
                
                if ($debug) {
                    $this->line("Session {$session->id}: elapsed={$elapsedMinutes}m, expected={$expectedDeductions}, processed={$alreadyProcessed}, new={$newDeductions}");
                }
                
                if ($newDeductions > 0) {
                    // Process the actual deduction directly via service
                    // The service now handles atomic updates and race condition prevention
                    $success = $paymentService->processAutoDeduction($session);
                    
                    if ($success) {
                        $processedCount++;
                        $this->info("✅ Processed deduction check for session {$session->id}");
                        
                        Log::info("Scheduler auto-deduction check completed", [
                            'session_id' => $session->id,
                            'elapsed_minutes' => $elapsedMinutes,
                            'expected_deductions' => $expectedDeductions
                        ]);
                    } else {
                        $errorCount++;
                        $this->error("❌ Failed to process deduction for session {$session->id}");
                    }
                } else {
                    $skippedCount++;
                    if ($debug) {
                        $this->line("⏭️ Skipped session {$session->id} (no new deductions needed)");
                    }
                }
                
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("❌ Error processing session {$session->id}: " . $e->getMessage());
                Log::error("Auto-deduction error for session {$session->id}: " . $e->getMessage());
            }
        }

        $this->info("📊 Summary: {$processedCount} processed, {$skippedCount} skipped, {$errorCount} errors");
        
        if ($processedCount > 0) {
            Log::info("Scheduler auto-deduction completed", [
                'processed' => $processedCount,
                'skipped' => $skippedCount,
                'errors' => $errorCount
            ]);
        }
        
        return 0;
    }
} 