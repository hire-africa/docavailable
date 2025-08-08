<?php

// Simple webhook test to debug the 500 error
$url = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Use the exact data from your successful transaction
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

echo "Testing webhook with exact transaction data:\n";
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

// Also test if the transaction exists by checking the status endpoint
echo "\n\nTesting transaction status:\n";
$statusUrl = 'https://docavailable-1.onrender.com/api/payments/status?transaction_id=6749243344';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $statusUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$statusResponse = curl_exec($ch);
$statusHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Status HTTP Code: $statusHttpCode\n";
echo "Status Response:\n";
$statusData = json_decode($statusResponse, true);
print_r($statusData); 