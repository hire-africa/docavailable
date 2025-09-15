<?php

// Test webhook with detailed error logging
echo "Testing webhook with detailed error information...\n";

// Test the webhook directly with a transaction that exists
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'ERROR_TEST_' . time(),
    'reference' => 'FIXED_TEST_1754687331', // Use the reference from previous test
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

echo "Testing webhook with data:\n";
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
    echo "The subscription should now be activated for user_id=1\n";
} else {
    echo "\n❌ Webhook failed!\n";
    echo "Error details:\n";
    print_r($responseData);
}

echo "\n=== Analysis ===\n";
echo "The webhook processing is failing with 'Webhook processing failed'.\n";
echo "This suggests an error in:\n";
echo "1. processSuccessfulPayment method\n";
echo "2. activatePlanForUser method\n";
echo "3. Database transaction issues\n";
echo "4. Plan lookup issues (plan_id=1 might not exist)\n\n";

echo "Next steps:\n";
echo "1. Check if plan_id=1 exists in the database\n";
echo "2. Check if user_id=1 exists in the database\n";
echo "3. Check the backend logs for detailed error information\n";
echo "4. Test with a real payment through the app\n"; 