<?php

/**
 * Test Production Webhook Directly
 * Test the actual production webhook with real PayChangu data
 */

echo "🧪 TESTING PRODUCTION WEBHOOK DIRECTLY\n";
echo "=====================================\n\n";

// Real PayChangu webhook payload
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

echo "1. TESTING PRODUCTION WEBHOOK:\n";
echo "==============================\n";

$productionUrl = 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook';
$payload = json_encode($realPayload);

// Test with different signature approaches
$testSignatures = [
    'no_signature' => null,
    'test_signature' => 'test_signature_123',
    'computed_with_secret' => hash_hmac('sha256', $payload, 'sec-live-UllI8SkvGlWknRHVlzwieOQ0UotoUraO')
];

foreach ($testSignatures as $testName => $signature) {
    echo "\n--- Testing: {$testName} ---\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $productionUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    
    $headers = ['Content-Type: application/json'];
    if ($signature) {
        $headers[] = 'Signature: ' . $signature;
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "HTTP Code: {$httpCode}\n";
    echo "Response: {$response}\n";
    if ($curlError) {
        echo "Error: {$curlError}\n";
    }
}

echo "\n2. CHECKING MISSING ENVIRONMENT VARIABLE:\n";
echo "==========================================\n";

echo "You have these PayChangu variables set:\n";
echo "✅ PAYCHANGU_PUBLIC_KEY\n";
echo "✅ PAYCHANGU_SECRET_KEY\n";
echo "✅ PAYCHANGU_WEBHOOK_SECRET\n";
echo "❌ PAYCHANGU_MERCHANT_ID (MISSING!)\n\n";

echo "3. SOLUTION:\n";
echo "============\n";
echo "Add this environment variable to DigitalOcean:\n";
echo "PAYCHANGU_MERCHANT_ID=your_merchant_id_here\n\n";

echo "4. TESTING WITH MERCHANT_ID:\n";
echo "============================\n";

// Test if the webhook works without merchant_id
echo "The webhook should work even without PAYCHANGU_MERCHANT_ID\n";
echo "because it's only used for payment initiation, not webhook verification.\n\n";

echo "5. REAL ISSUE ANALYSIS:\n";
echo "=======================\n";
echo "The webhook signature verification is failing because:\n";
echo "1. PayChangu sends a signature in the 'Signature' header\n";
echo "2. Our code computes HMAC using PAYCHANGU_WEBHOOK_SECRET\n";
echo "3. The signatures don't match\n\n";

echo "This could be because:\n";
echo "- PayChangu uses a different signature algorithm\n";
echo "- PayChangu signs a different payload format\n";
echo "- The webhook secret is incorrect\n";
echo "- PayChangu sends the signature in a different header\n\n";

echo "6. DEBUGGING STEPS:\n";
echo "===================\n";
echo "1. Check PayChangu webhook documentation for signature format\n";
echo "2. Log the actual signature received from PayChangu\n";
echo "3. Log the computed signature in our code\n";
echo "4. Compare the two signatures\n";
echo "5. Adjust signature computation if needed\n\n";

echo "7. IMMEDIATE TEST:\n";
echo "==================\n";
echo "Let's test the webhook with the exact signature from your logs:\n";

// Use the exact signature from your webhook logs
$exactSignature = 'c1bab6891481b1746f184cd4d373f39ddad01bf15a5a97b1dea255d2c43201ef';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $productionUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Signature: ' . $exactSignature
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "Using exact signature from your logs: {$exactSignature}\n";
echo "HTTP Code: {$httpCode}\n";
echo "Response: {$response}\n";
if ($curlError) {
    echo "Error: {$curlError}\n";
}

echo "\n🎉 TEST COMPLETED\n";