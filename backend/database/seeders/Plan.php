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
        Plan::create([
            'name' => 'Basic life',
            'features' => json_encode(['3 text sessions', '1 voice call' ]),
            'currency' => 'MWK',
            'price' => 100,
            'duration' => 30,
        ]);

        Plan::create([
            'name' => 'Executive life',
            'features' => json_encode(['10 text sessions', '2 voice call', '1 video call' ]),
            'currency' => 'MWK',
            'price' => 150,
            'duration' => 30,
        ]);

        Plan::create([
            'name' => 'Premium life',
            'features' => json_encode(['50 text sessions', '15 voice call', '5 video calls' ]),
            'currency' => 'MWK',
            'price' => 200,
            'duration' => 30,
        ]);
    }
}
