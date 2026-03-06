<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\TextSession;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class TextSessionFixTest extends TestCase
{
    // Removing RefreshDatabase to avoid the user_type column issue in sqlite

    protected $patient;
    protected $doctor;
    protected $otherUser;
    protected $sessionId;

    protected function setUp(): void
    {
        parent::setUp();

        // Clean up or find existing users to avoid migration issues
        $this->patient = User::where('role', 'patient')->first() ?: User::factory()->create(['role' => 'patient']);
        $this->doctor = User::where('role', 'doctor')->first() ?: User::factory()->create(['role' => 'doctor']);
        $this->otherUser = User::where('role', 'patient')->where('id', '!=', $this->patient->id)->first() ?: User::factory()->create(['role' => 'patient']);

        $session = TextSession::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'status' => 'active'
        ]);
        $this->sessionId = $session->id;
    }

    /** @test */
    public function it_can_retrieve_session_with_text_session_prefix()
    {
        $response = $this->actingAs($this->doctor)
            ->getJson("/api/text-session/get-session/text_session_{$this->sessionId}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $this->sessionId);
    }

    /** @test */
    public function it_can_retrieve_session_without_prefix()
    {
        $response = $this->actingAs($this->doctor)
            ->getJson("/api/text-session/get-session/{$this->sessionId}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function it_returns_404_for_invalid_id_format()
    {
        $response = $this->actingAs($this->doctor)
            ->getJson("/api/text-session/get-session/invalid_id_123");

        $response->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Invalid session ID format');
    }

    /** @test */
    public function it_enforces_authorization_on_parsed_id()
    {
        // Attempt as a user NOT in the session
        $response = $this->actingAs($this->otherUser)
            ->getJson("/api/text-session/get-session/text_session_{$this->sessionId}");

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unauthorized access to session');
    }
}
