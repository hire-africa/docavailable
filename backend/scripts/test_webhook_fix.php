<?php

// Test the webhook fix by simulating a successful payment
echo "Testing webhook fix for subscription creation...\n";

$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Test data based on your subscription data
$webhookData = [
    'transaction_id' => 'FIX_TEST_' . time(),
    'reference' => 'FIX_REF_' . time(),
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
        'user_id' => 11, // From your subscription data
        'plan_id' => 5,  // From your subscription data
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
echo "1. ✅ Added missing required fields to subscription creation:\n";
echo "   - start_date\n";
echo "   - end_date\n";
echo "   - is_active\n";
echo "   - payment_status = 'completed'\n";
echo "   - total_text_sessions, total_voice_calls, total_video_calls\n";
echo "\n2. ✅ Added default values to Plan model\n";
echo "3. ✅ Improved error handling with stack traces\n";
echo "4. ✅ Created migration for missing plan fields\n";
echo "\nThe main issue was missing required fields in subscription creation.\n";
echo "Now payments should properly create subscriptions!\n"; 