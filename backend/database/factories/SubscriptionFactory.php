<?php

namespace Database\Factories;

use App\Models\Subscription;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subscription>
 */
class SubscriptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('-1 month', 'now');
        $endDate = Carbon::parse($startDate)->addDays($this->faker->numberBetween(30, 365));
        
        return [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'plan_id' => Plan::factory(),
            'user_id' => User::factory(),
            // Column is integer in DB; use numeric status codes (1 active, 2 expired, 0 inactive)
            'status' => $this->faker->randomElement([1, 2, 0]),
            'text_sessions_remaining' => $this->faker->numberBetween(0, 10),
            'appointments_remaining' => $this->faker->numberBetween(0, 20),
        ];
    }

    /**
     * Indicate that the subscription is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 1, // 1 = active
            'end_date' => Carbon::now()->addDays(30),
        ]);
    }

    /**
     * Indicate that the subscription is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 2, // 2 = expired
            'end_date' => Carbon::now()->subDays(1),
        ]);
    }

    /**
     * Create a subscription with specific text sessions remaining.
     */
    public function withTextSessionsRemaining(int $count): static
    {
        return $this->state(fn (array $attributes) => [
            'text_sessions_remaining' => $count,
        ]);
    }
} 