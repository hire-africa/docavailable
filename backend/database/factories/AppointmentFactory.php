<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Appointment>
 */
class AppointmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => User::factory()->create(['role' => 'patient'])->id,
            'doctor_id' => User::factory()->create(['role' => 'doctor'])->id,
            'appointment_date' => $this->faker->dateTimeBetween('now', '+30 days'),
            'appointment_time' => $this->faker->time(),
            'status' => 0, // Default status
            'appointment_type' => $this->faker->randomElement(['text', 'audio', 'video']),
            'duration_minutes' => $this->faker->randomElement([15, 30, 45, 60]),
        ];
    }
}
