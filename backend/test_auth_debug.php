<?php

require_once 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Add a test route
Route::post('/test-auth', function (Request $request) {
    try {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated',
                'auth_guard' => Auth::getDefaultDriver(),
                'headers' => $request->headers->all(),
                'token' => $request->bearerToken()
            ], 401);
        }
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->first_name . ' ' . $user->last_name
            ]
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
})->middleware('auth:api');

echo "Test route added. You can test it with:\n";
echo "curl -X POST https://docavailable-3vbdv.ondigitalocean.app/api/test-auth \\\n";
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\\n";
echo "  -H 'Content-Type: application/json'\n";

