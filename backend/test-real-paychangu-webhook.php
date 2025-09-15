<?php

/**
 * Test Real PayChangu Webhook
 * Test with the exact payload you received
 */

require_once 'vendor/autoload.php';

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

echo "🧪 TESTING REAL PAYCHANGU WEBHOOK\n";
echo "=================================\n\n";

try {
    // Initialize Laravel app
    $app = require_once 'bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    
    echo "✅ Laravel app initialized\n\n";
    
    // Exact PayChangu webhook payload from your logs
    $realPayload = [
        "event_type" => "checkout.payment",
        "first_name" => "Jsjdjd",
        "last_name" => "djdjd",
        "email" => "josa@gmail.com",
        "currency" => "MWK",
        "amount" => 100,
        "charge" => 3,
        "amount_split" => [
            "fee_paid_by_customer" => 0,
            "fee_paid_by_merchant" => 3,
            "total_amount_paid_by_customer" => 100,
            "amount_received_by_merchant" => 97
        ],
        "total_amount_paid" => 100,
        "mode" => "live",
        "type" => "API Payment (Checkout)",
        "status" => "success",
        "reference" => "66806395246",
        "tx_ref" => "TXN_1754923308_13",
        "customization" => [
            "title" => "DocAvailable Payment",
            "description" => "Payment for medical consultation services",
            "logo" => null
        ],
        "meta" => "{\"user_id\":13,\"plan_id\":1,\"transaction_id\":98}",
        "customer" => [
            "customer_ref" => "cs_ddb89e13614e8fe",
            "email" => "josa@gmail.com",
            "first_name" => "Jsjdjd",
            "last_name" => "djdjd",
            "phone" => "980794099",
            "created_at" => 1754670159
        ],
        "authorization" => [
            "channel" => "Mobile Money",
            "card_details" => null,
            "bank_payment_details" => null,
            "mobile_money" => [
                "mobile_number" => "+265980xxxx99",
                "operator" => "Airtel Money",
                "trans_id" => null
            ],
            "completed_at" => null
        ],
        "created_at" => "2025-08-11T14:42:43.000000Z",
        "updated_at" => "2025-08-11T14:43:02.000000Z"
    ];
    
    echo "Testing with real PayChangu payload:\n";
    echo "Event Type: {$realPayload['event_type']}\n";
    echo "Status: {$realPayload['status']}\n";
    echo "Amount: {$realPayload['amount']} {$realPayload['currency']}\n";
    echo "Transaction ID: {$realPayload['tx_ref']}\n";
    echo "Meta: {$realPayload['meta']}\n\n";
    
    // Test event type checking manually
    echo "1. Testing event type checking...\n";
    $event = strtolower(trim($realPayload['event_type']));
    $allowedEventTypes = ['api.charge.payment', 'checkout.payment'];
    
    echo "   Event type: '{$realPayload['event_type']}'\n";
    echo "   Normalized: '{$event}'\n";
    echo "   Allowed types: " . json_encode($allowedEventTypes) . "\n";
    echo "   Is allowed: " . (in_array($event, $allowedEventTypes, true) ? 'YES' : 'NO') . "\n\n";
    
    if (!in_array($event, $allowedEventTypes, true)) {
        echo "❌ Event type would be rejected!\n";
        echo "This explains the 'Event type not supported' error.\n";
        exit(1);
    }
    
    // Test meta parsing
    echo "2. Testing meta parsing...\n";
    $meta = json_decode($realPayload['meta'], true);
    $userId = $meta['user_id'] ?? null;
    $planId = $meta['plan_id'] ?? null;
    
    echo "   Meta JSON: {$realPayload['meta']}\n";
    echo "   Parsed meta: " . json_encode($meta) . "\n";
    echo "   User ID: {$userId}\n";
    echo "   Plan ID: {$planId}\n\n";
    
    if (!$userId || !$planId) {
        echo "❌ Missing user_id or plan_id!\n";
        exit(1);
    }
    
    // Test webhook processing
    echo "3. Testing webhook processing...\n";
    
    // Create request with signature header (simulate PayChangu)
    $request = new Request($realPayload);
    $request->headers->set('Signature', 'test_signature_123');
    $request->headers->set('Content-Type', 'application/json');
    
    $controller = new PaymentController();
    
    echo "   Sending webhook request...\n";
    $response = $controller->webhook($request);
    
    echo "   Response Status: " . $response->getStatusCode() . "\n";
    $responseData = json_decode($response->getContent(), true);
    echo "   Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n\n";
    
    if ($response->getStatusCode() === 200 && !isset($responseData['error'])) {
        echo "✅ Webhook processing successful!\n";
    } else {
        echo "❌ Webhook processing failed\n";
        echo "This explains why your payments aren't being processed.\n";
    }
    
    // Test with production webhook endpoint
    echo "4. Testing production webhook endpoint...\n";
    
    $productionUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $productionUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($realPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Signature: test_signature_123'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $productionResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "   Production Response:\n";
    echo "   - HTTP Code: {$httpCode}\n";
    echo "   - Response: {$productionResponse}\n";
    if ($curlError) {
        echo "   - Error: {$curlError}\n";
    }
    
    echo "\n🎉 TEST COMPLETED\n";
    echo "================\n";
    echo "This test shows exactly what happens with your real PayChangu webhook.\n";
    
} catch (\Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
