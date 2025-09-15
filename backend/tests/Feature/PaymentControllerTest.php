<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\PaymentTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user
        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        // Create test plan
        $this->plan = Plan::create([
            'name' => 'Basic Plan',
            'price' => 100,
            'currency' => 'MWK',
            'text_sessions' => 5,
            'voice_calls' => 2,
            'video_calls' => 1,
            'duration' => 30,
            'status' => true,
        ]);

        // Mock PayChangu config
        Config::set('services.paychangu.secret_key', 'test-secret-key');
        Config::set('services.paychangu.payment_url', 'https://api.paychangu.com/payment');
        Config::set('services.paychangu.verify_url', 'https://api.paychangu.com/payment/verify');
        Config::set('services.paychangu.callback_url', 'https://example.com/callback');
        Config::set('services.paychangu.return_url', 'https://example.com/return');
        Config::set('app.frontend_url', 'https://example.com');
    }

    public function test_initiate_payment_success()
    {
        $response = Http::fake([
            'https://api.paychangu.com/payment' => Http::response([
                'message' => 'Hosted payment session generated successfully.',
                'status' => 'success',
                'data' => [
                    'checkout_url' => 'https://checkout.paychangu.com/123456',
                    'data' => [
                        'tx_ref' => 'test-ref-123',
                        'currency' => 'MWK',
                        'amount' => 100,
                        'status' => 'pending'
                    ]
                ]
            ], 200)
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/payments/paychangu/initiate', [
                'plan_id' => $this->plan->id
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'checkout_url' => 'https://checkout.paychangu.com/123456',
            ])
            ->assertJsonStructure([
                'success',
                'checkout_url',
                'tx_ref'
            ]);

        // Check that payment transaction was created
        $this->assertDatabaseHas('payment_transactions', [
            'reference' => $response->json('tx_ref'),
            'amount' => 100,
            'currency' => 'MWK',
            'status' => 'pending',
            'gateway' => 'paychangu',
        ]);
    }

    public function test_initiate_payment_plan_not_found()
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/payments/paychangu/initiate', [
                'plan_id' => 999
            ]);

        $response->assertStatus(404);
    }

    public function test_initiate_payment_unauthenticated()
    {
        $response = $this->postJson('/api/payments/paychangu/initiate', [
            'plan_id' => $this->plan->id
        ]);

        $response->assertStatus(401);
    }

    public function test_callback_success()
    {
        // Create a pending transaction
        $txRef = 'test-ref-123';
        $transaction = PaymentTransaction::create([
            'transaction_id' => $txRef,
            'reference' => $txRef,
            'amount' => 100,
            'currency' => 'MWK',
            'status' => 'pending',
            'gateway' => 'paychangu',
            'webhook_data' => [
                'meta' => [
                    'user_id' => $this->user->id,
                    'plan_id' => $this->plan->id,
                ]
            ]
        ]);

        Http::fake([
            'https://api.paychangu.com/payment/verify*' => Http::response([
                'status' => 'success',
                'data' => [
                    'tx_ref' => $txRef,
                    'status' => 'success',
                    'amount' => 100,
                    'currency' => 'MWK'
                ]
            ], 200)
        ]);

        $response = $this->get("/api/payments/paychangu/callback?tx_ref={$txRef}");

        $response->assertRedirect();
        
        // Check that transaction was updated
        $this->assertDatabaseHas('payment_transactions', [
            'reference' => $txRef,
            'status' => 'completed',
        ]);

        // Check that subscription was created
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'payment_transaction_id' => $txRef,
            'payment_gateway' => 'paychangu',
            'payment_status' => 'paid',
        ]);
    }

    public function test_callback_missing_tx_ref()
    {
        $response = $this->get('/api/payments/paychangu/callback');

        $response->assertStatus(400)
            ->assertJson(['error' => 'Missing tx_ref']);
    }

    public function test_callback_transaction_not_found()
    {
        $response = $this->get('/api/payments/paychangu/callback?tx_ref=non-existent');

        $response->assertRedirect();
    }

    public function test_return_handler()
    {
        $response = $this->get('/api/payments/paychangu/return?tx_ref=test-ref&status=failed');

        $response->assertRedirect();
    }

    public function test_webhook_handling()
    {
        $webhookData = [
            'transaction_id' => 'webhook-tx-123',
            'reference' => 'webhook-ref-123',
            'amount' => 100,
            'currency' => 'MWK',
            'status' => 'success',
            'phone_number' => '+265123456789',
            'payment_method' => 'mobile_money',
        ];

        $response = $this->postJson('/api/payments/webhook', $webhookData);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Check that transaction was created/updated
        $this->assertDatabaseHas('payment_transactions', [
            'transaction_id' => 'webhook-tx-123',
            'reference' => 'webhook-ref-123',
            'amount' => 100,
            'currency' => 'MWK',
            'status' => 'completed',
        ]);
    }
} 