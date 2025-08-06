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

class TextSessionTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Disable rate limiting for tests
        $this->withoutMiddleware(\App\Http\Middleware\ThrottleRequests::class);
    }

    /** @test */
    public function patient_can_get_available_doctors()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create online doctors
        $onlineDoctor1 = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true,
            'specialization' => 'Cardiology'
        ]);

        $onlineDoctor2 = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true,
            'specialization' => 'Dermatology'
        ]);

        // Create offline doctor
        $offlineDoctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => false,
            'is_active' => true
        ]);

        $response = $this->actingAs($patient, 'api')
            ->getJson('/api/text-sessions/available-doctors');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'first_name',
                        'last_name',
                        'specialization',
                        'years_of_experience',
                        'professional_bio',
                        'last_online_at'
                    ]
                ]
            ]);

        $this->assertCount(2, $response->json('data'));
        $this->assertTrue($response->json('success'));
    }

    /** @test */
    public function patient_can_start_text_session_with_available_doctor()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true,
            'specialization' => 'Cardiology'
        ]);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'session_id',
                    'doctor' => [
                        'id',
                        'name',
                        'specialization',
                        'response_time'
                    ],
                    'session_info' => [
                        'started_at',
                        'total_duration_minutes',
                        'sessions_used',
                        'sessions_remaining'
                    ]
                ]
            ]);

        $this->assertTrue($response->json('success'));
        $this->assertEquals(2, $response->json('data.doctor.response_time'));
        $this->assertEquals(10, $response->json('data.session_info.total_duration_minutes'));

        // Check that session was created
        $this->assertDatabaseHas('text_sessions', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'active',
            'sessions_used' => 1
        ]);

        // Check that text sessions were deducted
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $patient->id,
            'text_sessions_remaining' => 2
        ]);
    }

    /** @test */
    public function patient_cannot_start_session_without_text_sessions_remaining()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with no remaining sessions
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 0
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'No text sessions remaining in your subscription'
            ]);
    }

    /** @test */
    public function patient_cannot_start_session_with_unavailable_doctor()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an offline doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => false,
            'is_active' => true
        ]);

        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Doctor is not available for instant sessions'
            ]);
    }

    /** @test */
    public function patient_cannot_start_multiple_sessions()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create online doctors
        $doctor1 = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        $doctor2 = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start first session
        $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor1->id
            ]);

        // Try to start second session
        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor2->id
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'You already have an active text session'
            ]);
    }

    /** @test */
    public function doctor_cannot_start_session_when_already_in_session()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create patients with subscription
        $patient1 = User::factory()->create(['role' => 'patient']);
        $patient2 = User::factory()->create(['role' => 'patient']);
        
        $subscription1 = Subscription::factory()->create([
            'user_id' => $patient1->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);
        
        $subscription2 = Subscription::factory()->create([
            'user_id' => $patient2->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start first session
        $this->actingAs($patient1, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        // Try to start second session with same doctor
        $response = $this->actingAs($patient2, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Doctor is currently in another session'
            ]);
    }

    /** @test */
    public function user_can_end_active_session()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start session
        $startResponse = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $sessionId = $startResponse->json('data.session_id');

        // End session
        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/end', [
                'session_id' => $sessionId
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Session ended successfully'
            ]);

        // Check that session was ended
        $this->assertDatabaseHas('text_sessions', [
            'id' => $sessionId,
            'status' => 'ended'
        ]);
    }

    /** @test */
    public function doctor_can_toggle_online_status()
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => false
        ]);

        $response = $this->actingAs($doctor, 'api')
            ->postJson('/api/text-sessions/toggle-online');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_online',
                    'last_online_at'
                ]
            ]);

        $this->assertTrue($response->json('data.is_online'));

        // Toggle off
        $response2 = $this->actingAs($doctor, 'api')
            ->postJson('/api/text-sessions/toggle-online');

        $this->assertFalse($response2->json('data.is_online'));
    }

    /** @test */
    public function patient_can_get_active_session()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start session
        $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        // Get active session
        $response = $this->actingAs($patient, 'api')
            ->getJson('/api/text-sessions/active');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'session_id',
                    'status',
                    'started_at',
                    'remaining_time_minutes',
                    'total_duration_minutes',
                    'sessions_used',
                    'patient',
                    'doctor',
                    'response_time'
                ]
            ]);

        $this->assertTrue($response->json('success'));
        $this->assertEquals(10, $response->json('data.total_duration_minutes'));
        $this->assertEquals(2, $response->json('data.response_time'));
    }

    /** @test */
    public function user_can_update_session_activity()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start session
        $startResponse = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $sessionId = $startResponse->json('data.session_id');

        // Update activity
        $response = $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/activity', [
                'session_id' => $sessionId
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'remaining_time_minutes',
                    'last_activity_at'
                ]
            ]);

        $this->assertTrue($response->json('success'));
    }

    /** @test */
    public function user_can_get_session_history()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Create some past sessions
        TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'ended',
            'started_at' => Carbon::now()->subDays(1),
            'ended_at' => Carbon::now()->subDays(1)->addMinutes(10)
        ]);

        TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'expired',
            'started_at' => Carbon::now()->subDays(2),
            'ended_at' => Carbon::now()->subDays(2)->addMinutes(10)
        ]);

        $response = $this->actingAs($patient, 'api')
            ->getJson('/api/text-sessions/history');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'patient_id',
                            'doctor_id',
                            'status',
                            'started_at',
                            'ended_at',
                            'patient',
                            'doctor'
                        ]
                    ]
                ]
            ]);

        $this->assertTrue($response->json('success'));
        $this->assertCount(2, $response->json('data.data'));
    }
} 