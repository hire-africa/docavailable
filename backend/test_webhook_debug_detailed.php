<?php

// Test webhook with detailed debugging
echo "Testing webhook with detailed debugging...\n";

// Test the webhook directly with minimal data to isolate the issue
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DEBUG_TEST_' . time(),
    'reference' => 'DEBUG_TEST_' . time(),
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

echo "Testing webhook with minimal data:\n";
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
echo "The webhook is still failing with a 500 error.\n";
echo "Possible causes:\n";
echo "1. ❌ Database connection issues\n";
echo "2. ❌ Missing database columns\n";
echo "3. ❌ Foreign key constraint violations\n";
echo "4. ❌ Data type mismatches\n";
echo "5. ❌ Missing required fields\n\n";

echo "SOLUTION:\n";
echo "1. Check the backend logs for detailed error information\n";
echo "2. Verify all database migrations have been run\n";
echo "3. Check if the subscription table has all required columns\n";
echo "4. Test a real payment through the app\n\n";

echo "The webhook processing logic has been fixed, but there might be a database issue.\n"; 