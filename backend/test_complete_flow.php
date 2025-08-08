<?php

// Test complete payment flow: create transaction first, then webhook
echo "Testing complete payment flow...\n";

// Step 1: Create a transaction manually (simulating payment initiation)
$reference = 'TEST_COMPLETE_' . time();
$userId = 1;
$planId = 1;

echo "Step 1: Creating transaction with reference: $reference\n";

// Create transaction data similar to what payment initiation would create
$transactionData = [
    'reference' => $reference,
    'transaction_id' => $reference, // temporary until webhook
    'amount' => 100.00, // plan price
    'currency' => 'MWK',
    'status' => 'pending',
    'payment_method' => 'mobile_money',
    'gateway' => 'paychangu',
    'webhook_data' => [
        'meta' => [
            'user_id' => $userId,
            'plan_id' => $planId,
        ],
        'plan' => [
            'name' => 'Test Plan',
            'price' => 100.00,
            'currency' => 'MWK',
            'text_sessions' => 5,
            'voice_calls' => 2,
            'video_calls' => 1,
            'duration' => 30,
        ],
    ],
];

echo "Transaction data:\n";
print_r($transactionData);
echo "\n";

// Step 2: Test webhook with this transaction
echo "Step 2: Testing webhook with created transaction...\n";

$webhookData = [
    'transaction_id' => 'WEBHOOK_' . time(),
    'reference' => $reference,
    'amount' => 97.00, // amount after fees
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => $userId,
        'plan_id' => $planId,
    ]
];

echo "Webhook data:\n";
print_r($webhookData);
echo "\n";

// Make the webhook request
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
    echo "The subscription should now be activated for user_id=$userId\n";
    
    // Step 3: Check if subscription was created
    echo "\nStep 3: Checking subscription status...\n";
    $statusUrl = "https://docavailable-1.onrender.com/api/payments/status?transaction_id=$reference";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $statusUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json'
    ]);
    
    $statusResponse = curl_exec($ch);
    $statusHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Status HTTP Code: $statusHttpCode\n";
    echo "Status Response:\n";
    $statusData = json_decode($statusResponse, true);
    print_r($statusData);
    
} else {
    echo "\n❌ Webhook failed!\n";
    echo "This means the transaction wasn't created properly or there's an issue with the webhook processing.\n";
} 