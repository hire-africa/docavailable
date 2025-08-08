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
        // Create admin user (only if doesn't exist)
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('password123'),
                'user_type' => 'admin',
                'status' => 'active',
            ]
        );

        // Create doctor users (only if don't exist)
        User::firstOrCreate(
            ['email' => 'doctor@example.com'],
            [
                'first_name' => 'Dr. John',
                'last_name' => 'Smith',
                'password' => Hash::make('password123'),
                'user_type' => 'doctor',
                'status' => 'approved',
            ]
        );

        User::firstOrCreate(
            ['email' => 'sarah.johnson@example.com'],
            [
                'first_name' => 'Dr. Sarah',
                'last_name' => 'Johnson',
                'password' => Hash::make('password123'),
                'user_type' => 'doctor',
                'status' => 'approved',
            ]
        );

        User::firstOrCreate(
            ['email' => 'michael.brown@example.com'],
            [
                'first_name' => 'Dr. Michael',
                'last_name' => 'Brown',
                'password' => Hash::make('password123'),
                'user_type' => 'doctor',
                'status' => 'approved',
            ]
        );

        // Create patient users (only if don't exist)
        User::firstOrCreate(
            ['email' => 'patient@example.com'],
            [
                'first_name' => 'Patient',
                'last_name' => 'User',
                'password' => Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'alice.wilson@example.com'],
            [
                'first_name' => 'Alice',
                'last_name' => 'Wilson',
                'password' => Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'bob.davis@example.com'],
            [
                'first_name' => 'Bob',
                'last_name' => 'Davis',
                'password' => Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
            ]
        );

        User::firstOrCreate(
            ['email' => 'carol.miller@example.com'],
            [
                'first_name' => 'Carol',
                'last_name' => 'Miller',
                'password' => Hash::make('password123'),
                'user_type' => 'patient',
                'status' => 'active',
            ]
        );

        // Create additional test users if needed (only in local environment with Faker available)
        if (app()->environment('local') && class_exists('Faker\Factory')) {
            // Create more test users for local development
            User::factory(5)->create(['user_type' => 'doctor']);
            User::factory(10)->create(['user_type' => 'patient']);
        }
    }
} 