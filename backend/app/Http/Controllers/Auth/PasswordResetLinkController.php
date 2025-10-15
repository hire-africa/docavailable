<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCodeMail;
use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $request->email;
        
        // Check if user exists
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'We can\'t find a user with that email address.',
                'error_type' => 'user_not_found'
            ], 404);
        }

        // Generate password reset code
        $resetCode = PasswordResetCode::createForEmail($email);

        try {
            // Send custom password reset code email
            Mail::to($user->email)->send(new PasswordResetCodeMail($user, $resetCode->code));
            
            Log::info('Password reset code sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'code' => $resetCode->code
            ]);

            // For development: Log the reset code to a file for easy access
            if (app()->environment('local')) {
                $resetData = [
                    'email' => $email,
                    'user_id' => $user->id,
                    'timestamp' => now()->toISOString(),
                    'code' => $resetCode->code,
                    'expires_at' => $resetCode->expires_at->toISOString(),
                    'note' => 'Code for testing - expires in 10 minutes'
                ];
                
                $logFile = storage_path('logs/password_reset_codes.log');
                \Illuminate\Support\Facades\File::append($logFile, json_encode($resetData) . "\n");
            }

            return response()->json([
                'success' => true,
                'message' => 'Password reset code has been sent to your email address.',
                'status' => 'reset_code_sent'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send password reset email. Please try again later.',
                'error_type' => 'email_send_failed'
            ], 500);
        }
    }
}
