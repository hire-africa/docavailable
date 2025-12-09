<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;

class PasswordResetCodeController extends Controller
{
    /**
     * Verify the reset code
     */
    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $email = $request->email;
        $code = $request->code;

        // Verify the code
        $resetCode = PasswordResetCode::verifyCode($email, $code);

        if (!$resetCode) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification code. Please request a new one.',
                'error_type' => 'invalid_code'
            ], 400);
        }

        Log::info('Password reset code verified successfully', [
            'email' => $email,
            'code' => $code
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Verification code is valid. You can now reset your password.',
            'status' => 'code_verified'
        ]);
    }

    /**
     * Reset password with verified code
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $email = $request->email;
        $code = $request->code;
        $password = $request->password;

        // Verify the code again
        $resetCode = PasswordResetCode::verifyCode($email, $code);

        if (!$resetCode) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification code. Please request a new one.',
                'error_type' => 'invalid_code'
            ], 400);
        }

        // Find the user
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
                'error_type' => 'user_not_found'
            ], 404);
        }

        try {
            // Update the user's password
            $user->update([
                'password' => Hash::make($password)
            ]);

            // Mark the code as used
            $resetCode->markAsUsed();

            // Clean up any other unused codes for this email
            PasswordResetCode::where('email', $email)
                ->where('id', '!=', $resetCode->id)
                ->delete();

            Log::info('Password reset completed successfully', [
                'user_id' => $user->id,
                'email' => $email,
                'code_used' => $code
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Your password has been reset successfully. You can now log in with your new password.',
                'status' => 'password_reset'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to reset password', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password. Please try again.',
                'error_type' => 'reset_failed'
            ], 500);
        }
    }
}