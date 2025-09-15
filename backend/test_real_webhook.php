<?php

// Test the actual webhook endpoint with real transaction data
$url = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Simulate the actual PayChangu webhook data based on your transaction logs
$webhookData = [
    'transaction_id' => '6749243344', // Payment Reference from your logs
    'reference' => 'PLAN_7fe13f9b-7e01-442e-a55b-0534e7faec51', // API Reference from your logs
    'amount' => 97.00, // Amount Received from your logs
    'currency' => 'MWK',
    'status' => 'success', // or 'confirmed' or 'completed'
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Jsjdjd djdjd',
    'email' => 'josa@gmail.com',
    'paid_at' => '2025-08-08 06:27:00',
    'meta' => [
        'user_id' => 1, // Replace with actual user ID
        'plan_id' => 1, // Replace with actual plan ID
    ]
];

echo "Testing actual webhook endpoint with data:\n";
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

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Webhook test successful!\n";
} else {
    echo "\n❌ Webhook test failed!\n";
} 