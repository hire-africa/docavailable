<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ChatRoom;
use App\Models\ChatMessage;
use App\Models\ChatRoomParticipant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $otherUser;
    protected $doctor;
    protected $patient;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test users
        $this->user = User::factory()->create(['role' => 'patient']);
        $this->otherUser = User::factory()->create(['role' => 'patient']);
        $this->doctor = User::factory()->create(['role' => 'doctor']);
        $this->patient = User::factory()->create(['role' => 'patient']);
    }

    /** @test */
    public function user_can_get_their_chat_rooms()
    {
        // Create a chat room with the user as participant
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/chat/rooms');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'rooms' => [
                        '*' => [
                            'id',
                            'name',
                            'type',
                            'last_message_at',
                            'participants',
                        ]
                    ],
                    'pagination'
                ]
            ]);
    }

    /** @test */
    public function user_can_create_private_chat_with_another_user()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/chat/private', [
                'user_id' => $this->otherUser->id
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'room' => [
                        'id',
                        'type',
                        'participants'
                    ]
                ]
            ]);

        $this->assertDatabaseHas('chat_rooms', [
            'type' => 'private',
            'created_by' => $this->user->id,
        ]);

        $this->assertDatabaseHas('chat_room_participants', [
            'user_id' => $this->user->id,
            'role' => 'member',
        ]);

        $this->assertDatabaseHas('chat_room_participants', [
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);
    }

    /** @test */
    public function user_cannot_create_private_chat_with_themselves()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/chat/private', [
                'user_id' => $this->user->id
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot create chat with yourself'
            ]);
    }

    /** @test */
    public function user_can_create_group_chat()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/chat/groups', [
                'name' => 'Test Group',
                'participant_ids' => [$this->otherUser->id, $this->doctor->id],
                'description' => 'Test group description'
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'room' => [
                        'id',
                        'name',
                        'type',
                        'description',
                        'participants'
                    ]
                ]
            ]);

        $this->assertDatabaseHas('chat_rooms', [
            'name' => 'Test Group',
            'type' => 'group',
            'description' => 'Test group description',
            'created_by' => $this->user->id,
        ]);
    }

    /** @test */
    public function user_can_get_chat_room_details()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/chat/rooms/{$room->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'room' => [
                        'id',
                        'name',
                        'type',
                        'participants'
                    ]
                ]
            ]);
    }

    /** @test */
    public function user_cannot_access_chat_room_they_are_not_participant_of()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/chat/rooms/{$room->id}");

        $response->assertStatus(404);
    }

    /** @test */
    public function user_can_send_text_message_during_active_session()
    {
        // Create a text session first
        $textSession = \App\Models\TextSession::factory()->create([
            'patient_id' => $this->user->id,
            'doctor_id' => $this->otherUser->id,
            'status' => 'active',
            'started_at' => now(),
        ]);

        // Create chat room for the text session
        $room = ChatRoom::factory()->textSession()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        // Mock subscription with text sessions remaining
        $subscription = \App\Models\Subscription::factory()->create([
            'user_id' => $this->user->id,
            'text_sessions_remaining' => 5,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/messages", [
                'content' => 'Hello, this is a test message!'
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'message' => [
                        'id',
                        'content',
                        'type',
                        'sender'
                    ]
                ]
            ]);
    }

    /** @test */
    public function user_cannot_send_message_without_active_session()
    {
        $room = ChatRoom::factory()->textSession()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/messages", [
                'content' => 'Hello, this is a test message!'
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'No active text session found'
            ]);
    }

    /** @test */
    public function user_cannot_send_message_without_text_sessions_remaining()
    {
        // Create a text session
        $textSession = \App\Models\TextSession::factory()->create([
            'patient_id' => $this->user->id,
            'doctor_id' => $this->otherUser->id,
            'status' => 'active',
            'started_at' => now(),
        ]);

        // Create chat room for the text session
        $room = ChatRoom::factory()->textSession()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        // Mock subscription with no text sessions remaining
        $subscription = \App\Models\Subscription::factory()->create([
            'user_id' => $this->user->id,
            'text_sessions_remaining' => 0,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/messages", [
                'content' => 'Hello, this is a test message!'
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'No text sessions remaining in your subscription'
            ]);
    }

    /** @test */
    public function user_can_send_file_message()
    {
        Storage::fake('public');

        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $file = UploadedFile::fake()->create('document.txt', 100, 'text/plain');

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/files", [
                'file' => $file
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'message' => [
                        'id',
                        'content',
                        'type',
                        'file_name',
                        'file_url',
                        'sender'
                    ]
                ]
            ]);

        $this->assertDatabaseHas('chat_messages', [
            'chat_room_id' => $room->id,
            'sender_id' => $this->user->id,
            'type' => 'file',
            'file_name' => 'document.txt',
        ]);
    }

    /** @test */
    public function user_can_get_messages_from_chat_room()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        // Create some messages
        ChatMessage::factory()->count(5)->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/chat/rooms/{$room->id}/messages");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'messages',
                    'pagination'
                ]
            ]);
    }

    /** @test */
    public function user_can_edit_their_message()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
        ]);

        $message = ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->user->id,
            'type' => 'text',
            'content' => 'Original message',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/chat/messages/{$message->id}", [
                'content' => 'Edited message'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_messages', [
            'id' => $message->id,
            'content' => 'Edited message',
            'is_edited' => true,
        ]);
    }

    /** @test */
    public function user_cannot_edit_other_users_message()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $message = ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
            'type' => 'text',
            'content' => 'Original message',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/chat/messages/{$message->id}", [
                'content' => 'Edited message'
            ]);

        $response->assertStatus(404);
    }

    /** @test */
    public function user_can_delete_their_message()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
        ]);

        $message = ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->user->id,
            'type' => 'text',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/chat/messages/{$message->id}");

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_messages', [
            'id' => $message->id,
            'is_deleted' => true,
        ]);
    }

    /** @test */
    public function user_can_add_reaction_to_message()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $message = ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/messages/{$message->id}/reactions", [
                'reaction' => '👍'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_message_reactions', [
            'message_id' => $message->id,
            'user_id' => $this->user->id,
            'reaction' => '👍',
        ]);
    }

    /** @test */
    public function user_can_remove_reaction_from_message()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $message = ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
        ]);

        // Add reaction first
        $message->reactions()->create([
            'user_id' => $this->user->id,
            'reaction' => '👍',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/chat/messages/{$message->id}/reactions", [
                'reaction' => '👍'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('chat_message_reactions', [
            'message_id' => $message->id,
            'user_id' => $this->user->id,
            'reaction' => '👍',
        ]);
    }

    /** @test */
    public function user_can_update_typing_status()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/typing", [
                'is_typing' => true
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_room_participants', [
            'chat_room_id' => $room->id,
            'user_id' => $this->user->id,
        ]);
    }

    /** @test */
    public function user_can_search_messages()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        // Create messages with specific content
        ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
            'content' => 'Hello world message',
        ]);

        ChatMessage::factory()->create([
            'chat_room_id' => $room->id,
            'sender_id' => $this->otherUser->id,
            'content' => 'Another message',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/chat/rooms/{$room->id}/search?query=world");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'messages',
                    'pagination'
                ]
            ]);
    }

    /** @test */
    public function admin_can_add_participant_to_group_chat()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->user->id]);
        $room->participants()->attach([
            $this->user->id => ['role' => 'admin'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/participants", [
                'user_id' => $this->otherUser->id,
                'role' => 'member'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_room_participants', [
            'chat_room_id' => $room->id,
            'user_id' => $this->otherUser->id,
            'role' => 'member',
        ]);
    }

    /** @test */
    public function non_admin_cannot_add_participant_to_group_chat()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->otherUser->id]);
        $room->participants()->attach([
            $this->otherUser->id => ['role' => 'admin'],
            $this->user->id => ['role' => 'member'],
        ]);

        $newUser = User::factory()->create();

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/participants", [
                'user_id' => $newUser->id,
                'role' => 'member'
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_remove_participant_from_group_chat()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->user->id]);
        $room->participants()->attach([
            $this->user->id => ['role' => 'admin'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/chat/rooms/{$room->id}/participants", [
                'user_id' => $this->otherUser->id
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('chat_room_participants', [
            'chat_room_id' => $room->id,
            'user_id' => $this->otherUser->id,
        ]);
    }

    /** @test */
    public function admin_can_update_participant_role()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->user->id]);
        $room->participants()->attach([
            $this->user->id => ['role' => 'admin'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/chat/rooms/{$room->id}/participants/role", [
                'user_id' => $this->otherUser->id,
                'role' => 'moderator'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_room_participants', [
            'chat_room_id' => $room->id,
            'user_id' => $this->otherUser->id,
            'role' => 'moderator',
        ]);
    }

    /** @test */
    public function admin_can_toggle_participant_mute()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->user->id]);
        $room->participants()->attach([
            $this->user->id => ['role' => 'admin'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/chat/rooms/{$room->id}/participants/mute", [
                'user_id' => $this->otherUser->id
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('chat_room_participants', [
            'chat_room_id' => $room->id,
            'user_id' => $this->otherUser->id,
            'is_muted' => true,
        ]);
    }

    /** @test */
    public function muted_user_cannot_send_messages()
    {
        $room = ChatRoom::factory()->group()->create(['created_by' => $this->otherUser->id]);
        $room->participants()->attach([
            $this->otherUser->id => ['role' => 'admin'],
            $this->user->id => ['role' => 'member'],
        ]);

        // Manually set the user as muted
        ChatRoomParticipant::where('chat_room_id', $room->id)
            ->where('user_id', $this->user->id)
            ->update(['is_muted' => true]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson("/api/chat/rooms/{$room->id}/messages", [
                'content' => 'Hello, this is a test message!'
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'You are muted in this chat'
            ]);
    }

    /** @test */
    public function user_can_get_room_status()
    {
        $room = ChatRoom::factory()->create();
        $room->participants()->attach([
            $this->user->id => ['role' => 'member'],
            $this->otherUser->id => ['role' => 'member'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/chat/rooms/{$room->id}/status");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'room_id',
                    'room_type',
                    'can_send_messages',
                    'is_locked',
                    'is_active',
                    'remaining_sessions',
                    'consultation_type',
                    'session_end_time',
                    'message'
                ]
            ]);
    }
}
