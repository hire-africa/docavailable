<?php

namespace Database\Factories;

use App\Models\TextSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TextSession>
 */
class TextSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startedAt = $this->faker->dateTimeBetween('-1 week', 'now');
        $endedAt = $this->faker->optional(0.7)->dateTimeBetween($startedAt, '+1 hour');
        
        return [
            'patient_id' => User::factory()->create(['role' => 'patient']),
            'doctor_id' => User::factory()->create(['role' => 'doctor']),
            'status' => $this->faker->randomElement(['active', 'ended', 'expired']),
            'started_at' => $startedAt,
            'ended_at' => $endedAt,
            'last_activity_at' => $this->faker->dateTimeBetween($startedAt, $endedAt ?? 'now'),
            'sessions_used' => $this->faker->numberBetween(1, 5),
            'sessions_remaining_before_start' => $this->faker->numberBetween(0, 10),
        ];
    }

    /**
     * Indicate that the session is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'ended_at' => null,
            'last_activity_at' => Carbon::now(),
        ]);
    }

    /**
     * Indicate that the session is ended.
     */
    public function ended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ended',
            'ended_at' => Carbon::now(),
        ]);
    }

    /**
     * Indicate that the session is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'expired',
            'ended_at' => Carbon::now(),
        ]);
    }
} 