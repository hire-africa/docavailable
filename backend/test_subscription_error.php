<?php

// Test to get detailed subscription error information
echo "🔍 Testing Subscription Table Error...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'SUBSCRIPTION_TEST_' . time(),
    'reference' => 'SUBSCRIPTION_TEST_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
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

echo "Testing webhook with subscription processing:\n";
print_r($webhookData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
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
    echo "\n✅ SUCCESS: Webhook is working correctly!\n";
} else {
    echo "\n❌ FAILED: Subscription table constraint violation\n";
    echo "This suggests there's a missing field or constraint in the subscription table.\n";
} 