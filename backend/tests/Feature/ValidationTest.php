<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

class ValidationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_registration_validation()
    {
        // Test valid registration
        $validData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'patient',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'country' => 'Nigeria',
            'city' => 'Lagos',
        ];

        $response = $this->postJson('/api/register', $validData);
        $response->assertStatus(200);

        // Test missing required fields
        $missingFields = [
            'first_name' => '',
            'last_name' => '',
            'email' => '',
            'password' => '',
            'password_confirmation' => '',
            'role' => '',
            'date_of_birth' => '',
            'gender' => '',
            'country' => '',
            'city' => '',
        ];
        $response = $this->postJson('/api/register', $missingFields);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'first_name', 'last_name', 'email', 'password', 'role', 'date_of_birth', 'gender', 'country', 'city'
        ]);

        // Test invalid email
        $invalidData = $validData;
        $invalidData['email'] = 'invalid-email';
        $response = $this->postJson('/api/register', $invalidData);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);

        // Test weak password
        $weakPasswordData = $validData;
        $weakPasswordData['password'] = '123';
        $weakPasswordData['password_confirmation'] = '123';
        $response = $this->postJson('/api/register', $weakPasswordData);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);
    }

    public function test_appointment_validation()
    {
        $user = User::factory()->create([
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

        // Test valid appointment creation
        $validData = [
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDays(1)->format('Y-m-d'),
            'appointment_time' => '10:00',
            'status' => 0
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/appointments', $validData);
        $response->assertStatus(201);

        // Test invalid doctor_id
        $invalidData = $validData;
        $invalidData['doctor_id'] = 999;
        
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/appointments', $invalidData);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['doctor_id']);
    }
} 