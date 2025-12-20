<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CallSession;
use App\Jobs\PromoteCallToConnected;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * PRODUCTION-SAFE: Fallback command to promote calls that missed the queue job
 * Runs every minute to catch any calls that:
 * - Were answered but never got connected_at set
 * - Ended but connected_at is missing (race condition fix)
 * 
 * This ensures billing correctness even if queues are down
 */
class PromoteMissedCallConnections extends Command
{
    protected $signature = 'calls:promote-missed-connections {--debug : Show detailed debug information}';
    protected $description = 'Promote answered calls to connected that missed the queue job (fallback for queue reliability)';

    public function handle()
    {
        $this->info('🔄 Checking for missed call promotions...');
        $debug = $this->option('debug');
        
        $promotedCount = 0;
        $errorCount = 0;
        
        // Find calls that:
        // 1. Are answered but missing connected_at (more than 5 seconds after answered_at)
        // 2. Are ended but missing connected_at (race condition fix)
        $now = now();
        
        // Case 1: Answered calls without connected_at (grace period expired)
        $answeredWithoutConnected = CallSession::where('status', CallSession::STATUS_ANSWERED)
            ->whereNotNull('answered_at')
            ->whereNull('connected_at')
            ->where('answered_at', '<=', $now->copy()->subSeconds(5))
            ->get();
            
        // Case 2: Ended calls without connected_at (race condition - billing correctness)
        $endedWithoutConnected = CallSession::where('status', CallSession::STATUS_ENDED)
            ->whereNotNull('answered_at')
            ->whereNotNull('ended_at')
            ->whereNull('connected_at')
            ->get();
        
        $totalToPromote = $answeredWithoutConnected->count() + $endedWithoutConnected->count();
        
        if ($debug) {
            $this->info("Found {$totalToPromote} calls needing promotion:");
            $this->info("  - {$answeredWithoutConnected->count()} answered without connected_at");
            $this->info("  - {$endedWithoutConnected->count()} ended without connected_at (race condition)");
        }
        
        // Process answered calls
        foreach ($answeredWithoutConnected as $session) {
            try {
                $elapsed = $session->answered_at->diffInSeconds($now);
                
                if ($debug) {
                    $this->line("Promoting session {$session->id}: answered {$elapsed} seconds ago");
                }
                
                // Use direct promotion (bypass queue for reliability)
                $this->promoteCallDirectly($session);
                $promotedCount++;
                
                Log::info("PromoteMissedCallConnections: Promoted answered call", [
                    'call_session_id' => $session->id,
                    'appointment_id' => $session->appointment_id,
                    'elapsed_seconds' => $elapsed
                ]);
                
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("❌ Error promoting session {$session->id}: " . $e->getMessage());
                Log::error("PromoteMissedCallConnections: Error promoting answered call", [
                    'call_session_id' => $session->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // Process ended calls (race condition fix)
        foreach ($endedWithoutConnected as $session) {
            try {
                if ($debug) {
                    $this->line("Fixing race condition for session {$session->id}: ended but missing connected_at");
                }
                
                // Use direct promotion (bypass queue for reliability)
                $this->promoteCallDirectly($session);
                $promotedCount++;
                
                Log::warning("PromoteMissedCallConnections: Fixed race condition - promoted ended call", [
                    'call_session_id' => $session->id,
                    'appointment_id' => $session->appointment_id,
                    'answered_at' => $session->answered_at->toISOString(),
                    'ended_at' => $session->ended_at->toISOString()
                ]);
                
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("❌ Error fixing race condition for session {$session->id}: " . $e->getMessage());
                Log::error("PromoteMissedCallConnections: Error fixing race condition", [
                    'call_session_id' => $session->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        $this->info("📊 Summary: {$promotedCount} promoted, {$errorCount} errors");
        
        if ($promotedCount > 0) {
            Log::info("PromoteMissedCallConnections: Completed", [
                'promoted' => $promotedCount,
                'errors' => $errorCount
            ]);
        }
        
        return 0;
    }
    
    /**
     * Direct promotion (bypasses queue for reliability)
     * Used as fallback when queue may be down
     */
    private function promoteCallDirectly(CallSession $session): void
    {
        DB::transaction(function () use ($session) {
            $session = CallSession::where('id', $session->id)
                ->lockForUpdate()
                ->first();
            
            if (!$session) {
                return;
            }
            
            // If already has connected_at, skip
            if ($session->connected_at) {
                return;
            }
            
            // RACE CONDITION: If ended but missing connected_at, use answered_at
            if ($session->ended_at && $session->answered_at) {
                $session->update([
                    'status' => CallSession::STATUS_ACTIVE,
                    'is_connected' => true,
                    'connected_at' => $session->answered_at,
                ]);
                // Set back to ended if it was ended
                if ($session->ended_at) {
                    $session->update(['status' => CallSession::STATUS_ENDED]);
                }
            } else if ($session->status === CallSession::STATUS_ANSWERED) {
                // Normal promotion
                $session->markAsConnected();
            }
        });
    }
}

