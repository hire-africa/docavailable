<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DoctorWallet>
 */
class DoctorWalletFactory extends Factory
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
            'balance' => $this->faker->randomFloat(2, 0, 10000),
            'total_earned' => $this->faker->randomFloat(2, 0, 50000),
            'total_withdrawn' => $this->faker->randomFloat(2, 0, 20000),
        ];
    }
}
