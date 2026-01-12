<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\TextSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Carbon\Carbon;

class ScheduledTextSessionTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\App\Http\Middleware\ThrottleRequests::class);
    }

    /** @test */
    public function patient_can_create_scheduled_text_session()
    {
        $plan = Plan::factory()->withTextSessions(5)->create();
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3,
            'is_active' => true
        ]);

        $doctor = User::factory()->create(['role' => 'doctor']);
        $scheduledAt = now()->addDays(1);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/schedule', [
                'doctor_id' => $doctor->id,
                'scheduled_at' => $scheduledAt->toDateTimeString(),
                'session_type' => 'text',
                'reason' => 'Consultation'
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'session_id',
                    'scheduled_at',
                    'session_type',
                    'text_enabled',
                    'call_enabled'
                ]
            ]);

        $this->assertDatabaseHas('text_sessions', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_SCHEDULED,
            'session_type' => 'text',
            'text_enabled' => true,
            'call_enabled' => false
        ]);
    }

    /** @test */
    public function audio_session_has_correct_flags()
    {
        $plan = Plan::factory()->withTextSessions(5)->create();
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'voice_calls_remaining' => 3,
            'is_active' => true
        ]);

        $doctor = User::factory()->create(['role' => 'doctor']);
        $scheduledAt = now()->addDays(1);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/schedule', [
                'doctor_id' => $doctor->id,
                'scheduled_at' => $scheduledAt->toDateTimeString(),
                'session_type' => 'audio',
                'reason' => 'Voice Consultation'
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('text_sessions', [
            'patient_id' => $patient->id,
            'session_type' => 'audio',
            'text_enabled' => false,
            'call_enabled' => true
        ]);
    }

    /** @test */
    public function scheduled_session_activates_at_scheduled_time()
    {
        // Setup scheduled session in the past (ready to activate)
        $session = TextSession::factory()->create([
            'status' => TextSession::STATUS_SCHEDULED,
            'scheduled_at' => now()->subMinute(),
            'session_type' => 'text'
        ]);

        // Manually trigger activation (simulating scheduler)
        $session->activateScheduledSession();

        // Refresh and check
        $session->refresh();

        $this->assertEquals(TextSession::STATUS_WAITING_FOR_DOCTOR, $session->status);
        $this->assertNotNull($session->started_at);
        $this->assertNotNull($session->doctor_response_deadline);
    }

    /** @test */
    public function cannot_schedule_without_subscription()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        // No subscription created

        $doctor = User::factory()->create(['role' => 'doctor']);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/schedule', [
                'doctor_id' => $doctor->id,
                'scheduled_at' => now()->addDay()->toDateTimeString(),
                'session_type' => 'text'
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'No active subscription found'
            ]);
    }
}
