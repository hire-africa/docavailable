<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'patient',
            'date_of_birth' => '1995-01-01',
            'gender' => 'other',
            'country' => 'Nigeria',
            'city' => 'Abuja',
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
            'email' => 'test@example.com',
            'role' => 'patient',
            'country' => 'Nigeria',
            'city' => 'Abuja',
        ]);
    }
}
