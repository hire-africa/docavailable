<?php

namespace Database\Factories;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ChatRoom>
 */
class ChatRoomFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'type' => $this->faker->randomElement(['private', 'group', 'text_session']),
            'description' => $this->faker->sentence(),
            'avatar' => null,
            'created_by' => User::factory(),
            'is_active' => true,
            'last_message_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ];
    }

    /**
     * Indicate that the chat room is private.
     */
    public function private(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'private',
            'name' => null,
            'description' => null,
        ]);
    }

    /**
     * Indicate that the chat room is a group.
     */
    public function group(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'group',
        ]);
    }

    /**
     * Indicate that the chat room is for text sessions.
     */
    public function textSession(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'text_session',
            'name' => null,
            'description' => null,
        ]);
    }
}
