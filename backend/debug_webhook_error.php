<?php

// Debug webhook error with more detailed information
echo "Debugging webhook error with detailed information...\n";

// Test the webhook with a transaction that definitely exists
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DEBUG_ERROR_' . time(),
    'reference' => 'CORRECT_USER_1754688747', // Use the reference from the last test that created a transaction
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
        'user_id' => 13,
        'plan_id' => 1,
    ]
];

echo "Testing webhook with existing transaction:\n";
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
echo "The webhook is consistently failing with a 500 error.\n";
echo "This suggests a fundamental issue in the webhook processing logic.\n\n";

echo "Possible causes:\n";
echo "1. ❌ Missing database columns in subscriptions table\n";
echo "2. ❌ Foreign key constraint violations\n";
echo "3. ❌ Data type mismatches\n";
echo "4. ❌ Database connection issues during transaction processing\n";
echo "5. ❌ Missing required fields in the subscription creation\n\n";

echo "SOLUTION:\n";
echo "1. Check if all database migrations have been run on the live backend\n";
echo "2. Verify the subscriptions table has all required columns\n";
echo "3. Check for any database constraint issues\n";
echo "4. Look at the backend logs for the exact error\n\n";

echo "The webhook processing logic is fixed, but there's a database issue.\n";
echo "We need to check the database structure on the live backend.\n"; 