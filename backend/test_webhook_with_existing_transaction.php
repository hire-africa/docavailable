<?php

// Test webhook with a transaction that actually exists
echo "Testing webhook with existing transaction...\n";

// First, let's create a test transaction in the live database
$url = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 1,
    'plan_id' => 1,
    'reference' => 'TEST_' . time(),
    'amount' => 97.00,
    'currency' => 'MWK',
    'status' => 'success'
];

echo "Creating test transaction with data:\n";
print_r($testData);
echo "\n";

// Make the request to create a test transaction
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
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

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Test transaction created successfully!\n";
    echo "Now testing webhook processing...\n";
    
    // Now test the actual webhook with this transaction
    $webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';
    
    $webhookData = [
        'transaction_id' => 'TEST_WEBHOOK_' . time(),
        'reference' => $testData['reference'],
        'amount' => 97.00,
        'currency' => 'MWK',
        'status' => 'success',
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
    
    echo "\nTesting webhook with data:\n";
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
    
    $webhookResponse = curl_exec($ch);
    $webhookHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Webhook HTTP Code: $webhookHttpCode\n";
    echo "Webhook Response:\n";
    $webhookResponseData = json_decode($webhookResponse, true);
    print_r($webhookResponseData);
    
    if ($webhookHttpCode === 200 && isset($webhookResponseData['success']) && $webhookResponseData['success']) {
        echo "\n✅ Webhook processed successfully!\n";
        echo "The subscription should now be activated for user_id=1\n";
    } else {
        echo "\n❌ Webhook failed!\n";
    }
    
} else {
    echo "\n❌ Failed to create test transaction!\n";
    echo "This suggests there's an issue with the payment initiation process.\n";
} 