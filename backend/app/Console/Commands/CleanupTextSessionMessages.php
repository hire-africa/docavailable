<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use Illuminate\Support\Facades\Log;

class CleanupTextSessionMessages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'text-sessions:cleanup-messages';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired text session messages from cache';



    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting text session message cleanup...');

        try {
            // Text session cleanup temporarily disabled
            $this->info('Text session message cleanup temporarily disabled.');
            
            Log::info('Text session message cleanup job skipped - service removed');
            
            return 0;
        } catch (\Exception $e) {
            $this->error('Error during text session message cleanup: ' . $e->getMessage());
            
            Log::error('Text session message cleanup job failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return 1;
        }
    }
} 