<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use App\Models\TextSession;
use App\Services\TextSessionMessageService;

class ClearActiveSessions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:clear-active {--force : Force clear without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all active text sessions and their cached messages';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧹 Clearing Active Text Sessions');
        $this->info('===============================');

        // Get all active sessions
        $activeSessions = TextSession::whereIn('status', ['active', 'waiting_for_doctor'])
            ->get();

        if ($activeSessions->isEmpty()) {
            $this->info('✅ No active sessions found.');
            return 0;
        }

        $this->info("Found {$activeSessions->count()} active sessions:");

        foreach ($activeSessions as $session) {
            $this->line("- Session ID: {$session->id}");
            $this->line("  Status: {$session->status}");
            $this->line("  Patient: {$session->patient->first_name} {$session->patient->last_name}");
            $this->line("  Doctor: {$session->doctor->first_name} {$session->doctor->last_name}");
            $this->line("  Started: {$session->started_at}");
            $this->line("");
        }

        // Confirm before clearing
        if (!$this->option('force')) {
            if (!$this->confirm('Are you sure you want to clear all active sessions?')) {
                $this->info('❌ Operation cancelled.');
                return 0;
            }
        }

        $this->info('Clearing sessions...');

        $clearedCount = 0;

        foreach ($activeSessions as $session) {
            try {
                // Update session status to ended
                $session->update([
                    'status' => 'ended',
                    'ended_at' => now(),
                    'last_activity_at' => now()
                ]);

                $this->info("✅ Cleared session {$session->id}");
                $clearedCount++;
            } catch (\Exception $e) {
                $this->error("❌ Failed to clear session {$session->id}: {$e->getMessage()}");
            }
        }

        // Clear any remaining cache keys
        $this->info('Clearing cache keys...');
        $cacheKeys = Cache::get('text_session_cache_keys', []);
        foreach ($cacheKeys as $key) {
            Cache::forget($key);
        }
        Cache::forget('text_session_cache_keys');

        $this->info("✅ Successfully cleared {$clearedCount} active sessions!");
        $this->info('You can now start new sessions for testing.');

        return 0;
    }
} 