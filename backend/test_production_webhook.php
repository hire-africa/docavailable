<?php

// Test to check production server database configuration
echo "🔍 Testing Production Server Database Configuration...\n\n";

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

// Send to production server
$ch = curl_init('https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n🎉 SUCCESS: Webhook is working on production!\n";
} else {
    echo "\n❌ FAILED: Production webhook test failed\n";
    echo "Error: " . ($responseData['error'] ?? 'Unknown error') . "\n";
}
