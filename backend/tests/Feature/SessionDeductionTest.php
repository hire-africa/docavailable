<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\TextSession;
use App\Models\Subscription;
use App\Services\DoctorPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class SessionDeductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_deduction_logic()
    {
        // Create test users
        $patient = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor']);

        // Create subscription for patient
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'text_sessions_remaining' => 5,
            'status' => 'active',
            'is_active' => true,
        ]);

        // Test 1: 8-minute session (manual end only)
        $session1 = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => Carbon::now()->subMinutes(8),
            'ended_at' => Carbon::now(),
            'sessions_remaining_before_start' => 5,
        ]);

        $paymentService = new DoctorPaymentService();
        $result1 = $paymentService->processSessionEnd($session1, true);

        $this->assertEquals(1, $result1['patient_sessions_deducted']);
        $this->assertEquals(0, $result1['auto_deductions']);
        $this->assertEquals(1, $result1['manual_deduction']);

        // Refresh subscription
        $subscription->refresh();
        $this->assertEquals(4, $subscription->text_sessions_remaining);

        // Test 2: 12-minute session (1 auto + 1 manual)
        $session2 = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => Carbon::now()->subMinutes(12),
            'ended_at' => Carbon::now(),
            'sessions_remaining_before_start' => 4,
        ]);

        $result2 = $paymentService->processSessionEnd($session2, true);

        $this->assertEquals(2, $result2['patient_sessions_deducted']);
        $this->assertEquals(1, $result2['auto_deductions']);
        $this->assertEquals(1, $result2['manual_deduction']);

        // Refresh subscription
        $subscription->refresh();
        $this->assertEquals(2, $subscription->text_sessions_remaining);

        // Test 3: 25-minute session (2 auto + 1 manual)
        $session3 = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => Carbon::now()->subMinutes(25),
            'ended_at' => Carbon::now(),
            'sessions_remaining_before_start' => 2,
        ]);

        $result3 = $paymentService->processSessionEnd($session3, true);

        $this->assertEquals(3, $result3['patient_sessions_deducted']);
        $this->assertEquals(2, $result3['auto_deductions']);
        $this->assertEquals(1, $result3['manual_deduction']);

        // Refresh subscription
        $subscription->refresh();
        $this->assertEquals(-1, $subscription->text_sessions_remaining); // Should be negative as we exceeded
    }

    public function test_session_deduction_methods()
    {
        $patient = User::factory()->create(['user_type' => 'patient']);
        $doctor = User::factory()->create(['user_type' => 'doctor']);

        // Test session with 15 minutes elapsed
        $session = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => Carbon::now()->subMinutes(15),
            'sessions_remaining_before_start' => 3,
        ]);

        // Test getSessionsToDeduct method
        $this->assertEquals(1, $session->getSessionsToDeduct(false)); // Auto only
        $this->assertEquals(2, $session->getSessionsToDeduct(true));  // Auto + manual

        // Test getElapsedMinutes method
        $this->assertEquals(15, $session->getElapsedMinutes());

        // Test getTotalAllowedMinutes method
        $this->assertEquals(30, $session->getTotalAllowedMinutes());

        // Test shouldAutoEnd method
        $this->assertFalse($session->shouldAutoEnd()); // 15 < 30

        // Test with session that should auto-end
        $session2 = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => TextSession::STATUS_ACTIVE,
            'started_at' => Carbon::now()->subMinutes(35),
            'sessions_remaining_before_start' => 3,
        ]);

        $this->assertTrue($session2->shouldAutoEnd()); // 35 > 30
    }
} 