<?php

/**
 * Test webhook logic without signature verification
 * This is for testing the webhook processing logic when webhook secret is not properly configured
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "=== Paychangu Webhook Logic Test (Without Signature) ===\n\n";

// Test 1: Valid Paychangu webhook payload
echo "1. Testing with valid Paychangu webhook payload...\n";

$validWebhookData = [
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
    'updated_at' => date('c'),
    'meta' => json_encode([
        'user_id' => 11,
        'plan_id' => 1
    ])
];

// Create request without signature verification
$request = new Request($validWebhookData);
$request->headers->set('Content-Type', 'application/json');

// Temporarily modify the webhook method to skip signature verification
try {
    $controller = new PaymentController();
    
    // Use reflection to access the webhook method
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('webhook');
    $method->setAccessible(true);
    
    // Call webhook method directly
    $response = $method->invoke($controller, $request);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "Response Status: $statusCode\n";
    echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 200 && isset($responseData['success']) && $responseData['success']) {
        echo "✅ Webhook logic test passed - subscription created successfully\n";
    } else {
        echo "❌ Webhook logic test failed\n";
    }
    
} catch (Exception $e) {
    echo "❌ Webhook test error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

// Test 2: Missing event_type
echo "\n2. Testing with missing event_type...\n";

$invalidData = $validWebhookData;
unset($invalidData['event_type']);

$invalidRequest = new Request($invalidData);
$invalidRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('webhook');
    $method->setAccessible(true);
    
    $response = $method->invoke($controller, $invalidRequest);
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 400) {
        echo "✅ Missing event_type correctly rejected (400 Bad Request)\n";
    } else {
        echo "❌ Missing event_type not rejected properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Missing event_type test error: " . $e->getMessage() . "\n";
}

// Test 3: Unsupported event_type
echo "\n3. Testing with unsupported event_type...\n";

$unsupportedData = $validWebhookData;
$unsupportedData['event_type'] = 'api.payout';

$unsupportedRequest = new Request($unsupportedData);
$unsupportedRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('webhook');
    $method->setAccessible(true);
    
    $response = $method->invoke($controller, $unsupportedRequest);
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 200) {
        echo "✅ Unsupported event_type correctly handled (200 OK with message)\n";
    } else {
        echo "❌ Unsupported event_type not handled properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Unsupported event_type test error: " . $e->getMessage() . "\n";
}

// Test 4: Missing user_id in meta
echo "\n4. Testing with missing user_id in meta...\n";

$noUserIdData = $validWebhookData;
$noUserIdData['meta'] = json_encode(['plan_id' => 1]); // No user_id

$noUserIdRequest = new Request($noUserIdData);
$noUserIdRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('webhook');
    $method->setAccessible(true);
    
    $response = $method->invoke($controller, $noUserIdRequest);
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 400) {
        echo "✅ Missing user_id correctly rejected (400 Bad Request)\n";
    } else {
        echo "❌ Missing user_id not rejected properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Missing user_id test error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
echo "\nNote: These tests bypass signature verification for logic testing.\n";
echo "For production, ensure PAYCHANGU_WEBHOOK_SECRET is properly configured.\n";
