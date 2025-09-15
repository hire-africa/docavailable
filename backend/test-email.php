<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Mail;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Test email configuration
try {
    Mail::raw('Test email from DocAvailable', function($message) {
        $message->to('test@example.com')
                ->subject('Test Email')
                ->from('hello@docavailable.com', 'DocAvailable');
    });
    
    echo "✅ Email test completed successfully!\n";
    echo "Check your email configuration and try sending a real booking.\n";
    
} catch (Exception $e) {
    echo "❌ Email test failed: " . $e->getMessage() . "\n";
    echo "Please check your email configuration in .env file.\n";
} 