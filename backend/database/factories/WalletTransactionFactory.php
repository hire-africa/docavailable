<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WalletTransaction>
 */
class WalletTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'doctor_id' => User::factory()->create(['role' => 'doctor'])->id,
            'type' => $this->faker->randomElement(['credit', 'debit']),
            'amount' => $this->faker->randomFloat(2, 100, 5000),
            'description' => $this->faker->sentence(),
            'session_type' => $this->faker->randomElement(['text', 'audio', 'video']),
            'session_id' => $this->faker->numberBetween(1, 100),
            'session_table' => $this->faker->randomElement(['text_sessions', 'appointments']),
            'status' => 'completed',
            'metadata' => json_encode(['test' => true]),
        ];
    }
}
