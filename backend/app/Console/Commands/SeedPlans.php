<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

class SeedPlans extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'plans:seed {--force : Force seed even if plans exist}';

    /**
     * The console command description.
     */
    protected $description = 'Seed the plans table with default plans';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            // Check if plans already exist
            $existingPlans = Plan::count();
            
            if ($existingPlans > 0 && !$this->option('force')) {
                $this->info("Plans already exist ($existingPlans plans found). Use --force to overwrite.");
                return 0;
            }

            $this->info('Seeding plans...');

            // Clear existing plans if force option is used
            if ($this->option('force')) {
                $this->info('Clearing existing plans...');
                Plan::truncate();
            }

            $plans = [
                [
                    'name' => 'Basic Life',
                    'features' => json_encode([
                        'video_calls' => 1,
                        'voice_calls' => 2,
                        'consultations' => 5,
                        'text_sessions' => 10,
                        'health_records' => false,
                        'priority_support' => false
                    ]),
                    'currency' => 'USD',
                    'price' => 999,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 10,
                    'voice_calls' => 2,
                    'video_calls' => 1,
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'name' => 'Executive Life',
                    'features' => json_encode([
                        'video_calls' => 3,
                        'voice_calls' => 5,
                        'consultations' => 15,
                        'text_sessions' => 30,
                        'health_records' => true,
                        'priority_support' => false
                    ]),
                    'currency' => 'USD',
                    'price' => 1999,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 30,
                    'voice_calls' => 5,
                    'video_calls' => 3,
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'name' => 'Premium Life',
                    'features' => json_encode([
                        'video_calls' => 5,
                        'voice_calls' => 10,
                        'consultations' => 30,
                        'text_sessions' => 60,
                        'health_records' => true,
                        'priority_support' => true
                    ]),
                    'currency' => 'USD',
                    'price' => 3999,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 60,
                    'voice_calls' => 10,
                    'video_calls' => 5,
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'name' => 'Basic Life',
                    'features' => json_encode([
                        'video_calls' => 1,
                        'voice_calls' => 2,
                        'consultations' => 5,
                        'text_sessions' => 10,
                        'health_records' => false,
                        'priority_support' => false
                    ]),
                    'currency' => 'MWK',
                    'price' => 100,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 10,
                    'voice_calls' => 2,
                    'video_calls' => 1,
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'name' => 'Executive Life',
                    'features' => json_encode([
                        'video_calls' => 3,
                        'voice_calls' => 5,
                        'consultations' => 15,
                        'text_sessions' => 30,
                        'health_records' => true,
                        'priority_support' => false
                    ]),
                    'currency' => 'MWK',
                    'price' => 150,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 30,
                    'voice_calls' => 5,
                    'video_calls' => 3,
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'name' => 'Premium Life',
                    'features' => json_encode([
                        'video_calls' => 5,
                        'voice_calls' => 10,
                        'consultations' => 30,
                        'text_sessions' => 60,
                        'health_records' => true,
                        'priority_support' => true
                    ]),
                    'currency' => 'MWK',
                    'price' => 200,
                    'duration' => 30,
                    'status' => 1,
                    'text_sessions' => 60,
                    'voice_calls' => 10,
                    'video_calls' => 5,
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            ];

            foreach ($plans as $plan) {
                Plan::create($plan);
                $this->info("Created plan: {$plan['name']} ({$plan['currency']})");
            }

            $this->info('Plans seeded successfully!');
            $this->info('Total plans created: ' . count($plans));

            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to seed plans: ' . $e->getMessage());
            return 1;
        }
    }
}
