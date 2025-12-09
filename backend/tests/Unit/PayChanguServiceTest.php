<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\PayChanguService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;

class PayChanguServiceTest extends TestCase
{
    private PayChanguService $payChanguService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock config values
        Config::set('services.paychangu.secret_key', 'test-secret-key');
        Config::set('services.paychangu.payment_url', 'https://api.paychangu.com/payment');
        Config::set('services.paychangu.verify_url', 'https://api.paychangu.com/payment/verify');
        Config::set('services.paychangu.callback_url', 'https://example.com/callback');
        Config::set('services.paychangu.return_url', 'https://example.com/return');
        
        $this->payChanguService = new PayChanguService();
    }

    public function test_initiate_success()
    {
        $payload = [
            'amount' => '100',
            'currency' => 'MWK',
            'tx_ref' => 'test-ref-123',
            'email' => 'test@example.com',
            'phone_number' => '+265123456789',
            'callback_url' => 'https://example.com/callback',
            'return_url' => 'https://example.com/return',
        ];

        Http::fake([
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

        $result = $this->payChanguService->initiate($payload);

        $this->assertTrue($result['success']);
        $this->assertEquals('https://checkout.paychangu.com/123456', $result['checkout_url']);
        $this->assertEquals('test-ref-123', $result['tx_ref']);
    }

    public function test_initiate_failure()
    {
        $payload = [
            'amount' => '100',
            'currency' => 'MWK',
            'tx_ref' => 'test-ref-123',
            'email' => 'test@example.com',
            'phone_number' => '+265123456789',
        ];

        Http::fake([
            'https://api.paychangu.com/payment' => Http::response([
                'message' => 'Invalid amount',
                'status' => 'error',
            ], 400)
        ]);

        $result = $this->payChanguService->initiate($payload);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Invalid amount', $result['message']);
    }

    public function test_verify_success()
    {
        $txRef = 'test-ref-123';

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

        $result = $this->payChanguService->verify($txRef);

        $this->assertTrue($result['success']);
        $this->assertEquals('success', $result['data']['status']);
        $this->assertEquals($txRef, $result['data']['tx_ref']);
    }

    public function test_verify_failure()
    {
        $txRef = 'test-ref-123';

        Http::fake([
            'https://api.paychangu.com/payment/verify*' => Http::response([
                'status' => 'error',
                'message' => 'Transaction not found',
            ], 404)
        ]);

        $result = $this->payChanguService->verify($txRef);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Transaction not found', $result['message']);
    }

    public function test_verify_network_error()
    {
        $txRef = 'test-ref-123';

        Http::fake([
            'https://api.paychangu.com/payment/verify*' => Http::response([], 500)
        ]);

        $result = $this->payChanguService->verify($txRef);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Failed to verify transaction', $result['message']);
    }
} 