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

        // Find active sessions that have expired
        $expiredSessions = TextSession::where('status', 'active')
            ->get()
            ->filter(function ($session) {
                return $session->hasExpired();
            });

        $count = 0;
        foreach ($expiredSessions as $session) {
            $session->markAsExpired();
            $count++;
        }

        $this->info("Cleaned up {$count} expired text sessions.");

        // Also clean up old ended/expired sessions (older than 30 days)
        $oldSessions = TextSession::whereIn('status', ['ended', 'expired'])
            ->where('created_at', '<', Carbon::now()->subDays(30))
            ->delete();

        $this->info("Cleaned up {$oldSessions} old text sessions.");

        return 0;
    }
} 