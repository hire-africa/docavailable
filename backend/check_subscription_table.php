<?php

// Test webhook with Basic Life MWK plan
echo "🔍 Testing subscription table structure...\n";

// First try creating a subscription without plan_id
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
        // Omit plan_id to test nullable
    ]
];

echo "Testing webhook without plan_id:\n";
print_r($testData);
echo "\n";

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
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
if ($curlError) {
    echo "Curl Error: $curlError\n";
}
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if (isset($responseData['error']) && strpos($responseData['error'], 'constraint') !== false) {
    echo "\n❌ plan_id is still NOT NULL in production\n";
    echo "The migration hasn't been applied. You need to:\n";
    echo "1. SSH into the server\n";
    echo "2. Run: php artisan migrate\n";
    echo "3. Or add post-deploy hook in Render:\n";
    echo "   php artisan migrate --force\n";
} else {
    echo "\n✅ plan_id appears to be nullable\n";
    echo "Now testing with an invalid plan_id to verify...\n";
    
    // Try with invalid plan_id
    $testData['meta']['plan_id'] = 999;
    
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
    
    echo "\nInvalid plan_id test - HTTP Status Code: $httpCode\n";
    $responseData = json_decode($response, true);
    print_r($responseData);
}
