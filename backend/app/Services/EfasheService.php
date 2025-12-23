<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class EfasheService
{
    protected $baseUrl;
    protected $apiKey;
    protected $senderId;

    public function __construct()
    {
        // Efashe Sandbox API
        $this->baseUrl = env('EFASHE_BASE_URL', 'https://sb-vapi.efashe.com/mw');
        $this->apiKey = env('EFASHE_API_KEY', '');
        $this->senderId = env('EFASHE_SENDER_ID', 'EFASHE'); // Default sender ID
    }

    /**
     * Send OTP via Efashe SMS API
     */
    public function sendOtp($phone)
    {
        try {
            // Generate 6-digit OTP
            $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

            // Store OTP in cache for 10 minutes
            $cacheKey = 'otp_' . md5($phone);
            Cache::put($cacheKey, $otp, now()->addMinutes(10));

            // Format phone number (remove + if present for Efashe)
            $formattedPhone = ltrim($phone, '+');

            // Send SMS via Efashe API
            $message = "Your DocAvailable verification code is: {$otp}. Valid for 10 minutes.";

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post("{$this->baseUrl}/sms/send", [
                        'sender_id' => $this->senderId,
                        'phone' => $formattedPhone,
                        'message' => $message,
                    ]);

            Log::info('Efashe SMS API Response', [
                'phone' => $phone,
                'otp' => $otp,
                'status' => $response->status(),
                'response' => $response->json(),
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'OTP sent successfully',
                    'phone' => $phone,
                    // Include OTP in debug mode for testing
                    'otp' => config('app.debug') ? $otp : null,
                ];
            } else {
                Log::error('Efashe SMS API Error', [
                    'phone' => $phone,
                    'status' => $response->status(),
                    'error' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send OTP: ' . ($response->json()['message'] ?? 'Unknown error'),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Efashe SMS Exception', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to send OTP: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify OTP
     */
    public function verifyOtp($phone, $otp)
    {
        try {
            $cacheKey = 'otp_' . md5($phone);
            $storedOtp = Cache::get($cacheKey);

            if (!$storedOtp) {
                return [
                    'success' => false,
                    'message' => 'OTP has expired. Please request a new one.',
                ];
            }

            if ($storedOtp !== $otp) {
                return [
                    'success' => false,
                    'message' => 'Invalid OTP. Please check and try again.',
                ];
            }

            // OTP is valid - clear it
            Cache::forget($cacheKey);

            return [
                'success' => true,
                'message' => 'OTP verified successfully',
            ];
        } catch (\Exception $e) {
            Log::error('OTP Verification Error', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Verification failed: ' . $e->getMessage(),
            ];
        }
    }
}
