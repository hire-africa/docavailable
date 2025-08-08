<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'paychangu' => [
        'public_key' => env('PAYCHANGU_PUBLIC_KEY'),
        'secret_key' => env('PAYCHANGU_SECRET_KEY'),
        'merchant_id' => env('PAYCHANGU_MERCHANT_ID'),
        'webhook_secret' => env('PAYCHANGU_WEBHOOK_SECRET'),
        'environment' => env('PAYCHANGU_ENVIRONMENT', 'production'),
        // Explicit endpoints so we can change without code edits if docs update
        'payment_url' => env('PAYCHANGU_PAYMENT_URL', 'https://api.paychangu.com/payment'),
        'verify_url' => env('PAYCHANGU_VERIFY_URL', 'https://api.paychangu.com/payment/verify'),
        'callback_url' => env('PAYCHANGU_CALLBACK_URL'),
        'return_url' => env('PAYCHANGU_RETURN_URL'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
    ],
    
    'onesignal' => [
        'app_id' => env('ONESIGNAL_APP_ID'),
        'rest_api_key' => env('ONESIGNAL_REST_API_KEY'),
    ],

];
