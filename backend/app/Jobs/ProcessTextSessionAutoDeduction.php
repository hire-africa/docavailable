<?php

namespace App\Jobs;

use App\Models\TextSession;
use App\Services\DoctorPaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessTextSessionAutoDeduction implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $sessionId;
    public $expectedDeductionCount;
    public $tries = 3;
    public $timeout = 60;

    public function __construct($sessionId, $expectedDeductionCount)
    {
        $this->sessionId = $sessionId;
        $this->expectedDeductionCount = $expectedDeductionCount;
    }

    public function handle()
    {
        $session = TextSession::find($this->sessionId);
        
        if (!$session || $session->status !== TextSession::STATUS_ACTIVE) {
            Log::info("Auto-deduction job skipped - session not active", ['session_id' => $this->sessionId]);
            return;
        }

        // Check if session has enough remaining sessions
        if ($session->shouldAutoEndDueToInsufficientSessions()) {
            Log::info("Auto-deduction job skipped - insufficient sessions", ['session_id' => $this->sessionId]);
            return;
        }

        // Atomic update to prevent double processing
        $updated = DB::table('text_sessions')
            ->where('id', $this->sessionId)
            ->where('status', TextSession::STATUS_ACTIVE)
            ->where('auto_deductions_processed', '<', $this->expectedDeductionCount)
            ->update([
                'auto_deductions_processed' => $this->expectedDeductionCount,
                'sessions_used' => DB::raw("sessions_used + 1"),
                'updated_at' => now()
            ]);

        if ($updated > 0) {
            $paymentService = new DoctorPaymentService();
            $paymentService->processAutoDeduction($session);
            
            Log::info("Queue-based auto-deduction processed", [
                'session_id' => $this->sessionId,
                'deductions_processed' => 1,
                'expected_count' => $this->expectedDeductionCount
            ]);
        } else {
            Log::info("Queue-based auto-deduction skipped - already processed", [
                'session_id' => $this->sessionId,
                'expected_count' => $this->expectedDeductionCount
            ]);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("Auto-deduction job failed", [
            'session_id' => $this->sessionId,
            'error' => $exception->getMessage()
        ]);
    }
}
