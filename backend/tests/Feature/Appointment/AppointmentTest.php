<?php

namespace Tests\Feature\Appointment;

use App\Models\User;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_create_appointment()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'email' => 'patient@example.com',
            'password' => bcrypt('password123'),
        ]);
        $doctor = User::factory()->create(['role' => 'doctor']);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'patient@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/appointments', [
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
        ]);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'id',
                        'patient_id',
                        'doctor_id',
                        'appointment_date',
                        'appointment_time',
                        'status',
                    ],
                ]);

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0, // PENDING
        ]);
    }

    public function test_patient_can_view_their_appointments()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'email' => 'patient@example.com',
            'password' => bcrypt('password123'),
        ]);
        $doctor = User::factory()->create(['role' => 'doctor']);

        Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0,
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'patient@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/appointments');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'data' => [
                            '*' => [
                                'id',
                                'patient_id',
                                'doctor_id',
                                'appointment_date',
                                'appointment_time',
                                'status',
                            ],
                        ],
                    ],
                ]);
    }

    public function test_doctor_can_view_their_appointments()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'email' => 'doctor@example.com',
            'password' => bcrypt('password123'),
        ]);

        Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0,
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'doctor@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/appointments');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'data' => [
                            '*' => [
                                'id',
                                'patient_id',
                                'doctor_id',
                                'appointment_date',
                                'appointment_time',
                                'status',
                            ],
                        ],
                    ],
                ]);
    }

    public function test_doctor_can_accept_appointment()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'email' => 'doctor@example.com',
            'password' => bcrypt('password123'),
        ]);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0, // PENDING
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'doctor@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 1, // CONFIRMED
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'id',
                        'status',
                    ],
                ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 1, // CONFIRMED
        ]);
    }

    public function test_doctor_can_deny_appointment()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'email' => 'doctor@example.com',
            'password' => bcrypt('password123'),
        ]);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0, // PENDING
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'doctor@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->patchJson("/api/appointments/{$appointment->id}", [
            'status' => 2, // CANCELLED
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 2, // CANCELLED
        ]);
    }

    public function test_doctor_can_propose_reschedule()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'email' => 'doctor@example.com',
            'password' => bcrypt('password123'),
        ]);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 1, // CONFIRMED
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'doctor@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/appointments/{$appointment->id}/propose-reschedule", [
            'reschedule_proposed_date' => now()->addDays(2)->format('Y-m-d'),
            'reschedule_proposed_time' => '11:00:00',
            'reschedule_reason' => 'Emergency came up',
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Reschedule proposal sent to patient',
                ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 4, // RESCHEDULE_PROPOSED
            'reschedule_proposed_date' => now()->addDays(2)->format('Y-m-d'),
            'reschedule_proposed_time' => '11:00:00',
            'reschedule_reason' => 'Emergency came up',
        ]);
    }

    public function test_patient_can_accept_reschedule()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'email' => 'patient@example.com',
            'password' => bcrypt('password123'),
        ]);
        $doctor = User::factory()->create(['role' => 'doctor']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 4, // RESCHEDULE_PROPOSED
            'reschedule_proposed_date' => now()->addDays(2)->format('Y-m-d'),
            'reschedule_proposed_time' => '11:00:00',
            'reschedule_reason' => 'Emergency came up',
            'reschedule_proposed_by' => $doctor->id,
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'patient@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/appointments/{$appointment->id}/respond-reschedule", [
            'response' => 'accept',
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Reschedule accepted',
                ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 5, // RESCHEDULE_ACCEPTED
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'appointment_time' => '11:00:00',
        ]);
    }

    public function test_patient_can_cancel_appointment()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'email' => 'patient@example.com',
            'password' => bcrypt('password123'),
        ]);
        $doctor = User::factory()->create(['role' => 'doctor']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
            'status' => 0,
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'patient@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson("/api/appointments/{$appointment->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Appointment cancelled successfully',
                ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 2, // CANCELLED
        ]);
    }

    public function test_doctor_cannot_create_appointment()
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'email' => 'doctor@example.com',
            'password' => bcrypt('password123'),
        ]);
        $otherDoctor = User::factory()->create(['role' => 'doctor']);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'doctor@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/appointments', [
            'doctor_id' => $otherDoctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00:00',
        ]);

        $response->assertStatus(403);
    }

    public function test_appointment_requires_valid_data()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'email' => 'patient@example.com',
            'password' => bcrypt('password123'),
        ]);

        // Login to get token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'patient@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/appointments', [
            'doctor_id' => 999, // Non-existent doctor
            'appointment_date' => 'invalid-date',
            'appointment_time' => '',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['doctor_id', 'appointment_date', 'appointment_time']);
    }
} 