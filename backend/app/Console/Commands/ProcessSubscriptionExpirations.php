<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SubscriptionExpirationService;

class ProcessSubscriptionExpirations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:process-expirations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process subscription expirations and apply 30-day plan roll-over rules';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing subscription expirations...');

        try {
            $service = new SubscriptionExpirationService();
            $stats = $service->processExpirations();

            $this->info("Processing completed:");
            $this->line("  - Expired: {$stats['expired']}");
            $this->line("  - Rolled over: {$stats['rolled_over']}");
            $this->line("  - Skipped: {$stats['skipped']}");
            
            if ($stats['errors'] > 0) {
                $this->warn("  - Errors: {$stats['errors']}");
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Failed to process subscription expirations: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

