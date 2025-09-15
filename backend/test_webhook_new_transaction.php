<?php

// Test webhook with a new transaction reference
$url = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Use a new transaction reference that doesn't exist
$webhookData = [
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'PLAN_TEST_' . time(),
    'amount' => 97.00,
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 1,
        'plan_id' => 1,
    ]
];

echo "Testing webhook with new transaction data:\n";
print_r($webhookData);
echo "\n";

// Make the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 404 && isset($responseData['error']) && $responseData['error'] === 'Transaction not found') {
    echo "\n✅ Webhook logic working correctly - transaction not found as expected!\n";
    echo "This means the webhook processing logic is working, but the transaction needs to be created first.\n";
} elseif ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Webhook processed successfully!\n";
} else {
    echo "\n❌ Webhook test failed!\n";
} 