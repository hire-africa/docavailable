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
        $this->paymentUrl = (string) config('services.paychangu.payment_url');
        $this->verifyUrl = (string) config('services.paychangu.verify_url');
        $this->callbackUrl = config('services.paychangu.callback_url');
        $this->returnUrl = config('services.paychangu.return_url');
    }

    public function initiate(array $payload): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->secretKey,
        ];

        $response = Http::withHeaders($headers)->post($this->paymentUrl, $payload);

        if (!$response->successful()) {
            Log::error('PayChangu initiate failed', [
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

