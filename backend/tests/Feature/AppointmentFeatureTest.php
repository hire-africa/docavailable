<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;

class AppointmentFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_book_appointment()
    {
        // Create a patient and a doctor
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'doctor']);

        // Act as the patient and book an appointment
        $response = $this->actingAs($patient, 'api')->postJson('/api/patient/appointments', [
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '10:00:00',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'appointment' => [
                    'id', 'doctor_id', 'patient_id', 'appointment_date', 'appointment_time', 'status',
                ]
            ]);
    }
}
