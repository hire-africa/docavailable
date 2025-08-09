<?php

echo "🔍 Checking environment configuration...\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Health Check Response (HTTP $httpCode):\n";
$data = json_decode($response, true);
print_r($data);

// Also test the database connection via webhook endpoint
echo "\n🔍 Testing database connection via webhook...\n";

$testData = [
    'transaction_id' => 'TEST_ENV_' . time(),
    'reference' => 'TEST_SUB_ENV_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/test-webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "\nWebhook Test Response (HTTP $httpCode):\n";
$data = json_decode($response, true);
print_r($data);
