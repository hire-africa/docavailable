<?php

namespace App\Jobs;

use App\Models\CallSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PromoteCallToConnected implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $callSessionId;
    public $appointmentId;
    
    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;
    
    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = 5;

    /**
     * Create a new job instance.
     */
    public function __construct($callSessionId, $appointmentId)
    {
        $this->callSessionId = $callSessionId;
        $this->appointmentId = $appointmentId;
    }

    /**
     * Execute the job.
     * CRITICAL: This is the server-owned promotion from answered -> connected
     * Happens automatically after grace period, independent of WebRTC events
     * 
     * PRODUCTION-SAFE: Handles race conditions where call ended but connected_at was never set
     */
    public function handle(): void
    {
        Log::info("PromoteCallToConnected: Job execution started", [
            'call_session_id' => $this->callSessionId,
            'appointment_id' => $this->appointmentId,
            'attempt' => $this->attempts(),
            'max_tries' => $this->tries
        ]);

        try {
            $callSession = CallSession::where('id', $this->callSessionId)
                ->lockForUpdate()
                ->first();

            if (!$callSession) {
                Log::warning("PromoteCallToConnected: Call session not found", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId
                ]);
                return;
            }

            Log::info("PromoteCallToConnected: Call session found", [
                'call_session_id' => $this->callSessionId,
                'current_status' => $callSession->status,
                'answered_at' => $callSession->answered_at ? $callSession->answered_at->toISOString() : null,
                'connected_at' => $callSession->connected_at ? $callSession->connected_at->toISOString() : null,
                'ended_at' => $callSession->ended_at ? $callSession->ended_at->toISOString() : null,
                'is_connected' => $callSession->is_connected
            ]);

            // Idempotent: Skip if already has connected_at
            if ($callSession->connected_at) {
                Log::info("PromoteCallToConnected: Call already has connected_at - promotion already completed", [
                    'call_session_id' => $this->callSessionId,
                    'connected_at' => $callSession->connected_at->toISOString(),
                ]);
                return;
            }

            // Only promote if answered_at exists
            if (!$callSession->answered_at) {
                Log::info("PromoteCallToConnected: Call not answered yet, skipping", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId
                ]);
                return;
            }

            // Set connected_at and is_connected
            $callSession->update([
                'connected_at' => now(),
                'is_connected' => true,
            ]);

            $callSession->refresh();

            Log::info("PromoteCallToConnected: SUCCESS - Call promoted to connected", [
                'call_session_id' => $this->callSessionId,
                'appointment_id' => $this->appointmentId,
                'connected_at' => $callSession->connected_at->toISOString(),
                'answered_at' => $callSession->answered_at ? $callSession->answered_at->toISOString() : null,
                'is_connected' => $callSession->is_connected
            ]);

        } catch (\Exception $e) {
            Log::error("PromoteCallToConnected: ERROR - Exception during promotion", [
                'call_session_id' => $this->callSessionId,
                'appointment_id' => $this->appointmentId,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}

