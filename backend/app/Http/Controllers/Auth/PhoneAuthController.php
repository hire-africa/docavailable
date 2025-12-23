<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EfasheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PhoneAuthController extends Controller
{
    protected $efasheService;

    public function __construct(EfasheService $efasheService)
    {
        $this->efasheService = $efasheService;
    }

    /**
     * Send OTP to phone number via Efashe SMS API
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

            // Use Efashe service to send OTP via SMS
            $result = $this->efasheService->sendOtp($phone);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'OTP sent successfully',
                    'phone' => $phone,
                    // Include OTP in debug mode for testing
                    'otp' => $result['otp'] ?? null,
                    'expires_in' => 600 // 10 minutes
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to send OTP'
                ], 500);
            }

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

            // Use Efashe service to verify OTP
            $result = $this->efasheService->verifyOtp($phone, $otp);

            if (!$result['success']) {
                $status = ($result['message'] === 'OTP has expired. Please request a new one.') ? 401 : 401;
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error_type' => ($result['message'] === 'OTP has expired. Please request a new one.') ? 'otp_expired' : 'invalid_otp'
                ], $status);
            }

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
