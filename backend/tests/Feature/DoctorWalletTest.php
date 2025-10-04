<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\TextSession;
use App\Models\Appointment;
use App\Models\DoctorWallet;
use App\Models\WalletTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\DoctorPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DoctorWalletTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function doctor_wallet_is_created_automatically_when_accessed()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);

        $this->actingAs($doctor, 'api')
            ->getJson('/api/doctor/wallet')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'balance',
                    'total_earned',
                    'total_withdrawn',
                    'payment_rates'
                ]
            ]);

        $this->assertDatabaseHas('doctor_wallets', [
            'doctor_id' => $doctor->id,
            'balance' => 0.00,
            'total_earned' => 0.00,
            'total_withdrawn' => 0.00,
        ]);
    }

    /** @test */
    public function doctor_receives_payment_when_text_session_ends()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start a text session
        $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $session = TextSession::where('doctor_id', $doctor->id)->first();

        // End the session
        $session->endSession();

        // Check that doctor received payment
        $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($wallet);
        $this->assertEquals(4000.00, $wallet->balance);
        $this->assertEquals(4000.00, $wallet->total_earned);

        // Check transaction record
        $transaction = WalletTransaction::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($transaction);
        $this->assertEquals('credit', $transaction->type);
        $this->assertEquals(4000.00, $transaction->amount);
        $this->assertEquals('text', $transaction->session_type);
        $this->assertEquals($session->id, $transaction->session_id);
    }

    /** @test */
    public function doctor_receives_payment_when_text_session_expires()
    {
        // Create a plan with text sessions
        $plan = Plan::factory()->withTextSessions(5)->create();

        // Create a patient with subscription
        $patient = User::factory()->create(['role' => 'patient']);
        $subscription = Subscription::factory()->create([
            'user_id' => $patient->id,
            'plan_id' => $plan->id,
            'text_sessions_remaining' => 3
        ]);

        // Create an online doctor
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'is_online_for_instant_sessions' => true,
            'is_active' => true
        ]);

        // Start a text session
        $this->actingAs($patient, 'api')
            ->postJson('/api/text-sessions/start', [
                'doctor_id' => $doctor->id
            ]);

        $session = TextSession::where('doctor_id', $doctor->id)->first();

        // Mark session as expired
        $session->markAsExpired();

        // Check that doctor received payment
        $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($wallet);
        $this->assertEquals(4000.00, $wallet->balance);
        $this->assertEquals(4000.00, $wallet->total_earned);
    }

    /** @test */
    public function doctor_receives_payment_for_audio_appointment()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'doctor']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '10:00:00',
            'appointment_type' => 'audio',
            'duration_minutes' => 30,
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Mark appointment as completed
        $appointment->markAsCompleted();

        // Check that doctor received payment
        $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($wallet);
        $this->assertEquals(5000.00, $wallet->balance);
        $this->assertEquals(5000.00, $wallet->total_earned);

        // Check transaction record
        $transaction = WalletTransaction::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($transaction);
        $this->assertEquals('credit', $transaction->type);
        $this->assertEquals(5000.00, $transaction->amount);
        $this->assertEquals('audio', $transaction->session_type);
        $this->assertEquals($appointment->id, $transaction->session_id);
    }

    /** @test */
    public function doctor_receives_payment_for_video_appointment()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'doctor']);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '10:00:00',
            'appointment_type' => 'video',
            'duration_minutes' => 30,
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Mark appointment as completed
        $appointment->markAsCompleted();

        // Check that doctor received payment
        $wallet = DoctorWallet::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($wallet);
        $this->assertEquals(6000.00, $wallet->balance);
        $this->assertEquals(6000.00, $wallet->total_earned);

        // Check transaction record
        $transaction = WalletTransaction::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($transaction);
        $this->assertEquals('credit', $transaction->type);
        $this->assertEquals(6000.00, $transaction->amount);
        $this->assertEquals('video', $transaction->session_type);
    }

    /** @test */
    public function doctor_can_view_wallet_transactions()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $wallet = DoctorWallet::getOrCreate($doctor->id);

        // Create some transactions
        $wallet->credit(4000.00, 'Test text session payment', 'text', 1, 'text_sessions');
        $wallet->credit(5000.00, 'Test audio call payment', 'audio', 2, 'appointments');

        $this->actingAs($doctor, 'api')
            ->getJson('/api/doctor/wallet/transactions')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'doctor_id',
                            'type',
                            'amount',
                            'description',
                            'session_type',
                            'created_at'
                        ]
                    ]
                ]
            ]);
    }

    /** @test */
    public function doctor_can_view_earnings_summary()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $wallet = DoctorWallet::getOrCreate($doctor->id);

        // Create transactions for different session types
        $wallet->credit(4000.00, 'Text session payment', 'text', 1, 'text_sessions');
        $wallet->credit(5000.00, 'Audio call payment', 'audio', 2, 'appointments');
        $wallet->credit(6000.00, 'Video call payment', 'video', 3, 'appointments');

        $this->actingAs($doctor, 'api')
            ->getJson('/api/doctor/wallet/earnings-summary')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'wallet' => [
                        'balance',
                        'total_earned',
                        'total_withdrawn'
                    ],
                    'earnings_by_type',
                    'recent_transactions',
                    'payment_rates'
                ]
            ]);
    }

    /** @test */
    public function doctor_can_request_withdrawal()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $wallet = DoctorWallet::getOrCreate($doctor->id);

        // Add some balance
        $wallet->credit(10000.00, 'Test payment', 'text', 1, 'text_sessions');

        $this->actingAs($doctor, 'api')
            ->postJson('/api/doctor/wallet/withdraw', [
                'amount' => 5000.00,
                'bank_account' => '1234567890',
                'bank_name' => 'Test Bank',
                'account_holder_name' => 'Dr. John Doe'
            ])
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'transaction_id',
                    'amount',
                    'new_balance'
                ]
            ]);

        // Check wallet balance was reduced
        $wallet->refresh();
        $this->assertEquals(5000.00, $wallet->balance);
        $this->assertEquals(5000.00, $wallet->total_withdrawn);
    }

    /** @test */
    public function doctor_cannot_withdraw_more_than_balance()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $wallet = DoctorWallet::getOrCreate($doctor->id);

        // Add some balance
        $wallet->credit(3000.00, 'Test payment', 'text', 1, 'text_sessions');

        $this->actingAs($doctor, 'api')
            ->postJson('/api/doctor/wallet/withdraw', [
                'amount' => 5000.00,
                'bank_account' => '1234567890',
                'bank_name' => 'Test Bank',
                'account_holder_name' => 'Dr. John Doe'
            ])
            ->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Insufficient balance for withdrawal'
            ]);
    }

    /** @test */
    public function payment_rates_are_correct()
    {
        $this->assertEquals(4000.00, DoctorPaymentService::getPaymentAmount('text'));
        $this->assertEquals(4000.00, DoctorPaymentService::getPaymentAmount('audio'));
        $this->assertEquals(4000.00, DoctorPaymentService::getPaymentAmount('video'));

        $rates = DoctorPaymentService::getPaymentAmounts();
        $this->assertEquals([
            'text' => 4000.00,
            'audio' => 4000.00,
            'video' => 4000.00,
        ], $rates);
    }

    /** @test */
    public function non_doctors_cannot_access_wallet()
    {
        $patient = User::factory()->create(['role' => 'patient']);

        $this->actingAs($patient, 'api')
            ->getJson('/api/doctor/wallet')
            ->assertStatus(403)
            ->assertJson([
                'error' => 'Access denied. Insufficient permissions.'
            ]);
    }
} 