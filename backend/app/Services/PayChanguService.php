<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayChanguService
{
    private string $secretKey;
    private string $paymentUrl;
    private string $verifyUrl;
    private ?string $callbackUrl;
    private ?string $returnUrl;

    public function __construct()
    {
        $this->secretKey = (string) config('services.paychangu.secret_key');
        $this->paymentUrl = 'https://api.paychangu.com/payment';
        $this->verifyUrl = 'https://api.paychangu.com/verify-payment';
        $this->callbackUrl = config('services.paychangu.callback_url');
        $this->returnUrl = config('services.paychangu.return_url');
    }

    public function initiate(array $payload): array
    {
        // Validate required fields according to PayChangu documentation
        $requiredFields = ['amount', 'currency', 'callback_url', 'return_url'];
        foreach ($requiredFields as $field) {
            if (empty($payload[$field])) {
                Log::error('PayChangu initiate missing required field', ['field' => $field]);
                return [
                    'ok' => false,
                    'error' => "Missing required field: {$field}"
                ];
            }
        }

        // Prepare payload according to PayChangu API specification
        $apiPayload = [
            'amount' => (string) $payload['amount'], // Must be string
            'currency' => $payload['currency'],
            'callback_url' => $payload['callback_url'],
            'return_url' => $payload['return_url'],
            'tx_ref' => $payload['tx_ref'] ?? null,
            'first_name' => $payload['first_name'] ?? null,
            'last_name' => $payload['last_name'] ?? null,
            'email' => $payload['email'] ?? null,
            'customization' => [
                'title' => 'DocAvailable Payment',
                'description' => 'Payment for medical consultation services'
            ],
            'meta' => $payload['meta'] ?? null
        ];

        $headers = [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->secretKey,
        ];

        Log::info('PayChangu API request', [
            'url' => $this->paymentUrl,
            'payload' => $apiPayload
        ]);

        $response = Http::withHeaders($headers)->post($this->paymentUrl, $apiPayload);

        $responseData = $response->json();
        
        Log::info('PayChangu API response', [
            'status' => $response->status(),
            'body' => $responseData
        ]);
        
        if (!$response->successful() || ($responseData['status'] ?? '') !== 'success') {
            Log::error('PayChangu initiate failed', [
                'status' => $response->status(),
                'body' => $responseData,
            ]);
            return [
                'ok' => false,
                'status' => $response->status(),
                'body' => $responseData,
                'error' => $responseData['message'] ?? 'Payment initiation failed'
            ];
        }

        // Extract checkout URL from response according to PayChangu documentation
        $checkoutUrl = $responseData['data']['checkout_url'] ?? null;
        $txRef = $responseData['data']['data']['tx_ref'] ?? null;

        return [
            'ok' => true,
            'status' => 'success',
            'checkout_url' => $checkoutUrl,
            'tx_ref' => $txRef,
            'response' => $responseData
        ];
    }

    public function verify(string $txRef): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->secretKey,
        ];

        // Use the correct PayChangu verification endpoint as per documentation
        $verifyUrl = $this->verifyUrl . '/' . $txRef;
        
        Log::info('PayChangu verification request', [
            'url' => $verifyUrl,
            'tx_ref' => $txRef
        ]);

        $response = Http::withHeaders($headers)->get($verifyUrl);

        $responseData = $response->json();
        
        Log::info('PayChangu verification response', [
            'tx_ref' => $txRef,
            'status' => $response->status(),
            'body' => $responseData
        ]);

        if (!$response->successful()) {
            Log::error('PayChangu verify failed', [
                'tx_ref' => $txRef,
                'status' => $response->status(),
                'body' => $responseData,
            ]);
            
            return [
                'ok' => false,
                'status' => $response->status(),
                'body' => $responseData,
                'error' => 'Verification failed'
            ];
        }

        return [
            'ok' => true,
            'status' => $response->status(),
            'body' => $responseData,
            'data' => $responseData['data'] ?? null
        ];
    }
}

