<?php

// Test payment initiation flow
echo "🔍 TESTING PAYMENT INITIATION FLOW\n";
echo "==================================\n\n";

// Test 1: Check if payment initiation endpoint exists
echo "1. Testing payment initiation endpoint...\n";
$initiateUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 5
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $initiateUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN' // This will fail, but we can see the response
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Payment Initiation HTTP Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// Test 2: Check if the test webhook endpoint exists
echo "\n2. Testing test webhook endpoint...\n";
$testWebhookUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testWebhookData = [
    'user_id' => 11,
    'plan_id' => 5,
    'reference' => 'TEST_INIT_' . time(),
    'amount' => 50.00,
    'currency' => 'USD'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testWebhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testWebhookData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test Webhook HTTP Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// Test 3: Check if we can create a transaction manually
echo "\n3. Testing manual transaction creation...\n";
$createTransactionUrl = 'https://docavailable-1.onrender.com/api/payments/create-transaction';

$transactionData = [
    'reference' => 'MANUAL_TEST_' . time(),
    'amount' => 50.00,
    'currency' => 'USD',
    'user_id' => 11,
    'plan_id' => 5
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createTransactionUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($transactionData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Create Transaction HTTP Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

echo "The main issue is that transactions are not being created during payment initiation.\n";
echo "This means when PayChangu sends a webhook, there's no transaction to find.\n\n";

echo "🔧 ROOT CAUSE:\n";
echo "1. Payment initiation is not creating transactions in the database\n";
echo "2. Webhook processing fails because it can't find the transaction\n";
echo "3. No subscription is created because the webhook fails\n\n";

echo "🎯 SOLUTION:\n";
echo "1. Fix the payment initiation to create transactions\n";
echo "2. Ensure the transaction is created with the correct reference\n";
echo "3. Make sure the webhook can find the transaction\n";
echo "4. Test the complete flow from initiation to webhook\n\n";

echo "The issue is NOT in the webhook processing - it's in the payment initiation!\n"; 