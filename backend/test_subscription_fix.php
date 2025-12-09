<?php

// Test script to verify subscription creation fix
echo "🔍 Testing Subscription Creation Fix...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Test 1: User with no existing subscription
echo "Test 1: User with no existing subscription\n";
$webhookData1 = [
    'transaction_id' => 'TEST_NO_SUB_' . time(),
    'reference' => 'TEST_NO_SUB_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User No Sub',
    'email' => 'testnosub@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 999, // Use a non-existent user ID to test new subscription creation
        'plan_id' => 1,
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData1));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response1 = curl_exec($ch);
$httpCode1 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode1\n";
echo "Response:\n";
$responseData1 = json_decode($response1, true);
print_r($responseData1);

if ($httpCode1 === 200 && isset($responseData1['success']) && $responseData1['success']) {
    echo "✅ SUCCESS: New subscription creation is working!\n";
} else {
    echo "❌ FAILED: New subscription creation still has issues\n";
    if (isset($responseData1['error'])) {
        echo "Error: " . $responseData1['error'] . "\n";
    }
}

echo "\n" . str_repeat("-", 50) . "\n\n";

// Test 2: User with existing subscription
echo "Test 2: User with existing subscription\n";
$webhookData2 = [
    'transaction_id' => 'TEST_EXISTING_SUB_' . time(),
    'reference' => 'TEST_EXISTING_SUB_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User Existing Sub',
    'email' => 'testexistingsub@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 1, // Use an existing user ID
        'plan_id' => 1,
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData2));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response2 = curl_exec($ch);
$httpCode2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode2\n";
echo "Response:\n";
$responseData2 = json_decode($response2, true);
print_r($responseData2);

if ($httpCode2 === 200 && isset($responseData2['success']) && $responseData2['success']) {
    echo "✅ SUCCESS: Existing subscription update is working!\n";
} else {
    echo "❌ FAILED: Existing subscription update has issues\n";
    if (isset($responseData2['error'])) {
        echo "Error: " . $responseData2['error'] . "\n";
    }
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "Test completed. Check the results above.\n";