<?php

echo "🔍 Checking subscription table structure...\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-5.onrender.com/api/debug/table-structure');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'table' => 'subscriptions',
    'check_type' => 'structure'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Response (HTTP $httpCode):\n";
$data = json_decode($response, true);
print_r($data);

// Also check if we can create a subscription directly
echo "\n🔍 Attempting direct subscription creation...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-5.onrender.com/api/subscriptions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'user_id' => 11,
    'status' => 1,
    'start_date' => date('Y-m-d H:i:s'),
    'end_date' => date('Y-m-d H:i:s', strtotime('+30 days')),
    'payment_metadata' => [
        'amount' => 100,
        'currency' => 'MWK',
        'transaction_id' => 'TEST_DIRECT_' . time()
    ]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "\nDirect creation response (HTTP $httpCode):\n";
$data = json_decode($response, true);
print_r($data);
