<?php

use Illuminate\Support\Facades\Route;

// Environment test route
Route::get('/env-test', function () {
    return response()->json([
        'DB_PASSWORD_set' => !empty(env('DB_PASSWORD')),
        'DB_PASSWORD_value' => env('DB_PASSWORD') ? 'SET' : 'NOT_SET',
        'DB_PASSWORD_length' => strlen(env('DB_PASSWORD', '')),
        'DB_HOST' => env('DB_HOST'),
        'DB_DATABASE' => env('DB_DATABASE'),
        'DB_USERNAME' => env('DB_USERNAME'),
        'all_env_vars' => array_filter($_ENV, function($key) {
            return strpos($key, 'DB_') === 0;
        }, ARRAY_FILTER_USE_KEY)
    ]);
});
