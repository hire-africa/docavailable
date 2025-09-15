<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;
use App\Mail\VerificationCodeMail;

echo "Testing Real Email Verification...\n";
echo "================================\n\n";

// Ask for email address
echo "Enter your email address to test: ";
$handle = fopen("php://stdin", "r");
$email = trim(fgets($handle));
fclose($handle);

if (empty($email)) {
    echo "No email provided. Using test@example.com\n";
    $email = 'test@example.com';
}

echo "Testing with email: $email\n\n";

// Generate a verification code
$code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

echo "Generated code: $code\n\n";

// Test verification email
echo "Sending verification email...\n";
try {
    Mail::to($email)->send(new VerificationCodeMail($code, $email));
    echo "✅ Verification email sent successfully!\n\n";
    
    echo "📧 Check your email inbox (and spam folder) for the verification code.\n";
    echo "🔑 The verification code is: $code\n\n";
    
    echo "If you don't receive the email, check:\n";
    echo "1. Spam/Junk folder\n";
    echo "2. Gmail settings (if using Gmail)\n";
    echo "3. Laravel logs for errors\n";
    
} catch (Exception $e) {
    echo "❌ Verification email failed: " . $e->getMessage() . "\n\n";
    
    echo "🔧 Troubleshooting steps:\n";
    echo "1. Check your .env file for correct email settings\n";
    echo "2. Ensure Gmail app password is set correctly\n";
    echo "3. Check if 2FA is enabled on Gmail account\n";
    echo "4. Verify MAIL_PASSWORD is the app password, not regular password\n";
}

echo "\nTest completed!\n";
