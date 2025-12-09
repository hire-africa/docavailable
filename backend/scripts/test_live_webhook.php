<?php

// Test the live webhook with the fixes applied
echo "Testing live webhook with subscription creation fixes...\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Test data that should work with the fixes
$webhookData = [
    'transaction_id' => 'LIVE_TEST_' . time(),
    'reference' => 'LIVE_REF_' . time(),
    'amount' => 50.00,
    'currency' => 'USD',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11,
        'plan_id' => 5,
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
    echo "The subscription should now be activated for user_id=11\n";
} else {
    echo "\n❌ Webhook failed!\n";
    echo "Error details:\n";
    print_r($responseData);
}

echo "\n=== Summary of Fixes Applied ===\n";
echo "1. ✅ Fixed activatePlanForUser method:\n";
echo "   - Added start_date and end_date\n";
echo "   - Added is_active = true\n";
echo "   - Added payment_status = 'completed'\n";
echo "   - Added total_* fields\n";
echo "   - Added null coalescing for plan fields\n";
echo "\n2. ✅ Fixed updateUserSubscription method:\n";
echo "   - Added start_date and end_date\n";
echo "   - Added is_active = true\n";
echo "   - Added payment_status = 'completed'\n";
echo "   - Added total_* fields\n";
echo "\n3. ✅ Added default values to Plan model\n";
echo "4. ✅ Improved error handling with stack traces\n";
echo "5. ✅ Created migration for missing plan fields\n";
echo "\nThe main issue was missing required fields in subscription creation.\n";
echo "Now payments should properly create subscriptions!\n";
echo "\nKey fixes:\n";
echo "- start_date and end_date were missing\n";
echo "- is_active field was missing\n";
echo "- payment_status was 'paid' instead of 'completed'\n";
echo "- total_* fields were missing\n";
echo "- Plan fields had no null coalescing\n";
echo "\nIf the webhook still fails, the issue might be:\n";
echo "1. Database migration not run on live server\n";
echo "2. Plan model missing required fields in database\n";
echo "3. Database connection issues\n"; 