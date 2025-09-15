<?php

// Local webhook test that bypasses signature verification
require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "Testing webhook processing locally...\n";

// Create a test request with webhook data
$webhookData = [
    'transaction_id' => '6749243344',
    'reference' => 'PLAN_7fe13f9b-7e01-442e-a55b-0534e7faec51',
    'amount' => 97.00,
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Jsjdjd djdjd',
    'email' => 'josa@gmail.com',
    'paid_at' => '2025-08-08 06:27:00',
    'meta' => [
        'user_id' => 1,
        'plan_id' => 1,
    ]
];

echo "Webhook data:\n";
print_r($webhookData);
echo "\n";

try {
    // Create a mock request
    $request = new Request($webhookData);
    
    // Create controller instance
    $controller = new PaymentController();
    
    // Call webhook method directly
    $response = $controller->webhook($request);
    
    echo "Response:\n";
    print_r($response);
    
    echo "\n✅ Local webhook test completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} 