<?php

// Test transaction creation only (without subscription processing)
echo "🧪 Testing Transaction Creation Only...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'TX_ONLY_TEST_' . time(),
    'reference' => 'TX_ONLY_TEST_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'pending', // Use pending to avoid subscription processing
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    // Don't include meta data to avoid subscription processing
];

echo "Testing transaction creation only:\n";
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
    echo "\n✅ SUCCESS: Transaction creation is working!\n";
    echo "The issue is specifically with subscription processing.\n";
} else {
    echo "\n❌ FAILED: Transaction creation also has issues\n";
    echo "This suggests a broader database issue.\n";
} 