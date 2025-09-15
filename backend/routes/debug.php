<?php

use Illuminate\Support\Facades\Route;
use App\Models\User;

// Debug routes for troubleshooting
Route::get('/debug/user/{email}', function ($email) {
    try {
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
                'email' => $email
            ]);
        }
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'has_password' => !empty($user->password),
                'password_length' => strlen($user->password ?? '')
            ]
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'type' => get_class($e)
        ], 500);
    }
});

Route::post('/debug/login-test', function (Illuminate\Http\Request $request) {
    try {
        $email = $request->input('email');
        $password = $request->input('password');
        
        // Test user lookup
        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
                'step' => 'user_lookup'
            ]);
        }
        
        // Test password verification
        $passwordValid = password_verify($password, $user->password);
        if (!$passwordValid) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid password',
                'step' => 'password_verification',
                'user_status' => $user->status,
                'user_type' => $user->user_type
            ]);
        }
        
        // Test JWT token generation
        $token = auth('api')->attempt(['email' => $email, 'password' => $password]);
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'JWT token generation failed',
                'step' => 'jwt_generation',
                'user_status' => $user->status,
                'user_type' => $user->user_type
            ]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Login test successful',
            'token_length' => strlen($token),
            'user_status' => $user->status,
            'user_type' => $user->user_type
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'type' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
});
