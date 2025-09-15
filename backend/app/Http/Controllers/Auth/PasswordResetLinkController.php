<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
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

        // We will send the password reset link to this user. Once we have attempted
        // to send the link, we will examine the response then see the message we
        // need to show to the user. Finally, we'll send out a proper response.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status != Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        // For development: Log the reset link to a file for easy access
        if (app()->environment('local')) {
            $email = $request->email;
            $resetData = [
                'email' => $email,
                'timestamp' => now()->toISOString(),
                'reset_link' => config('app.frontend_url') . '/password-reset/{TOKEN}?email=' . $email,
                'note' => 'Replace {TOKEN} with the actual token from the email log'
            ];
            
            $logFile = storage_path('logs/password_reset_links.log');
            File::append($logFile, json_encode($resetData) . "\n");
            
            Log::info('Password reset link requested for: ' . $email);
        }

        return response()->json([
            'success' => true,
            'message' => __($status),
            'status' => __($status)
        ]);
    }
}
