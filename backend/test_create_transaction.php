<?php

// Test to create a transaction first, then test webhook
require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\PaymentTransaction;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

echo "Creating test transaction...\n";

// Create a test transaction
$txRef = 'PLAN_7fe13f9b-7e01-442e-a55b-0534e7faec51';
$transactionId = '6749243344';

try {
    $transaction = PaymentTransaction::updateOrCreate(
        ['reference' => $txRef],
        [
            'transaction_id' => $transactionId,
            'amount' => 97.00,
            'currency' => 'MWK',
            'status' => 'pending',
            'payment_method' => 'mobile_money',
            'gateway' => 'paychangu',
            'webhook_data' => [
                'meta' => [
                    'user_id' => 1,
                    'plan_id' => 1,
                ],
                'plan' => [
                    'name' => 'Test Plan',
                    'price' => 97.00,
                    'currency' => 'MWK',
                    'text_sessions' => 5,
                    'voice_calls' => 2,
                    'video_calls' => 1,
                    'duration' => 30,
                ],
            ],
        ]
    );

    echo "Transaction created/updated successfully!\n";
    echo "Transaction ID: " . $transaction->id . "\n";
    echo "Reference: " . $transaction->reference . "\n";
    echo "Status: " . $transaction->status . "\n";

    // Now test the webhook
    echo "\nTesting webhook with created transaction...\n";
    
    $webhookData = [
        'transaction_id' => $transactionId,
        'reference' => $txRef,
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

    // Test the webhook locally
    $request = new Request($webhookData);
    $controller = new PaymentController();
    
    try {
        $response = $controller->webhook($request);
        echo "Webhook response:\n";
        print_r($response);
        echo "\n✅ Webhook test successful!\n";
    } catch (Exception $e) {
        echo "❌ Webhook error: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error creating transaction: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
} 