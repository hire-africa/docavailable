<?php

// Test complete payment flow
echo "Testing complete payment flow...\n";

// Step 1: Initiate payment (this should create the transaction)
$initiateUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 1
];

echo "Step 1: Initiating payment...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $initiateUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer YOUR_TOKEN_HERE' // You'll need to replace this with a real token
]);

$initiateResponse = curl_exec($ch);
$initiateHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Initiate HTTP Code: $initiateHttpCode\n";
echo "Initiate Response:\n";
$initiateData = json_decode($initiateResponse, true);
print_r($initiateData);

if ($initiateHttpCode === 200 && isset($initiateData['success']) && $initiateData['success']) {
    $txRef = $initiateData['tx_ref'];
    echo "\n✅ Payment initiated successfully! TX Ref: $txRef\n";
    
    // Step 2: Simulate webhook for this transaction
    echo "\nStep 2: Simulating webhook...\n";
    
    $webhookData = [
        'transaction_id' => 'TEST_' . time(),
        'reference' => $txRef,
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
    
    $webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';
    
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
    } else {
        echo "\n❌ Webhook failed!\n";
    }
    
} else {
    echo "\n❌ Payment initiation failed!\n";
} 