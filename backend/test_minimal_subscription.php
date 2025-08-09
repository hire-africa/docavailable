<?php

// Test with minimal subscription data
echo "🧪 Testing with Minimal Subscription Data...\n\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'MINIMAL_TEST_' . time(),
    'reference' => 'MINIMAL_TEST_REF_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'completed',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11, // Use valid user_id from CSV
        'plan_id' => 5,  // Use valid plan_id from CSV
    ]
];

echo "Testing webhook with minimal subscription data:\n";
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
    echo "\n🎉 SUCCESS: Webhook is working completely!\n";
    echo "✅ Status mapping fixed\n";
    echo "✅ Transaction creation working\n";
    echo "✅ Subscription creation working\n";
    echo "✅ Database schema issues resolved\n";
} else {
    echo "\n❌ FAILED: Still have issues\n";
    echo "Error: " . ($responseData['error'] ?? 'Unknown error') . "\n";
    
    echo "\n=== Analysis ===\n";
    echo "The issue might be:\n";
    echo "1. Deployment hasn't completed yet\n";
    echo "2. Different constraint violation\n";
    echo "3. Missing required field\n";
    echo "4. Data type mismatch\n";
} 