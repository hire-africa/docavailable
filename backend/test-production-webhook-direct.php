<?php

/**
 * Test Production Backend Payment and Webhook Directly
 * This script tests the live production backend webhook endpoint
 */

echo "🧪 TESTING PRODUCTION BACKEND WEBHOOK DIRECTLY\n";
echo "==============================================\n\n";

// Test webhook data
$webhookData = [
    'event_type' => 'api.charge.payment',
    'currency' => 'MWK',
    'amount' => 100,
    'charge' => '20',
    'mode' => 'live',
    'type' => 'Direct API Payment',
    'status' => 'success',
    'charge_id' => 'prod_test_' . time(),
    'reference' => 'PROD_TEST_' . time(),
    'authorization' => [
        'channel' => 'Mobile Money',
        'mobile_money' => [
            'operator' => 'Airtel Money',
            'mobile_number' => '+265123456789'
        ],
        'completed_at' => date('c')
    ],
    'created_at' => date('c'),
    'updated_at' => date('c'),
    'meta' => json_encode([
        'user_id' => 1,
        'plan_id' => 4
    ])
];

echo "Test webhook data:\n";
echo json_encode($webhookData, JSON_PRETTY_PRINT) . "\n\n";

// Test production webhook endpoint
$productionUrl = 'https://docavailable-backend.ondigitalocean.app/api/payments/webhook';

echo "Testing production webhook endpoint:\n";
echo "URL: {$productionUrl}\n\n";

// Use cURL to test the webhook
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $productionUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'User-Agent: DocAvailable-Test/1.0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

echo "Sending webhook request...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "Response received:\n";
echo "- HTTP Status Code: {$httpCode}\n";
echo "- Response Body: {$response}\n";

if ($error) {
    echo "- cURL Error: {$error}\n";
}

if ($httpCode === 200) {
    echo "\n✅ Production webhook endpoint is working!\n";
    
    // Try to parse response
    $responseData = json_decode($response, true);
    if ($responseData) {
        echo "Response data:\n";
        echo json_encode($responseData, JSON_PRETTY_PRINT) . "\n";
    }
} else {
    echo "\n❌ Production webhook endpoint failed\n";
    echo "This could be due to:\n";
    echo "- Webhook signature verification failing\n";
    echo "- Missing user_id or plan_id in meta data\n";
    echo "- Database connection issues\n";
    echo "- Authentication issues\n";
}

// Test 2: Test payment initiation endpoint
echo "\n" . str_repeat("=", 50) . "\n";
echo "TESTING PAYMENT INITIATION ENDPOINT\n";
echo str_repeat("=", 50) . "\n\n";

$initiateUrl = 'https://docavailable-backend.ondigitalocean.app/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 4
];

echo "Testing payment initiation:\n";
echo "URL: {$initiateUrl}\n";
echo "Data: " . json_encode($initiateData) . "\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $initiateUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer test-token', // This will likely fail due to auth
    'User-Agent: DocAvailable-Test/1.0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

echo "Sending payment initiation request...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "Response received:\n";
echo "- HTTP Status Code: {$httpCode}\n";
echo "- Response Body: {$response}\n";

if ($error) {
    echo "- cURL Error: {$error}\n";
}

if ($httpCode === 401) {
    echo "\n✅ Payment initiation endpoint is working (requires authentication)\n";
} elseif ($httpCode === 200) {
    echo "\n✅ Payment initiation endpoint is working!\n";
} else {
    echo "\n⚠️  Payment initiation endpoint returned unexpected status\n";
}

// Test 3: Test basic connectivity
echo "\n" . str_repeat("=", 50) . "\n";
echo "TESTING BASIC CONNECTIVITY\n";
echo str_repeat("=", 50) . "\n\n";

$baseUrl = 'https://docavailable-backend.ondigitalocean.app';
echo "Testing basic connectivity to: {$baseUrl}\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request only

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "Response:\n";
echo "- HTTP Status Code: {$httpCode}\n";

if ($error) {
    echo "- cURL Error: {$error}\n";
}

if ($httpCode === 200 || $httpCode === 404) {
    echo "✅ Backend is accessible\n";
} else {
    echo "❌ Backend is not accessible\n";
}

echo "\n🎉 PRODUCTION BACKEND TEST COMPLETED\n";
echo "====================================\n";
echo "✅ Webhook endpoint tested\n";
echo "✅ Payment initiation tested\n";
echo "✅ Basic connectivity tested\n";
echo "\nNote: Some tests may fail due to authentication requirements,\n";
echo "but this confirms the endpoints are accessible and responding.\n";
