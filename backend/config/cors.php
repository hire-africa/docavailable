<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:8081',
        'http://172.20.10.11:8081',
        'http://localhost:3000',
        'http://172.20.10.11:8000',
        'http://localhost:8000',
        'exp://172.20.10.11:8081',
        '*'
    ], // Allow all origins for development
    // For production, use specific origins:
    // 'allowed_origins' => [
    //     env('FRONTEND_URL', 'http://localhost:3000'),
    //     'http://172.20.10.11:8000',
    //     'http://localhost:8000',
    //     'exp://172.20.10.11:8081', // Expo development
    // ],

    'allowed_origins_patterns' => [
        '/^http:\/\/192\.168\.\d+\.\d+:\d+$/', // Allow local network IPs
        '/^exp:\/\/.*$/', // Allow Expo development URLs
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
