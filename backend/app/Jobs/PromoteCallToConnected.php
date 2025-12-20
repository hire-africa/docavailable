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

            // RACE-CONDITION SAFETY: If call ended but connected_at was never set, still promote it
            // This ensures billing correctness - billing depends ONLY on timestamps
            if ($callSession->ended_at && !$callSession->connected_at && $callSession->answered_at) {
                Log::warning("PromoteCallToConnected: RACE CONDITION DETECTED - Call ended but connected_at missing", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId,
                    'answered_at' => $callSession->answered_at->toISOString(),
                    'ended_at' => $callSession->ended_at->toISOString(),
                    'status' => $callSession->status
                ]);
                
                // Still promote for billing correctness - use answered_at as connected_at
                // This ensures billing can calculate duration correctly
                $callSession->update([
                    'status' => CallSession::STATUS_ACTIVE, // Set to active first
                    'is_connected' => true,
                    'connected_at' => $callSession->answered_at, // Use answered_at as connected_at
                ]);
                
                // If call was ended, set status back to ended but keep connected_at
                if ($callSession->ended_at) {
                    $callSession->update(['status' => CallSession::STATUS_ENDED]);
                }

                Log::info("PromoteCallToConnected: RACE CONDITION FIXED - Call promoted with answered_at as connected_at", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId,
                    'connected_at' => $callSession->connected_at->toISOString(),
                    'answered_at' => $callSession->answered_at->toISOString(),
                    'ended_at' => $callSession->ended_at->toISOString()
                ]);
                return;
            }

            // Normal flow: Only promote if call is still in answered state and not ended
            if ($callSession->status !== CallSession::STATUS_ANSWERED) {
                Log::info("PromoteCallToConnected: Call already in different state", [
                    'call_session_id' => $this->callSessionId,
                    'current_status' => $callSession->status,
                    'appointment_id' => $this->appointmentId,
                    'has_connected_at' => $callSession->connected_at !== null
                ]);
                
                // If already connected, log success
                if ($callSession->connected_at) {
                    Log::info("PromoteCallToConnected: Call already has connected_at - promotion already completed", [
                        'call_session_id' => $this->callSessionId,
                        'connected_at' => $callSession->connected_at->toISOString()
                    ]);
                }
                return;
            }

            // Check if call was ended before grace period expired (but no race condition)
            if ($callSession->ended_at && !$callSession->answered_at) {
                Log::info("PromoteCallToConnected: Call ended before being answered, skipping promotion", [
                    'call_session_id' => $this->callSessionId,
                    'appointment_id' => $this->appointmentId
                ]);
                return;
            }

            // Promote to connected state
            // CRITICAL: markAsConnected() uses answered_at (not now()) and checks if already set
            $callSession->markAsConnected();

            Log::info("PromoteCallToConnected: SUCCESS - Call promoted to connected (server-owned lifecycle)", [
                'call_session_id' => $this->callSessionId,
                'appointment_id' => $this->appointmentId,
                'connected_at' => $callSession->connected_at->toISOString(),
                'answered_at' => $callSession->answered_at ? $callSession->answered_at->toISOString() : null,
                'status' => $callSession->status,
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

