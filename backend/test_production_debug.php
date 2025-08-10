<?php

// Debug script to check production server configuration
echo "🔍 Debugging Production Server Configuration...\n\n";

$webhookData = [
    'event_type' => 'checkout.payment',
    'first_name' => 'Test',
    'last_name' => 'User',
    'email' => 'test@example.com',
    'currency' => 'MWK',
    'amount' => 100,
    'status' => 'success',
    'reference' => 'TEST_REF_' . time(),
    'tx_ref' => 'PLAN_TEST_' . time(),
    'meta' => json_encode([
        'user_id' => 11,
        'plan_id' => 5
    ]),
    'customer' => [
        'phone' => '+265123456789',
        'email' => 'test@example.com'
    ],
    'authorization' => [
        'channel' => 'Mobile Money',
        'mobile_money' => [
            'operator' => 'Airtel Money'
        ]
    ],
    'created_at' => date('Y-m-d\TH:i:s.000000\Z')
];

// First, let's test a simple endpoint to see if the server is responding
echo "Testing server response...\n";
$ch = curl_init('https://docavailable-1.onrender.com/api/payments/status');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Status endpoint HTTP Code: $httpCode\n";
echo "Status Response: " . $response . "\n\n";

// Now test the webhook with more detailed error logging
echo "Testing webhook with detailed logging...\n";
$ch = curl_init('https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "Webhook HTTP Code: $httpCode\n";
if ($curlError) {
    echo "Curl Error: $curlError\n";
}
echo "Webhook Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);
