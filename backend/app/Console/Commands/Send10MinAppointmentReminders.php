<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;

class Send10MinAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:send-10min-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send push notifications to patients and doctors 10 minutes before their appointment starts';

    /**
     * Execute the console command.
     */
    public function handle(NotificationService $notificationService): int
    {
        $this->info('Starting 10-minute appointment reminder notifications...');

        try {
            $count = $notificationService->send10MinAppointmentReminders();

            $this->info("Successfully sent 10-minute reminders for {$count} appointments!");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to send 10-minute reminders: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
