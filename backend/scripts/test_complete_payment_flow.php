<?php

// Test the complete payment flow
echo "Testing complete payment flow for subscription creation...\n";

$baseUrl = 'https://docavailable-1.onrender.com';

// Step 1: Create a test transaction first
$reference = 'COMPLETE_TEST_' . time();
$transactionData = [
    'transaction_id' => $reference,
    'reference' => $reference,
    'amount' => 50.00,
    'currency' => 'USD',
    'status' => 'pending',
    'payment_method' => 'mobile_money',
    'gateway' => 'paychangu',
    'webhook_data' => [
        'meta' => [
            'user_id' => 11,
            'plan_id' => 5,
        ],
        'plan' => [
            'name' => 'Executive Life',
            'price' => 50,
            'currency' => 'USD',
            'text_sessions' => 10,
            'voice_calls' => 2,
            'video_calls' => 1,
            'duration' => 30,
        ],
    ],
];

echo "Step 1: Creating test transaction...\n";
print_r($transactionData);
echo "\n";

// Create transaction via API (if available) or simulate it
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/payments/test-webhook');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'user_id' => 11,
    'plan_id' => 5,
    'reference' => $reference,
    'amount' => 50.00,
    'currency' => 'USD'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test webhook response (HTTP $httpCode):\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "\n✅ Test webhook processed successfully!\n";
    echo "The subscription should now be activated for user_id=11\n";
} else {
    echo "\n❌ Test webhook failed!\n";
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