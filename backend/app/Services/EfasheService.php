<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EfasheService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = env('EFASHE_BASE_URL');
        $this->apiKey = env('EFASHE_API_KEY');
    }

    // Send OTP
    public function sendOtp($phone)
    {
        $response = Http::post("{$this->baseUrl}/send-otp", [
            'phone' => $phone,
            'api_key' => $this->apiKey,
        ]);

        return $response->json();
    }

    // Verify OTP
    public function verifyOtp($phone, $otp)
    {
        $response = Http::post("{$this->baseUrl}/verify-otp", [
            'phone' => $phone,
            'otp' => $otp,
            'api_key' => $this->apiKey,
        ]);

        return $response->json();
    }
}
