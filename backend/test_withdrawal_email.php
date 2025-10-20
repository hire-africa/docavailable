<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Mail\WithdrawalCompletedMail;
use Illuminate\Support\Facades\Mail;

echo "Testing Withdrawal Completion Email...\n";
echo "====================================\n\n";

// Test data
$testData = [
    'doctor_name' => 'Dr. John Smith',
    'amount' => 150.00,
    'payment_method' => 'bank_transfer',
    'bank_name' => 'Chase Bank',
    'account_holder_name' => 'Dr. John Smith',
    'completed_at' => now()->format('Y-m-d H:i:s')
];

echo "Test Data:\n";
foreach ($testData as $key => $value) {
    echo "- $key: $value\n";
}
echo "\n";

// Ask for email address
echo "Enter your email address to test (or press Enter for test@example.com): ";
$handle = fopen("php://stdin", "r");
$email = trim(fgets($handle));
fclose($handle);

if (empty($email)) {
    $email = 'test@example.com';
}

echo "Testing with email: $email\n\n";

// Test withdrawal completion email
echo "Sending withdrawal completion email...\n";
try {
    Mail::to($email)->send(new WithdrawalCompletedMail(
        $testData['doctor_name'],
        $testData['amount'],
        $testData['payment_method'],
        $testData['bank_name'],
        $testData['account_holder_name'],
        $testData['completed_at']
    ));
    
    echo "✅ Withdrawal completion email sent successfully!\n\n";
    
    echo "📧 Check your email inbox (and spam folder) for the withdrawal completion email.\n\n";
    
    echo "If you don't receive the email, check:\n";
    echo "1. Spam/Junk folder\n";
    echo "2. Email configuration in .env file\n";
    echo "3. Laravel logs for errors\n";
    
} catch (Exception $e) {
    echo "❌ Withdrawal completion email failed: " . $e->getMessage() . "\n\n";
    
    echo "🔧 Troubleshooting steps:\n";
    echo "1. Check your .env file for correct email settings\n";
    echo "2. Ensure email template exists at resources/views/emails/withdrawal/completed.blade.php\n";
    echo "3. Check Laravel logs for detailed error information\n";
}

echo "\nTest completed!\n";
