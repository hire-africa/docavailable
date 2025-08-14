<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['Basic', 'Premium', 'Gold', 'Platinum']),
            'features' => [
                'appointments' => $this->faker->numberBetween(5, 20),
                'text_sessions' => $this->faker->numberBetween(3, 10),
                'video_calls' => $this->faker->numberBetween(2, 8),
                'priority_support' => $this->faker->boolean(),
                'health_records' => $this->faker->boolean(),
            ],
            'currency' => 'USD',
            'price' => $this->faker->numberBetween(10, 100),
            'duration' => $this->faker->randomElement([30, 90, 180, 365]), // days
            'status' => 1, // 1 = active, 0 = inactive
        ];
    }

    /**
     * Indicate that the plan is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 1, // 1 = active
        ]);
    }

    /**
     * Indicate that the plan is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 0, // 0 = inactive
        ]);
    }

    /**
     * Create a plan with specific text sessions count.
     */
    public function withTextSessions(int $count): static
    {
        return $this->state(fn (array $attributes) => [
            'features' => [
                'appointments' => $this->faker->numberBetween(5, 20),
                'text_sessions' => $count,
                'video_calls' => $this->faker->numberBetween(2, 8),
                'priority_support' => $this->faker->boolean(),
                'health_records' => $this->faker->boolean(),
            ],
        ]);
    }
} 