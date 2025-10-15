<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
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

        // Generate password reset token
        $token = Password::getRepository()->create($user);
        
        // Generate reset URL
        $resetUrl = config('app.frontend_url') . '/password-reset/' . $token . '?email=' . urlencode($email);

        try {
            // Send custom password reset email
            Mail::to($user->email)->send(new PasswordResetMail($user, $resetUrl));
            
            Log::info('Password reset email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'user_type' => $user->user_type
            ]);

            // For development: Log the reset link to a file for easy access
            if (app()->environment('local')) {
                $resetData = [
                    'email' => $email,
                    'user_id' => $user->id,
                    'timestamp' => now()->toISOString(),
                    'reset_url' => $resetUrl,
                    'token' => $token,
                    'note' => 'Direct link for testing - expires in 60 minutes'
                ];
                
                $logFile = storage_path('logs/password_reset_links.log');
                File::append($logFile, json_encode($resetData) . "\n");
            }

            return response()->json([
                'success' => true,
                'message' => 'Password reset link has been sent to your email address.',
                'status' => 'reset_link_sent'
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
