<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\TextSession;
use App\Models\Appointment;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\DoctorWallet;
use App\Services\DoctorPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SessionPaymentAndDeductionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a plan
        $this->plan = Plan::factory()->create([
            'text_sessions' => 10,
            'voice_calls' => 5,
            'video_calls' => 3,
        ]);
    }

    /** @test */
    public function text_session_end_processes_doctor_payment_and_patient_deduction()
    {
        // Create a patient with subscription
        $patient = User::factory()->create(['user_type' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $this->plan->id,
            'text_sessions_remaining' => 5,
            'voice_calls_remaining' => 3,
            'video_calls_remaining' => 2,
            'is_active' => true,
        ]);

        // Create a doctor
        $doctor = User::factory()->create(['user_type' => 'doctor']);
        $wallet = DoctorWallet::create(['doctor_id' => $doctor->id]);

        // Create a text session
        $session = TextSession::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'active',
            'started_at' => now()->subMinutes(30),
            'last_activity_at' => now(),
            'sessions_used' => 1,
            'sessions_remaining_before_start' => 5,
        ]);

        // Get initial values
        $initialDoctorBalance = $wallet->balance;
        $initialPatientSessions = $subscription->text_sessions_remaining;

        // Process session end
        $paymentService = new DoctorPaymentService();
        $result = $paymentService->processSessionEnd($session);

        // Refresh models
        $wallet->refresh();
        $subscription->refresh();

        // Assert doctor payment was processed
        $this->assertTrue($result['doctor_payment_success']);
        $this->assertEquals(4000.00, $result['doctor_payment_amount']);
        $this->assertEquals($initialDoctorBalance + 4000.00, $wallet->balance);

        // Assert patient deduction was processed
        $this->assertTrue($result['patient_deduction_success']);
        $this->assertEquals(1, $result['patient_sessions_deducted']);
        $this->assertEquals($initialPatientSessions - 1, $subscription->text_sessions_remaining);

        // Assert no errors
        $this->assertEmpty($result['errors']);
    }

    /** @test */
    public function appointment_end_processes_doctor_payment_and_patient_deduction()
    {
        // Create a patient with subscription
        $patient = User::factory()->create(['user_type' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $this->plan->id,
            'text_sessions_remaining' => 5,
            'voice_calls_remaining' => 3,
            'video_calls_remaining' => 2,
            'is_active' => true,
        ]);

        // Create a doctor
        $doctor = User::factory()->create(['user_type' => 'doctor']);
        $wallet = DoctorWallet::create(['doctor_id' => $doctor->id]);

        // Create an audio appointment
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => now()->toTimeString(),
            'appointment_type' => 'audio',
            'duration_minutes' => 30,
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Get initial values
        $initialDoctorBalance = $wallet->balance;
        $initialPatientVoiceCalls = $subscription->voice_calls_remaining;

        // Process appointment end
        $paymentService = new DoctorPaymentService();
        $result = $paymentService->processAppointmentEnd($appointment);

        // Refresh models
        $wallet->refresh();
        $subscription->refresh();

        // Assert doctor payment was processed
        $this->assertTrue($result['doctor_payment_success']);
        $this->assertEquals(5000.00, $result['doctor_payment_amount']);
        $this->assertEquals($initialDoctorBalance + 5000.00, $wallet->balance);

        // Assert patient deduction was processed
        $this->assertTrue($result['patient_deduction_success']);
        $this->assertEquals(1, $result['patient_sessions_deducted']);
        $this->assertEquals($initialPatientVoiceCalls - 1, $subscription->voice_calls_remaining);

        // Assert no errors
        $this->assertEmpty($result['errors']);
    }

    /** @test */
    public function video_appointment_deducts_correct_session_type()
    {
        // Create a patient with subscription
        $patient = User::factory()->create(['user_type' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $this->plan->id,
            'text_sessions_remaining' => 5,
            'voice_calls_remaining' => 3,
            'video_calls_remaining' => 2,
            'is_active' => true,
        ]);

        // Create a doctor
        $doctor = User::factory()->create(['user_type' => 'doctor']);
        $wallet = DoctorWallet::create(['doctor_id' => $doctor->id]);

        // Create a video appointment
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => now()->toTimeString(),
            'appointment_type' => 'video',
            'duration_minutes' => 30,
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Get initial values
        $initialVideoCalls = $subscription->video_calls_remaining;
        $initialVoiceCalls = $subscription->voice_calls_remaining;
        $initialTextSessions = $subscription->text_sessions_remaining;

        // Process appointment end
        $paymentService = new DoctorPaymentService();
        $result = $paymentService->processAppointmentEnd($appointment);

        // Refresh subscription
        $subscription->refresh();

        // Assert only video calls were deducted
        $this->assertTrue($result['patient_deduction_success']);
        $this->assertEquals($initialVideoCalls - 1, $subscription->video_calls_remaining);
        $this->assertEquals($initialVoiceCalls, $subscription->voice_calls_remaining);
        $this->assertEquals($initialTextSessions, $subscription->text_sessions_remaining);
    }

    /** @test */
    public function patient_without_subscription_returns_false_for_deduction()
    {
        // Create a patient without subscription
        $patient = User::factory()->create(['user_type' => 'patient']);

        // Create a doctor
        $doctor = User::factory()->create(['user_type' => 'doctor']);
        $wallet = DoctorWallet::create(['doctor_id' => $doctor->id]);

        // Create a text session
        $session = TextSession::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'active',
            'started_at' => now()->subMinutes(30),
            'last_activity_at' => now(),
            'sessions_used' => 1,
            'sessions_remaining_before_start' => 0,
        ]);

        // Process session end
        $paymentService = new DoctorPaymentService();
        $result = $paymentService->processSessionEnd($session);

        // Assert doctor payment still works
        $this->assertTrue($result['doctor_payment_success']);
        
        // Assert patient deduction fails
        $this->assertFalse($result['patient_deduction_success']);
        $this->assertContains('Failed to deduct from patient subscription', $result['errors']);
    }

    /** @test */
    public function patient_with_inactive_subscription_returns_false_for_deduction()
    {
        // Create a patient with inactive subscription
        $patient = User::factory()->create(['user_type' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $this->plan->id,
            'text_sessions_remaining' => 5,
            'is_active' => false,
        ]);

        // Create a doctor
        $doctor = User::factory()->create(['user_type' => 'doctor']);
        $wallet = DoctorWallet::create(['doctor_id' => $doctor->id]);

        // Create a text session
        $session = TextSession::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'active',
            'started_at' => now()->subMinutes(30),
            'last_activity_at' => now(),
            'sessions_used' => 1,
            'sessions_remaining_before_start' => 5,
        ]);

        // Process session end
        $paymentService = new DoctorPaymentService();
        $result = $paymentService->processSessionEnd($session);

        // Assert doctor payment still works
        $this->assertTrue($result['doctor_payment_success']);
        
        // Assert patient deduction fails
        $this->assertFalse($result['patient_deduction_success']);
        $this->assertContains('Failed to deduct from patient subscription', $result['errors']);
    }
} 