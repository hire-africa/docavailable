<?php

namespace Database\Factories;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ChatMessage>
 */
class ChatMessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'chat_room_id' => ChatRoom::factory(),
            'sender_id' => User::factory(),
            'type' => 'text',
            'content' => $this->faker->sentence(),
            'file_name' => null,
            'file_size' => null,
            'file_type' => null,
            'file_url' => null,
            'metadata' => null,
            'reply_to_id' => null,
            'is_edited' => false,
            'edited_at' => null,
            'is_deleted' => false,
            'deleted_at' => null,
        ];
    }

    /**
     * Indicate that the message is an image.
     */
    public function image(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'image',
            'content' => 'test-image.jpg',
            'file_name' => 'test-image.jpg',
            'file_size' => '1024000',
            'file_type' => 'image/jpeg',
            'file_url' => '/storage/chat-files/test-image.jpg',
            'metadata' => ['width' => 800, 'height' => 600],
        ]);
    }

    /**
     * Indicate that the message is a file.
     */
    public function file(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'file',
            'content' => 'document.pdf',
            'file_name' => 'document.pdf',
            'file_size' => '2048000',
            'file_type' => 'application/pdf',
            'file_url' => '/storage/chat-files/document.pdf',
        ]);
    }

    /**
     * Indicate that the message is a system message.
     */
    public function system(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'system',
            'sender_id' => 1, // System user
            'content' => 'System message',
        ]);
    }

    /**
     * Indicate that the message is edited.
     */
    public function edited(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_edited' => true,
            'edited_at' => $this->faker->dateTimeBetween('-1 hour', 'now'),
        ]);
    }
}
