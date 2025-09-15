<?php

/**
 * Test webhook processing logic directly
 * This bypasses signature verification to test the core webhook functionality
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\PaymentController;

echo "=== Paychangu Webhook Logic Test ===\n\n";

// Test data matching Paychangu's webhook format
$webhookData = [
    'event_type' => 'api.charge.payment',
    'currency' => 'MWK',
    'amount' => 1000,
    'charge' => '20',
    'mode' => 'test',
    'type' => 'Direct API Payment',
    'status' => 'success',
    'charge_id' => 'test_' . time(),
    'reference' => 'TEST_' . time(),
    'authorization' => [
        'channel' => 'Mobile Money',
        'card_details' => null,
        'bank_payment_details' => null,
        'mobile_money' => [
            'operator' => 'Airtel Money',
            'mobile_number' => '+265123xxxx89'
        ],
        'completed_at' => date('c')
    ],
    'created_at' => date('c'),
    'updated_at' => date('c')
];

$meta = [
    'user_id' => 11,
    'plan_id' => 1
];

echo "Testing with webhook data:\n";
echo json_encode($webhookData, JSON_PRETTY_PRINT) . "\n\n";

echo "Meta data:\n";
echo json_encode($meta, JSON_PRETTY_PRINT) . "\n\n";

try {
    $controller = new PaymentController();
    
    // Call processSuccessfulPayment directly
    $response = $controller->processSuccessfulPayment($webhookData, $meta);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "Response Status: $statusCode\n";
    echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 200 && isset($responseData['success']) && $responseData['success']) {
        echo "✅ Webhook processing test passed - subscription created successfully\n";
        
        // Check if subscription was actually created
        $subscription = \App\Models\Subscription::where('user_id', 11)
            ->where('status', 1)
            ->latest()
            ->first();
            
        if ($subscription) {
            echo "✅ Subscription found in database:\n";
            echo "   ID: " . $subscription->id . "\n";
            echo "   User ID: " . $subscription->user_id . "\n";
            echo "   Plan ID: " . $subscription->plan_id . "\n";
            echo "   Status: " . $subscription->status . "\n";
            echo "   Start Date: " . $subscription->start_date . "\n";
            echo "   End Date: " . $subscription->end_date . "\n";
        } else {
            echo "❌ Subscription not found in database\n";
        }
    } else {
        echo "❌ Webhook processing test failed\n";
    }
    
} catch (Exception $e) {
    echo "❌ Webhook processing error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Test Complete ===\n"; 