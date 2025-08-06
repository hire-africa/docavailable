<?php

namespace Database\Seeders;

use App\Models\WorkingHours;
use App\Models\User;
use Illuminate\Database\Seeder;

class WorkingHoursSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all doctors
        $doctors = User::where('user_type', 'doctor')->get();

        foreach ($doctors as $doctor) {
            // Standard working hours for each doctor
            $workingHours = [
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Monday',
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                ],
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Tuesday',
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                ],
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Wednesday',
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                ],
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Thursday',
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                ],
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Friday',
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                ],
                [
                    'doctor_id' => $doctor->id,
                    'day' => 'Saturday',
                    'start_time' => '10:00:00',
                    'end_time' => '14:00:00',
                ],
            ];

            foreach ($workingHours as $hours) {
                WorkingHours::create($hours);
            }
        }
    }
} 