<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register()
    {
        $response = $this->postJson('/api/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'patient',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'country' => 'Nigeria',
            'city' => 'Lagos',
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'role',
                        'date_of_birth',
                        'gender',
                        'country',
                        'city',
                        'id_document',
                    ],
                    'token',
                ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'role' => 'patient',
            'country' => 'Nigeria',
            'city' => 'Lagos',
        ]);
    }

    public function test_user_can_register_with_id_document()
    {
        $file = \Illuminate\Http\UploadedFile::fake()->create('id.pdf', 100, 'application/pdf');
        $response = $this->postJson('/api/register', [
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'patient',
            'date_of_birth' => '1992-02-02',
            'gender' => 'female',
            'country' => 'Kenya',
            'city' => 'Nairobi',
            'id_document' => $file,
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'role',
                        'date_of_birth',
                        'gender',
                        'country',
                        'city',
                        'id_document',
                    ],
                    'token',
                ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'role' => 'patient',
            'country' => 'Kenya',
            'city' => 'Nairobi',
        ]);
    }

    public function test_user_can_login()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure(['token']);
    }

    public function test_user_cannot_login_with_invalid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_user_can_get_their_profile()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        // First login to get a token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        // Then get profile with the token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/user');

        $response->assertStatus(200)
                ->assertJson([
                    'id' => $user->id,
                    'email' => $user->email,
                ]);
    }

    public function test_user_can_logout()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        // First login to get a token
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        // Then logout with the token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/logout');

        $response->assertStatus(200)
                ->assertJson(['message' => 'Successfully logged out']);
    }

    public function test_registration_requires_valid_data()
    {
        $response = $this->postJson('/api/register', [
            'first_name' => '',
            'last_name' => '',
            'email' => 'invalid-email',
            'password' => 'short',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'password']);
    }

    public function test_email_must_be_unique()
    {
        User::factory()->create(['email' => 'test@example.com']);

        $response = $this->postJson('/api/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
    }

    public function test_doctor_can_register()
    {
        $nationalIdFile = \Illuminate\Http\UploadedFile::fake()->create('national_id.pdf', 100, 'application/pdf');
        $medicalDegreeFile = \Illuminate\Http\UploadedFile::fake()->create('medical_degree.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/register', [
            'first_name' => 'Sarah',
            'last_name' => 'Johnson',
            'email' => 'sarah.johnson@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'doctor',
            'date_of_birth' => '1985-05-15',
            'gender' => 'female',
            'country' => 'Ghana',
            'city' => 'Accra',
            'specialization' => 'Cardiology',
            'years_of_experience' => 8,
            'professional_bio' => 'Experienced cardiologist with expertise in interventional cardiology and heart disease prevention.',
            'national_id' => $nationalIdFile,
            'medical_degree' => $medicalDegreeFile,
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'role',
                        'date_of_birth',
                        'gender',
                        'country',
                        'city',
                        'specialization',
                        'years_of_experience',
                        'professional_bio',
                        'national_id',
                        'medical_degree',
                        'medical_licence',
                    ],
                    'token',
                ]);

        $this->assertDatabaseHas('users', [
            'email' => 'sarah.johnson@example.com',
            'role' => 'doctor',
            'specialization' => 'Cardiology',
            'years_of_experience' => 8,
        ]);
    }

    public function test_doctor_can_register_with_medical_licence()
    {
        $nationalIdFile = \Illuminate\Http\UploadedFile::fake()->create('national_id.pdf', 100, 'application/pdf');
        $medicalDegreeFile = \Illuminate\Http\UploadedFile::fake()->create('medical_degree.pdf', 100, 'application/pdf');
        $medicalLicenceFile = \Illuminate\Http\UploadedFile::fake()->create('medical_licence.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/register', [
            'first_name' => 'Michael',
            'last_name' => 'Chen',
            'email' => 'michael.chen@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'doctor',
            'date_of_birth' => '1980-12-10',
            'gender' => 'male',
            'country' => 'South Africa',
            'city' => 'Cape Town',
            'specialization' => 'Neurology',
            'years_of_experience' => 12,
            'professional_bio' => 'Board-certified neurologist specializing in stroke treatment and neurological disorders.',
            'national_id' => $nationalIdFile,
            'medical_degree' => $medicalDegreeFile,
            'medical_licence' => $medicalLicenceFile,
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'role',
                        'date_of_birth',
                        'gender',
                        'country',
                        'city',
                        'specialization',
                        'years_of_experience',
                        'professional_bio',
                        'national_id',
                        'medical_degree',
                        'medical_licence',
                    ],
                    'token',
                ]);

        $this->assertDatabaseHas('users', [
            'email' => 'michael.chen@example.com',
            'role' => 'doctor',
            'specialization' => 'Neurology',
            'years_of_experience' => 12,
        ]);
    }
}
