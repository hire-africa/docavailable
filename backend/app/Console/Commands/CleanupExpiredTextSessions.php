<?php

namespace App\Console\Commands;

use App\Models\TextSession;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CleanupExpiredTextSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'text-sessions:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired text sessions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of expired text sessions...');

        // NOTE: Active sessions should NOT be expired - they should be ended when they run out of time
        // This cleanup command should only handle waiting_for_doctor sessions with expired deadlines
        // Atomic conditional update: Only expire if status = waiting_for_doctor AND deadline passed
        $now = now();
        $expiredCount = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
            ->whereNotNull('doctor_response_deadline')
            ->where('doctor_response_deadline', '<=', $now)
            ->update([
                'status' => TextSession::STATUS_EXPIRED,
                'ended_at' => $now,
                'reason' => 'Doctor did not respond within 90 seconds',
            ]);

        $this->info("Atomically expired {$expiredCount} waiting sessions with expired deadline.");

        // Clean up stale waiting sessions (older than 24 hours) - only if no deadline set
        // Use atomic conditional update
        $staleCount = TextSession::where('status', TextSession::STATUS_WAITING_FOR_DOCTOR)
            ->where('created_at', '<', Carbon::now()->subHours(24))
            ->whereNull('doctor_response_deadline')
            ->update([
                'status' => TextSession::STATUS_EXPIRED,
                'ended_at' => $now,
                'reason' => 'Stale waiting session (older than 24 hours)',
            ]);
        
        $this->info("Cleaned up {$waitingCount} stale waiting sessions.");

        // Also clean up old ended/expired sessions (older than 30 days)
        $oldSessions = TextSession::whereIn('status', ['ended', 'expired'])
            ->where('created_at', '<', Carbon::now()->subDays(30))
            ->delete();

        $this->info("Cleaned up {$oldSessions} old text sessions.");

        return 0;
    }
} 