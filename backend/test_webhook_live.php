<?php

echo "=== Testing Live Server Endpoints ===\n\n";

// Test 1: Basic server response
$url1 = 'https://docavailable-1.onrender.com/';
echo "1. Testing root endpoint: $url1\n";
$response1 = file_get_contents($url1);
$httpCode1 = $http_response_header[0] ?? 'Unknown';
echo "HTTP Code: " . (strpos($httpCode1, '200') !== false ? '200' : 'Error') . "\n";
echo "Response: " . substr($response1, 0, 100) . "...\n\n";

// Test 2: Health check endpoint
$url2 = 'https://docavailable-1.onrender.com/api/health';
echo "2. Testing health endpoint: $url2\n";
$response2 = file_get_contents($url2);
$httpCode2 = $http_response_header[0] ?? 'Unknown';
echo "HTTP Code: " . (strpos($httpCode2, '200') !== false ? '200' : 'Error') . "\n";
echo "Response: " . substr($response2, 0, 200) . "...\n\n";

// Test 3: Payment webhook endpoint (correct path)
$url3 = 'https://docavailable-1.onrender.com/api/payments/webhook';
echo "3. Testing payment webhook: $url3\n";

// Updated PayChangu keys
$webhookSecret = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'event_type' => 'checkout.payment',
    'first_name' => 'Test',
    'last_name' => 'User',
    'email' => 'test@example.com',
    'currency' => 'MWK',
    'amount' => 100,
    'status' => 'success',
    'reference' => 'TEST_' . time(),
    'tx_ref' => 'TEST_TX_' . time(),
    'meta' => json_encode([
        'user_id' => 13,
        'plan_id' => 1
    ]),
    'customer' => [
        'phone' => '+265123456789',
        'email' => 'test@example.com',
        'first_name' => 'Test',
        'last_name' => 'User'
    ],
    'authorization' => [
        'channel' => 'Mobile Money',
        'mobile_money' => [
            'operator' => 'Airtel Money',
            'mobile_number' => '+265123xxxx89'
        ]
    ],
    'created_at' => date('c'),
    'updated_at' => date('c')
];

$payload = json_encode($webhookData);
$signature = hash_hmac('sha256', $payload, $webhookSecret);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'Signature: ' . $signature
        ],
        'content' => $payload
    ]
]);

$response3 = file_get_contents($url3, false, $context);
$httpCode3 = $http_response_header[0] ?? 'Unknown';
echo "Data: " . json_encode($webhookData, JSON_PRETTY_PRINT) . "\n";
echo "HTTP Code: " . (strpos($httpCode3, '200') !== false ? '200' : (strpos($httpCode3, '401') !== false ? '401' : 'Error')) . "\n";
echo "Response: " . $response3 . "\n\n";

// Test 4: Test webhook endpoint
$url4 = 'https://docavailable-1.onrender.com/api/payments/test-webhook';
echo "4. Testing test webhook endpoint: $url4\n";

$context4 = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json'
        ],
        'content' => json_encode([
            'user_id' => 13,
            'plan_id' => 1,
            'currency' => 'MWK',
            'amount' => 100
        ])
    ]
]);

$response4 = file_get_contents($url4, false, $context4);
$httpCode4 = $http_response_header[0] ?? 'Unknown';
echo "HTTP Code: " . (strpos($httpCode4, '200') !== false ? '200' : 'Error') . "\n";
echo "Response: " . $response4 . "\n\n";

echo "=== Test Complete ===\n";
