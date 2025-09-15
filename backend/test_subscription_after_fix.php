<?php

echo "🔍 Testing subscription creation after migrations...\n\n";

// Test 1: Create subscription with plan_id
echo "Test 1: Create subscription with Basic Life MWK plan (plan_id=1)\n";
$testData = [
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'TEST_SUB_' . time(),
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
        'user_id' => 11,
        'plan_id' => 1,
    ]
];

echo "\nSending webhook data:\n";
print_r($testData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/webhook');
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

echo "\nTest 1 Results:\n";
echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
print_r(json_decode($response, true));

// Test 2: Create subscription without plan_id (amount mapping)
echo "\n\nTest 2: Create subscription without plan_id (amount mapping)\n";
$testData2 = [
    'transaction_id' => 'TEST_' . time(),
    'reference' => 'TEST_SUB_' . time(),
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
        'user_id' => 11,
        // Omitting plan_id to test nullable foreign key
    ]
];

echo "\nSending webhook data:\n";
print_r($testData2);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData2));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "\nTest 2 Results:\n";
echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
print_r(json_decode($response, true));

// Check final subscription status
echo "\nChecking final subscription status for user 11...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://docavailable-1.onrender.com/api/subscriptions/patient/11");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Subscription Status Check:\n";
echo "HTTP Status Code: $httpCode\n";
if ($httpCode === 200) {
    $data = json_decode($response, true);
    if (isset($data['subscription'])) {
        echo "✅ Active subscription found:\n";
        print_r($data['subscription']);
    } else {
        echo "❌ No subscription in response\n";
    }
} else {
    echo "❌ Failed to check subscription\n";
    echo "Response:\n";
    print_r(json_decode($response, true));
}
