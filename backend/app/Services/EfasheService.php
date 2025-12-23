<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class EfasheService
{
    protected $baseUrl;
    protected $apiKey;
    protected $apiSecret;
    protected $senderId;
    protected $dlrUrl;

    public function __construct()
    {
        // Efashe Messaging API (Production)
        $this->baseUrl = env('EFASHE_MESSAGING_BASE_URL', 'https://messaging.efashe.com/mw');
        $this->apiKey = env('EFASHE_API_KEY', '');
        $this->apiSecret = env('EFASHE_API_SECRET', '');
        $this->senderId = env('EFASHE_SENDER_ID', '');
        $this->dlrUrl = env('EFASHE_DLR_URL', '');
    }

    /**
     * Get Efashe API Access Token
     */
    protected function getAccessToken()
    {
        $cacheKey = 'efashe_access_token';
        $token = Cache::get($cacheKey);

        if ($token) {
            return $token;
        }

        try {
            Log::info('Authenticating with Efashe API...');
            $response = Http::post("{$this->baseUrl}/api/v1/auth/", [
                'api_username' => $this->apiKey,
                'api_password' => $this->apiSecret,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $token = $data['access_token'] ?? null;

                if ($token) {
                    // Cache token for 23 hours (assuming it lasts at least that long)
                    Cache::put($cacheKey, $token, now()->addHours(23));
                    return $token;
                }
            }

            Log::error('Efashe Authentication Failed', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            return null;

        } catch (\Exception $e) {
            Log::error('Efashe Authentication Exception', ['error' => $e->getMessage()]);
            return null;
        }
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

            // Get Access Token
            $token = $this->getAccessToken();
            if (!$token) {
                return [
                    'success' => true, // Still return success so user can verify if they have the code (e.g. from logs)
                    'message' => 'OTP generated but SMS delivery failed (Auth Error)',
                    'phone' => $phone,
                    'otp' => config('app.debug') ? $otp : null,
                ];
            }

            // Format phone number (remove + if present for Efashe)
            $formattedPhone = ltrim($phone, '+');

            // Send SMS via Efashe Messaging API v1
            $message = "Your DocAvailable verification code is: {$otp}. Valid for 10 minutes.";

            $payload = [
                'msisdn' => $formattedPhone,
                'message' => $message,
                'msgRef' => 'otp-' . md5($phone . time() . uniqid()),
            ];

            // Add optional sender_id if configured
            if (!empty($this->senderId)) {
                $payload['sender_id'] = $this->senderId;
            }

            Log::info('Efashe SMS Request (v1)', [
                'url' => "{$this->baseUrl}/api/v1/mt/single",
                'msisdn' => $formattedPhone,
                'otp' => $otp,
            ]);

            $response = Http::withToken($token)
                ->post("{$this->baseUrl}/api/v1/mt/single", $payload);

            Log::info('Efashe SMS API Response (v1)', [
                'phone' => $phone,
                'otp' => $otp,
                'status' => $response->status(),
                'response' => $response->json(),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if ($data['success'] ?? false) {
                    return [
                        'success' => true,
                        'message' => 'OTP sent successfully',
                        'phone' => $phone,
                        'otp' => config('app.debug') ? $otp : null,
                    ];
                }
            }

            Log::error('Efashe SMS API Error (v1)', [
                'phone' => $phone,
                'status' => $response->status(),
                'error' => $response->body(),
            ]);

            return [
                'success' => true,
                'message' => 'OTP generated (SMS delivery status: ' . ($response->json()['message'] ?? 'Failed') . ')',
                'phone' => $phone,
                'otp' => config('app.debug') ? $otp : null,
            ];

        } catch (\Exception $e) {
            Log::error('Efashe SMS Exception (v1)', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => true,
                'message' => 'OTP generated (SMS delivery error)',
                'phone' => $phone,
                'otp' => config('app.debug') ? $otp : null,
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
