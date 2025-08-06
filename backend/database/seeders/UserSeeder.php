<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'admin',
            'status' => 'active',
        ]);

        // Create doctor users
        User::create([
            'first_name' => 'Dr. John',
            'last_name' => 'Smith',
            'email' => 'doctor@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'doctor',
            'status' => 'approved',
        ]);

        User::create([
            'first_name' => 'Dr. Sarah',
            'last_name' => 'Johnson',
            'email' => 'sarah.johnson@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'doctor',
            'status' => 'approved',
        ]);

        User::create([
            'first_name' => 'Dr. Michael',
            'last_name' => 'Brown',
            'email' => 'michael.brown@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'doctor',
            'status' => 'approved',
        ]);

        // Create patient users
        User::create([
            'first_name' => 'Patient',
            'last_name' => 'User',
            'email' => 'patient@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'patient',
            'status' => 'active',
        ]);

        User::create([
            'first_name' => 'Alice',
            'last_name' => 'Wilson',
            'email' => 'alice.wilson@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'patient',
            'status' => 'active',
        ]);

        User::create([
            'first_name' => 'Bob',
            'last_name' => 'Davis',
            'email' => 'bob.davis@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'patient',
            'status' => 'active',
        ]);

        User::create([
            'first_name' => 'Carol',
            'last_name' => 'Miller',
            'email' => 'carol.miller@example.com',
            'password' => Hash::make('password123'),
            'user_type' => 'patient',
            'status' => 'active',
        ]);

        // Create additional test users if needed
        if (app()->environment('local')) {
            // Create more test users for local development
            User::factory(5)->create(['user_type' => 'doctor']);
            User::factory(10)->create(['user_type' => 'patient']);
        }
    }
} 