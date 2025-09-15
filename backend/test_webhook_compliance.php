<?php

/**
 * Test script to verify Paychangu webhook compliance
 * This script tests our webhook implementation against Paychangu's documentation requirements
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "=== Paychangu Webhook Compliance Test ===\n\n";

// Test 1: Verify webhook secret is configured
echo "1. Checking webhook secret configuration...\n";
$webhookSecret = config('services.paychangu.webhook_secret');
if (empty($webhookSecret)) {
    echo "❌ Webhook secret not configured in .env file\n";
    echo "   Add: PAYCHANGU_WEBHOOK_SECRET=your_secret_from_dashboard\n\n";
} else {
    echo "✅ Webhook secret is configured\n\n";
}

// Test 2: Test with valid Paychangu webhook payload
echo "2. Testing with valid Paychangu webhook payload...\n";

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

$payload = json_encode($validWebhookData);

// Generate signature if webhook secret is available
if (!empty($webhookSecret)) {
    $signature = hash_hmac('sha256', $payload, $webhookSecret);
    echo "✅ Generated signature for test\n";
} else {
    $signature = 'test_signature';
    echo "⚠️ Using test signature (webhook secret not configured)\n";
}

// Create request with headers
$request = new Request($validWebhookData);
$request->headers->set('Signature', $signature);
$request->headers->set('Content-Type', 'application/json');

// Test the webhook
try {
    $controller = new PaymentController();
    $response = $controller->webhook($request);
    
    $responseData = json_decode($response->getContent(), true);
    $statusCode = $response->getStatusCode();
    
    echo "Response Status: $statusCode\n";
    echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($statusCode === 200 && isset($responseData['success']) && $responseData['success']) {
        echo "✅ Webhook test passed - subscription created successfully\n";
    } else {
        echo "❌ Webhook test failed\n";
    }
    
} catch (Exception $e) {
    echo "❌ Webhook test error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

// Test 3: Test with invalid signature
echo "\n3. Testing with invalid signature...\n";

$invalidRequest = new Request($validWebhookData);
$invalidRequest->headers->set('Signature', 'invalid_signature');
$invalidRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $response = $controller->webhook($invalidRequest);
    
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 401) {
        echo "✅ Invalid signature correctly rejected (401 Unauthorized)\n";
    } else {
        echo "❌ Invalid signature not rejected properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Invalid signature test error: " . $e->getMessage() . "\n";
}

// Test 4: Test with missing event_type
echo "\n4. Testing with missing event_type...\n";

$invalidData = $validWebhookData;
unset($invalidData['event_type']);

$invalidRequest = new Request($invalidData);
$invalidRequest->headers->set('Signature', $signature);
$invalidRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $response = $controller->webhook($invalidRequest);
    
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 400) {
        echo "✅ Missing event_type correctly rejected (400 Bad Request)\n";
    } else {
        echo "❌ Missing event_type not rejected properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Missing event_type test error: " . $e->getMessage() . "\n";
}

// Test 5: Test with unsupported event_type
echo "\n5. Testing with unsupported event_type...\n";

$unsupportedData = $validWebhookData;
$unsupportedData['event_type'] = 'api.payout';

$unsupportedRequest = new Request($unsupportedData);
$unsupportedRequest->headers->set('Signature', $signature);
$unsupportedRequest->headers->set('Content-Type', 'application/json');

try {
    $controller = new PaymentController();
    $response = $controller->webhook($unsupportedRequest);
    
    $statusCode = $response->getStatusCode();
    
    if ($statusCode === 200) {
        echo "✅ Unsupported event_type correctly handled (200 OK with message)\n";
    } else {
        echo "❌ Unsupported event_type not handled properly (Status: $statusCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Unsupported event_type test error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
echo "\nNext steps:\n";
echo "1. Configure PAYCHANGU_WEBHOOK_SECRET in your .env file\n";
echo "2. Set webhook URL in Paychangu dashboard: https://docavailable-1.onrender.com/api/payments/webhook\n";
echo "3. Test with real Paychangu webhooks\n";
