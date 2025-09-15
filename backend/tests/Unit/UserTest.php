<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Appointment;
use App\Models\Reviews;
use App\Models\WorkingHours;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_correct_role_methods()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $doctor = User::factory()->create(['role' => 'doctor']);
        $patient = User::factory()->create(['role' => 'patient']);

        // Test isAdmin method
        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($doctor->isAdmin());
        $this->assertFalse($patient->isAdmin());

        // Test isDoctor method
        $this->assertFalse($admin->isDoctor());
        $this->assertTrue($doctor->isDoctor());
        $this->assertFalse($patient->isDoctor());

        // Test isPatient method
        $this->assertFalse($admin->isPatient());
        $this->assertFalse($doctor->isPatient());
        $this->assertTrue($patient->isPatient());

        // Test hasRole method
        $this->assertTrue($admin->hasRole('admin'));
        $this->assertTrue($doctor->hasRole('doctor'));
        $this->assertTrue($patient->hasRole('patient'));

        // Test hasAnyRole method
        $this->assertTrue($admin->hasAnyRole(['admin', 'doctor']));
        $this->assertTrue($doctor->hasAnyRole(['admin', 'doctor']));
        $this->assertFalse($patient->hasAnyRole(['admin', 'doctor']));
    }

    public function test_user_has_doctor_appointments_relationship()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $patient = User::factory()->create(['role' => 'patient']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => '2025-01-20',
            'appointment_time' => '10:00:00',
            'status' => 0,
        ]);

        $this->assertCount(1, $doctor->doctorAppointments);
        $this->assertEquals($appointment->id, $doctor->doctorAppointments->first()->id);
    }

    public function test_user_has_patient_appointments_relationship()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $patient = User::factory()->create(['role' => 'patient']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => '2025-01-20',
            'appointment_time' => '10:00:00',
            'status' => 0,
        ]);

        $this->assertCount(1, $patient->patientAppointments);
        $this->assertEquals($appointment->id, $patient->patientAppointments->first()->id);
    }

    public function test_user_has_reviews_relationship()
    {
        $user = User::factory()->create();

        $review = Reviews::create([
            'user_id' => $user->id,
            'reviewer_id' => User::factory()->create()->id,
            'rating' => 5,
            'comment' => 'Great service!',
        ]);

        $this->assertCount(1, $user->reviews);
        $this->assertEquals($review->id, $user->reviews->first()->id);
    }

    public function test_user_has_working_hours_relationship()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);

        $workingHours = WorkingHours::create([
            'doctor_id' => $doctor->id,
            'day' => 'Monday',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
        ]);

        $this->assertCount(1, $doctor->workingHours);
        $this->assertEquals($workingHours->id, $doctor->workingHours->first()->id);
    }

    public function test_user_password_is_hashed()
    {
        $user = User::factory()->create([
            'password' => 'plaintextpassword',
        ]);

        $this->assertNotEquals('plaintextpassword', $user->password);
        $this->assertTrue(password_verify('plaintextpassword', $user->password));
    }

    public function test_user_hidden_attributes_are_not_serialized()
    {
        $user = User::factory()->create();

        $userArray = $user->toArray();

        $this->assertArrayNotHasKey('password', $userArray);
        $this->assertArrayNotHasKey('remember_token', $userArray);
    }
} 