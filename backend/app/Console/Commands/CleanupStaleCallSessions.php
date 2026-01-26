<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CallSession;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CleanupStaleCallSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'calls:cleanup-stale-connections {--debug : Show detailed debug information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleanup call sessions that have been connecting for more than 90 seconds';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Cleaning up stale call connections...');

        $debug = $this->option('debug');

        // Find call sessions that have been in non-terminal states for more than 90 seconds
        // This catches 'connecting', 'pending', 'waiting_for_doctor' states
        $staleConnections = CallSession::whereIn('status', [
            CallSession::STATUS_CONNECTING,
            CallSession::STATUS_PENDING,
            CallSession::STATUS_WAITING_FOR_DOCTOR,
        ])
            ->where('started_at', '<=', now()->subSeconds(90))
            ->get();

        if ($debug) {
            $this->info("Found {$staleConnections->count()} stale connections");
        }

        $cleanedCount = 0;
        $errorCount = 0;

        foreach ($staleConnections as $session) {
            try {
                $elapsedSeconds = $session->started_at->diffInSeconds(now());

                if ($debug) {
                    $this->line("Session {$session->id}: connecting for {$elapsedSeconds} seconds");
                }

                // No provider joined within timeout window: treat as MISSED (retry should create a new call_session)
                $session->update([
                    'status' => CallSession::STATUS_MISSED,
                    'ended_at' => now(),
                    'failure_reason' => 'No provider joined within 90 seconds',
                    'is_connected' => false,
                    'call_duration' => 0,
                    'sessions_used' => 0, // No deduction for failed connections
                ]);

                // Notify patient that call was missed
                $patient = User::find($session->patient_id);
                if ($patient) {
                    try {
                        $patient->notify(new \App\Notifications\CallFailedNotification($session, 'No provider joined'));
                    } catch (\Exception $e) {
                        Log::warning('Failed to send call failed notification', [
                            'session_id' => $session->id,
                            'patient_id' => $patient->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                $cleanedCount++;
                $this->info("✅ Cleaned up stale connection for session {$session->id}");

                Log::info("Stale call connection cleaned up", [
                    'session_id' => $session->id,
                    'patient_id' => $session->patient_id,
                    'doctor_id' => $session->doctor_id,
                    'call_type' => $session->call_type,
                    'elapsed_seconds' => $elapsedSeconds,
                ]);

            } catch (\Exception $e) {
                $errorCount++;
                $this->error("❌ Error cleaning up session {$session->id}: " . $e->getMessage());
                Log::error("Error cleaning up stale call connection", [
                    'session_id' => $session->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("📊 Summary: {$cleanedCount} cleaned up, {$errorCount} errors");

        if ($cleanedCount > 0) {
            Log::info("Stale call connections cleanup completed", [
                'cleaned' => $cleanedCount,
                'errors' => $errorCount
            ]);
        }

        return 0;
    }
}
