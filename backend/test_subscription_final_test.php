<?php

echo "🔍 Testing subscription creation with new database connection...\n\n";

// Test data with amount that should match a seeded plan
$testData = [
    'transaction_id' => 'TEST_FINAL_' . time(),
    'reference' => 'TEST_SUB_FINAL_' . time(),
    'amount' => 100.00, // This should match one of the seeded plan prices
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11 // Using a user ID that should exist after seeding
    ]
];

echo "📤 Sending webhook data to: https://docavailable-1.onrender.com/api/payments/webhook\n";
echo "Data:\n";
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

echo "\n📥 Response:\n";
echo "HTTP Status Code: $httpCode\n";
if ($error) {
    echo "Curl Error: $error\n";
}
echo "Response Body:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// If successful, verify the subscription
if ($httpCode === 200) {
    echo "\n✅ Webhook call successful! Verifying subscription...\n";
    sleep(2); // Give a moment for DB to settle
    
    // Use test-webhook endpoint to verify
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
