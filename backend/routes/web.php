<?php

use Illuminate\Support\Facades\Route;
use App\Models\Plan;
use App\Models\User;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

// Google OAuth callback route - handles the redirect and avoids 403 Forbidden
Route::get('/auth/callback', function (\Illuminate\Http\Request $request) {
    // If the frontend is hosted elsewhere, redirect there. 
    // For now, redirect to the oauth-redirect.html which is built to handle this.
    $queryParams = $request->query();
    return redirect('/oauth-redirect.html?' . http_build_query($queryParams));
});

// OAuth callback is now handled by /api/oauth/callback route

require __DIR__ . '/auth.php';
