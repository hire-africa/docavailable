<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Plan;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Only create plans if they don't exist (don't truncate in production)
        if (Plan::count() > 0) {
            return; // Skip seeding if plans already exist
        }

        // MWK Plans (for Malawi)
        Plan::create([
            'name' => 'Basic Life',
            'features' => json_encode(['3 text sessions', '1 voice call']),
            'currency' => 'MWK',
            'price' => 100,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 3,
            'voice_calls' => 1,
            'video_calls' => 0,
        ]);

        Plan::create([
            'name' => 'Executive Life',
            'features' => json_encode(['10 text sessions', '2 voice call', '1 video call']),
            'currency' => 'MWK',
            'price' => 150,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1,
        ]);

        Plan::create([
            'name' => 'Premium Life',
            'features' => json_encode(['50 text sessions', '15 voice call', '5 video calls']),
            'currency' => 'MWK',
            'price' => 200,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 50,
            'voice_calls' => 15,
            'video_calls' => 5,
        ]);

        // USD Plans (for international users)
        Plan::create([
            'name' => 'Basic Life',
            'features' => json_encode(['3 text sessions', '1 voice call']),
            'currency' => 'USD',
            'price' => 20,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 3,
            'voice_calls' => 1,
            'video_calls' => 0,
        ]);

        Plan::create([
            'name' => 'Executive Life',
            'features' => json_encode(['10 text sessions', '2 voice call', '1 video call']),
            'currency' => 'USD',
            'price' => 50,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1,
        ]);

        Plan::create([
            'name' => 'Premium Life',
            'features' => json_encode(['50 text sessions', '15 voice call', '5 video calls']),
            'currency' => 'USD',
            'price' => 200,
            'duration' => 30,
            'status' => true,
            'text_sessions' => 50,
            'voice_calls' => 15,
            'video_calls' => 5,
        ]);
    }
} 