<?php

use Illuminate\Support\Facades\Route;
use App\Models\Plan;
use App\Models\User;

Route::get('/', function () {
    return ['Laravel' => app()->version()]; 
});

// OAuth callback is now handled by /api/oauth/callback route

require __DIR__.'/auth.php';
