<?php

echo "🔍 Testing subscription creation after deploy...\n\n";

// Test 1: Create subscription without plan_id (amount mapping)
echo "Test 1: Create subscription without plan_id\n";
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
        // No plan_id to test nullable foreign key
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

echo "\nTest Results:\n";
echo "HTTP Status Code: $httpCode\n";
if ($error) {
    echo "Curl Error: $error\n";
}
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200) {
    echo "\n✅ Success! Subscription created without plan_id\n";
    
    // Check subscription details
    echo "\nChecking subscription details...\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/test-webhook');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'user_id' => 11,
        'reference' => 'CHECK_' . time(),
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
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['webhook_response'])) {
            echo "Subscription Details:\n";
            print_r($data['webhook_response']);
        }
    }
} else {
    echo "\n❌ Failed to create subscription\n";
    
    if (isset($responseData['error']) && strpos($responseData['error'], 'constraint') !== false) {
        echo "\nStill hitting constraint error. Possible issues:\n";
        echo "1. Migration didn't run (check deploy logs)\n";
        echo "2. Different constraint failing (check error details)\n";
        echo "3. Database connection issue\n";
        
        // Try to get more error details
        echo "\nTrying to get more error details...\n";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://docavailable-1.onrender.com/api/payments/test-webhook');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'user_id' => 11,
            'reference' => 'DEBUG_' . time(),
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
        
        echo "\nDebug endpoint response:\n";
        print_r(json_decode($response, true));
    }
}
