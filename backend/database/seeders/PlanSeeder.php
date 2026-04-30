<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing plans
        Plan::truncate();

        $plans = [
            // INDIVIDUAL PLANS (MWK)
            [
                'name' => 'Life Lite',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['2 Text Consultations', '2 Voice Calls', '1 Video Call + chat', 'Loyalty Points']),
                'currency' => 'MWK',
                'price' => 50,
                'duration' => 14,
                'status' => 1,
                'text_sessions' => 2,
                'voice_calls' => 2,
                'video_calls' => 1,
            ],
            [
                'name' => 'Life Balance',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['5 Text Consultations', '3 Voice Calls', '2 Video Calls', 'Loyalty Points']),
                'currency' => 'MWK',
                'price' => 55,
                'duration' => 21,
                'status' => 1,
                'text_sessions' => 5,
                'voice_calls' => 3,
                'video_calls' => 2,
            ],
            [
                'name' => 'Life Max',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['10 Text Consultations', '7 Voice Calls', '4 Video Calls', '7-day access to doctor', 'Priority response']),
                'currency' => 'MWK',
                'price' => 159000,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 10,
                'voice_calls' => 7,
                'video_calls' => 4,
            ],

            // INDIVIDUAL PLANS (USD)
            [
                'name' => 'Basic Life',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['video_calls' => 1, 'voice_calls' => 2, 'consultations' => 5, 'text_sessions' => 10]),
                'currency' => 'USD',
                'price' => 999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 10,
                'voice_calls' => 2,
                'video_calls' => 1,
            ],
            [
                'name' => 'Executive Life',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['video_calls' => 3, 'voice_calls' => 5, 'consultations' => 15, 'text_sessions' => 30]),
                'currency' => 'USD',
                'price' => 1999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 30,
                'voice_calls' => 5,
                'video_calls' => 3,
            ],
            [
                'name' => 'Premium Life',
                'category' => 'individual',
                'max_members' => 1,
                'features' => json_encode(['video_calls' => 5, 'voice_calls' => 10, 'consultations' => 30, 'text_sessions' => 60]),
                'currency' => 'USD',
                'price' => 3999,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 60,
                'voice_calls' => 10,
                'video_calls' => 5,
            ],

            // ENTERPRISE PLANS (MWK) - UPDATED TO PRICING V3
            [
                'name' => 'Essential',
                'category' => 'enterprise',
                'max_members' => 50,
                'features' => json_encode(['Up to 50 staff members', '10 Text Sessions', '4 Voice Calls', '1 Video Call']),
                'currency' => 'MWK',
                'price' => 130000,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 10,
                'voice_calls' => 4,
                'video_calls' => 1,
            ],
            [
                'name' => 'Standard',
                'category' => 'enterprise',
                'max_members' => 100,
                'features' => json_encode(['Up to 100 staff members', '20 Text Sessions', '8 Voice Calls', '2 Video Calls']),
                'currency' => 'MWK',
                'price' => 260000,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 20,
                'voice_calls' => 8,
                'video_calls' => 2,
            ],
            [
                'name' => 'Advanced',
                'category' => 'enterprise',
                'max_members' => 100,
                'features' => json_encode(['Up to 100 staff members', '30 Text Sessions', '15 Voice Calls', '6 Video Calls']),
                'currency' => 'MWK',
                'price' => 442000,
                'duration' => 180,
                'status' => 1,
                'text_sessions' => 30,
                'voice_calls' => 15,
                'video_calls' => 6,
            ],
            [
                'name' => 'Premium',
                'category' => 'enterprise',
                'max_members' => 200,
                'features' => json_encode(['Up to 200 staff members', '55 Text Sessions', '25 Voice Calls', '10 Video Calls']),
                'currency' => 'MWK',
                'price' => 779000,
                'duration' => 180,
                'status' => 1,
                'text_sessions' => 55,
                'voice_calls' => 25,
                'video_calls' => 10,
            ],
            [
                'name' => 'Elite',
                'category' => 'enterprise',
                'max_members' => 150,
                'features' => json_encode(['Up to 150 staff members', '60 Text Sessions', '30 Voice Calls', '12 Video Calls']),
                'currency' => 'MWK',
                'price' => 883000,
                'duration' => 365,
                'status' => 1,
                'text_sessions' => 60,
                'voice_calls' => 30,
                'video_calls' => 12,
            ],
            [
                'name' => 'Enterprise',
                'category' => 'enterprise',
                'max_members' => 300,
                'features' => json_encode(['Up to 300 staff members', '100 Text Sessions', '55 Voice Calls', '20 Video Calls']),
                'currency' => 'MWK',
                'price' => 1515000,
                'duration' => 365,
                'status' => 1,
                'text_sessions' => 100,
                'voice_calls' => 55,
                'video_calls' => 20,
            ],
            [
                'name' => 'CampusHealth',
                'category' => 'enterprise',
                'max_members' => 1000,
                'features' => json_encode(['Bulk enrollment', 'Student mental health support', 'Campus clinic integration']),
                'currency' => 'MWK',
                'price' => 0,
                'duration' => 30,
                'status' => 1,
                'text_sessions' => 0,
                'voice_calls' => 0,
                'video_calls' => 0,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::create(array_merge($plan, [
                'created_at' => now(),
                'updated_at' => now()
            ]));
        }

        // Flush cached plan responses so the API returns fresh data immediately
        Cache::forget('all_plans_with_currency');
        foreach (['Malawi', 'Zambia', 'Zimbabwe', 'Uganda', 'Tanzania', 'Kenya'] as $country) {
            foreach (['MWK', 'USD', 'ZMW', 'UGX', 'TZS', 'KES'] as $currency) {
                Cache::forget("plans_for_country_{$country}_{$currency}");
            }
        }

        $this->command->info('Plans seeded successfully! Cache cleared.');
    }
}