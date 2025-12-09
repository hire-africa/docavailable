<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;

class SendSessionWarnings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:send-session-warnings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send session expiration warnings for active text sessions';

    /**
     * Execute the console command.
     */
    public function handle(NotificationService $notificationService): int
    {
        $this->info('Starting session expiration warnings...');
        
        try {
            $notificationService->sendSessionExpirationWarnings();
            
            $this->info('Session expiration warnings sent successfully!');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to send session warnings: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
