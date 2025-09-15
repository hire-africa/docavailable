<?php

// Test webhook with 'completed' status directly
echo "🧪 Testing Webhook with Direct 'completed' Status...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DIRECT_COMPLETED_' . time(),
    'reference' => 'DIRECT_COMPLETED_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed', // Send 'completed' directly, no mapping needed
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

echo "Testing webhook with 'completed' status directly:\n";
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
    echo "\n✅ SUCCESS: Webhook is working with 'completed' status!\n";
    echo "The issue was with the status mapping logic.\n";
} else {
    echo "\n❌ FAILED: Webhook still not working with 'completed' status\n";
    echo "This suggests a different issue.\n";
} 