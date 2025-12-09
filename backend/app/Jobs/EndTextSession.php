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

class EndTextSession implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $sessionId;
    public $reason;
    public $tries = 3;
    public $timeout = 60;

    public function __construct($sessionId, $reason = 'time_expired')
    {
        $this->sessionId = $sessionId;
        $this->reason = $reason;
    }

    public function handle()
    {
        $session = TextSession::find($this->sessionId);
        
        if (!$session || $session->status !== TextSession::STATUS_ACTIVE) {
            Log::info("End session job skipped - session not active", [
                'session_id' => $this->sessionId,
                'reason' => $this->reason
            ]);
            return;
        }

        // Atomic update to prevent double ending
        $updated = DB::table('text_sessions')
            ->where('id', $this->sessionId)
            ->where('status', TextSession::STATUS_ACTIVE)
            ->update([
                'status' => TextSession::STATUS_ENDED,
                'ended_at' => now(),
                'reason' => $this->reason,
                'updated_at' => now()
            ]);

        if ($updated > 0) {
            $paymentService = new DoctorPaymentService();
            $paymentService->processSessionEnd($session, true);
            
            Log::info("Queue-based session ending processed", [
                'session_id' => $this->sessionId,
                'reason' => $this->reason
            ]);
        } else {
            Log::info("Queue-based session ending skipped - already ended", [
                'session_id' => $this->sessionId,
                'reason' => $this->reason
            ]);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("End session job failed", [
            'session_id' => $this->sessionId,
            'reason' => $this->reason,
            'error' => $exception->getMessage()
        ]);
    }
}
