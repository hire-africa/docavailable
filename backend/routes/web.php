<?php

use Illuminate\Support\Facades\Route;
use App\Models\Plan;
use App\Models\User;

Route::get('/', function () {
    return ['Laravel' => app()->version()]; 
});

// Fallback OAuth Callback Route (without /api prefix)
Route::get('/oauth/callback', function (Illuminate\Http\Request $request) {
    try {
        $code = $request->query('code');
        $error = $request->query('error');
        
        if ($error) {
            return response()->view('oauth.error', [
                'error' => $error,
                'error_description' => $request->query('error_description', 'Unknown error')
            ]);
        }
        
        if (!$code) {
            return response()->view('oauth.error', [
                'error' => 'missing_code',
                'error_description' => 'Authorization code not provided'
            ]);
        }
        
        // Return a simple HTML page that redirects back to the app
        return response()->view('oauth.success', [
            'code' => $code,
            'state' => $request->query('state', '')
        ]);
        
    } catch (\Exception $e) {
        \Log::error('OAuth callback error', [
            'error' => $e->getMessage(),
            'request' => $request->all()
        ]);
        
        return response()->view('oauth.error', [
            'error' => 'server_error',
            'error_description' => 'An error occurred processing the OAuth callback'
        ]);
    }
});

require __DIR__.'/auth.php';
