<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Reviews;
use App\Models\Appointment;
use App\Models\WorkingHours;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call individual seeders
        $this->call([
            UserSeeder::class,
            PlanSeeder::class,
            WorkingHoursSeeder::class,
        ]);


    }
}
