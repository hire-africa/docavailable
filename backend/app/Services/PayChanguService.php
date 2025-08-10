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
        $this->verifyUrl = 'https://api.paychangu.com/payment/verify';
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

        // Ensure amount is string
        $payload['amount'] = (string) $payload['amount'];

        // Add default customization if not provided
        if (!isset($payload['customization'])) {
            $payload['customization'] = [
                'title' => 'DocAvailable Payment',
                'description' => $payload['description'] ?? 'Payment for services'
            ];
        }

        $headers = [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->secretKey,
        ];

        $response = Http::withHeaders($headers)->post($this->paymentUrl, $payload);

        $responseData = $response->json();
        
        if (!$response->successful() || ($responseData['status'] ?? '') !== 'success') {
            Log::error('PayChangu initiate failed', [
                'status' => $response->status(),
                'body' => $responseData,
            ]);
        }

        return [
            'ok' => $response->successful() && ($responseData['status'] ?? '') === 'success',
            'status' => $response->status(),
            'body' => $responseData,
            'checkout_url' => $responseData['data']['checkout_url'] ?? null,
            'tx_ref' => $responseData['data']['data']['tx_ref'] ?? null
        ];
    }

    public function verify(string $txRef): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->secretKey,
        ];

        // Some gateways use GET /payment/verify?tx_ref=...; keeping flexible
        $response = Http::withHeaders($headers)->get($this->verifyUrl, [
            'tx_ref' => $txRef,
        ]);

        if (!$response->successful()) {
            Log::error('PayChangu verify failed', [
                'tx_ref' => $txRef,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        }

        return [
            'ok' => $response->successful(),
            'status' => $response->status(),
            'body' => $response->json(),
        ];
    }
}

