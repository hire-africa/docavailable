<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PhoneAuthController extends Controller
{
    /**
     * Send OTP to phone number via SMS
     */
    public function sendOtp(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string|regex:/^\+[1-9]\d{1,14}$/', // E.164 format
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid phone number format. Must be in E.164 format (e.g., +265991234567)',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phone = $request->phone;

            // Generate 6-digit OTP
            $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

            // Store OTP in cache with 10 minute expiry
            $cacheKey = 'otp_' . md5($phone);
            cache()->put($cacheKey, $otp, now()->addMinutes(10));

            // Log OTP for development (remove in production or use proper SMS service)
            Log::info('OTP generated', [
                'phone' => $phone,
                'otp' => $otp,
                'expires_at' => now()->addMinutes(10)->toISOString()
            ]);

            // TODO: Integrate with actual SMS service (Twilio, Africa's Talking, etc.)
            // For now, we're just storing it in cache and logging it

            // In production, you would send SMS here:
            // $this->sendSMS($phone, "Your DocAvailable verification code is: $otp");

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully',
                'phone' => $phone,
                // Include OTP in response for development ONLY - remove in production
                'otp' => config('app.debug') ? $otp : null,
                'expires_in' => 600 // 10 minutes in seconds
            ]);

        } catch (\Exception $e) {
            Log::error('Error sending OTP', [
                'error' => $e->getMessage(),
                'phone' => $request->phone ?? 'not_provided'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Verify OTP for phone number
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string|regex:/^\+[1-9]\d{1,14}$/',
                'otp' => 'required|string|size:6',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phone = $request->phone;
            $otp = $request->otp;

            // Get stored OTP from cache
            $cacheKey = 'otp_' . md5($phone);
            $storedOtp = cache()->get($cacheKey);

            if (!$storedOtp) {
                return response()->json([
                    'success' => false,
                    'message' => 'OTP has expired or not found. Please request a new code.',
                    'error_type' => 'otp_expired'
                ], 401);
            }

            if ($storedOtp !== $otp) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid OTP. Please check the code and try again.',
                    'error_type' => 'invalid_otp'
                ], 401);
            }

            // OTP is valid - clear it from cache
            cache()->forget($cacheKey);

            // Check if user exists with this phone number
            $user = User::where('phone', $phone)->first();

            if ($user) {
                // User exists - log them in
                $token = auth('api')->login($user);

                Log::info('User logged in via phone OTP', [
                    'user_id' => $user->id,
                    'phone' => $phone
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Phone number verified successfully',
                    'user' => $user,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth('api')->factory()->getTTL() * 60,
                    'user_exists' => true
                ]);
            } else {
                // User doesn't exist - phone verification successful but needs to complete registration
                Log::info('Phone verified for new user', [
                    'phone' => $phone
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Phone number verified successfully',
                    'user_exists' => false,
                    'phone' => $phone,
                    'verified' => true
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error verifying OTP', [
                'error' => $e->getMessage(),
                'phone' => $request->phone ?? 'not_provided'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify OTP',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
