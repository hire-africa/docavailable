<?php

echo "🔍 Testing subscription creation after successful deployment...\n\n";

// First, let's check available plans
echo "1️⃣ Checking available plans...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/plans/all');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Plans Response (HTTP $httpCode):\n";
$plansData = json_decode($response, true);
print_r($plansData);

// Now test subscription creation
echo "\n2️⃣ Testing subscription creation with webhook...\n";
$testData = [
    'transaction_id' => 'TEST_DEPLOY_' . time(),
    'reference' => 'TEST_SUB_DEPLOY_' . time(),
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
$error = curl_error($ch);
curl_close($ch);

echo "\nWebhook Response:\n";
echo "HTTP Status Code: $httpCode\n";
if ($error) {
    echo "Curl Error: $error\n";
}
echo "Response Body:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// If successful, verify the subscription
if ($httpCode === 200) {
    echo "\n✅ Success! Verifying subscription details...\n";
    sleep(2); // Give a moment for DB to settle
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/test-webhook');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'user_id' => 11,
        'reference' => 'VERIFY_' . time(),
        'amount' => 1.00,
        'currency' => 'MWK'
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "\nVerification Response:\n";
    echo "HTTP Status Code: $httpCode\n";
    $data = json_decode($response, true);
    print_r($data);
} else {
    echo "\n❌ Webhook call failed. Check the error response above for details.\n";
}
