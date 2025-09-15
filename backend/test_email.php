<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

echo "Testing Email Configuration...\n";
echo "=============================\n\n";

// Check mail configuration
echo "Mail Configuration:\n";
echo "MAIL_MAILER: " . config('mail.default') . "\n";
echo "MAIL_HOST: " . config('mail.mailers.smtp.host') . "\n";
echo "MAIL_PORT: " . config('mail.mailers.smtp.port') . "\n";
echo "MAIL_USERNAME: " . config('mail.mailers.smtp.username') . "\n";
echo "MAIL_FROM_ADDRESS: " . config('mail.from.address') . "\n";
echo "MAIL_FROM_NAME: " . config('mail.from.name') . "\n\n";

// Test simple email
echo "Testing simple email...\n";
try {
    Mail::raw('Test email from Doc Available - ' . date('Y-m-d H:i:s'), function($message) {
        $message->to('test@example.com')
                ->subject('Test Email - ' . date('Y-m-d H:i:s'));
    });
    echo "✅ Simple email sent successfully!\n\n";
} catch (Exception $e) {
    echo "❌ Simple email failed: " . $e->getMessage() . "\n\n";
}

// Test verification email
echo "Testing verification email...\n";
try {
    $code = '123456';
    $email = 'test@example.com';
    
    Mail::to($email)->send(new \App\Mail\VerificationCodeMail($code, $email));
    echo "✅ Verification email sent successfully!\n\n";
} catch (Exception $e) {
    echo "❌ Verification email failed: " . $e->getMessage() . "\n\n";
}

echo "Test completed!\n";
