<?php

echo "🔍 Debugging Production Webhook...\n\n";

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

echo "Sending webhook data:\n";
print_r($webhookData);
echo "\n";

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

echo "HTTP Status Code: $httpCode\n";
if ($curlError) {
    echo "Curl Error: $curlError\n";
}
echo "Raw Response:\n";
echo $response . "\n\n";

$responseData = json_decode($response, true);
echo "Parsed Response:\n";
print_r($responseData);
