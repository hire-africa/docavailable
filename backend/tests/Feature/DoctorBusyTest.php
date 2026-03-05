<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\TextSession;
use App\Models\CallSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Carbon\Carbon;

class DoctorBusyTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\App\Http\Middleware\ThrottleRequests::class);
    }

    /** @test */
    public function patient_cannot_start_text_session_if_doctor_busy_in_text()
    {
        $patient1 = User::factory()->create(['user_type' => 'patient']);
        $patient2 = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor', 'is_online_for_instant_sessions' => true, 'is_active' => true]);

        // Give patients subscriptions
        $plan = Plan::factory()->withTextSessions(5)->create();
        Subscription::factory()->create(['user_id' => $patient1->id, 'plan_id' => $plan->id, 'text_sessions_remaining' => 5, 'is_active' => true, 'status' => 1]);
        Subscription::factory()->create(['user_id' => $patient2->id, 'plan_id' => $plan->id, 'text_sessions_remaining' => 5, 'is_active' => true, 'status' => 1]);

        // Doctor is busy with Patient 1
        TextSession::create([
            'patient_id' => $patient1->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => now(),
        ]);

        // Patient 2 tries to start session with Doctor
        $response = $this->actingAs($patient2, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(500); // Controller catches exception and returns 500 with message
        $this->assertStringContainsString('Doctor is currently in another session', $response->json('message'));
    }

    /** @test */
    public function patient_cannot_start_text_session_if_doctor_busy_in_call()
    {
        $patient1 = User::factory()->create(['user_type' => 'patient']);
        $patient2 = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor', 'is_online_for_instant_sessions' => true, 'is_active' => true]);

        // Give Patient 2 a subscription
        $plan = Plan::factory()->withTextSessions(5)->create();
        Subscription::factory()->create(['user_id' => $patient2->id, 'plan_id' => $plan->id, 'text_sessions_remaining' => 5, 'is_active' => true, 'status' => 1]);

        // Doctor is busy in a call with Patient 1
        CallSession::create([
            'patient_id' => $patient1->id,
            'doctor_id' => $doctor->id,
            'status' => CallSession::STATUS_ACTIVE,
            'call_type' => 'voice',
            'appointment_id' => 'direct_session_123',
            'started_at' => now(),
        ]);

        // Patient 2 tries to start text session with Doctor
        $response = $this->actingAs($patient2, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $response->assertStatus(500);
        $this->assertStringContainsString('Doctor is currently in another session', $response->json('message'));
    }

    /** @test */
    public function patient_cannot_start_call_session_if_doctor_busy_in_text()
    {
        $patient1 = User::factory()->create(['user_type' => 'patient']);
        $patient2 = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor', 'is_online_for_instant_sessions' => true, 'is_active' => true]);

        // Give Patient 2 a subscription
        Subscription::factory()->create(['user_id' => $patient2->id, 'voice_calls_remaining' => 5, 'is_active' => true, 'status' => 1]);

        // Doctor is busy with Patient 1 in text
        TextSession::create([
            'patient_id' => $patient1->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => now(),
        ]);

        // Patient 2 tries to start call session with Doctor
        $response = $this->actingAs($patient2, 'api')
            ->postJson('/api/call-sessions/start', [
                'doctor_id' => $doctor->id,
                'call_type' => 'voice'
            ]);

        $response->assertStatus(409);
        $this->assertEquals('DOCTOR_BUSY', $response->json('error_code'));
        $this->assertStringContainsString('Doctor is currently in another session', $response->json('message'));
    }

    /** @test */
    public function patient_cannot_start_call_session_if_doctor_busy_in_call()
    {
        $patient1 = User::factory()->create(['user_type' => 'patient']);
        $patient2 = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor', 'is_online_for_instant_sessions' => true, 'is_active' => true]);

        // Give Patient 2 a subscription
        Subscription::factory()->create(['user_id' => $patient2->id, 'voice_calls_remaining' => 5, 'is_active' => true, 'status' => 1]);

        // Doctor is busy in a call with Patient 1
        CallSession::create([
            'patient_id' => $patient1->id,
            'doctor_id' => $doctor->id,
            'status' => CallSession::STATUS_ACTIVE,
            'call_type' => 'voice',
            'appointment_id' => 'direct_session_123',
            'started_at' => now(),
        ]);

        // Patient 2 tries to start call session with Doctor
        $response = $this->actingAs($patient2, 'api')
            ->postJson('/api/call-sessions/start', [
                'doctor_id' => $doctor->id,
                'call_type' => 'voice'
            ]);

        $response->assertStatus(409);
        $this->assertEquals('DOCTOR_BUSY', $response->json('error_code'));
        $this->assertStringContainsString('Doctor is currently in another session', $response->json('message'));
    }
}
