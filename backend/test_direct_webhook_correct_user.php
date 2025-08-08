<?php

// Test webhook directly with correct user ID (13)
echo "Testing webhook directly with correct user ID (13)...\n";

// Test the webhook directly with correct user ID
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DIRECT_TEST_' . time(),
    'reference' => 'CORRECT_USER_1754687614', // Use the reference from previous test
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
        'user_id' => 13, // Correct user ID
        'plan_id' => 1,  // Plan ID that exists
    ]
];

echo "Testing webhook with correct data:\n";
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
    echo "\n✅ Webhook processed successfully!\n";
    echo "The subscription should now be activated for user_id=13\n";
} else {
    echo "\n❌ Webhook failed!\n";
    echo "Error details:\n";
    print_r($responseData);
}

echo "\n=== Analysis ===\n";
echo "Testing with:\n";
echo "- User ID: 13 (correct)\n";
echo "- Plan ID: 1 (exists)\n";
echo "- Reference: CORRECT_USER_1754687614 (from previous test)\n";
echo "- Amount: 97 MWK (after fees)\n\n";

echo "If this still fails, there might be another issue in the webhook processing logic.\n";
echo "The transaction should exist from the previous test.\n"; 