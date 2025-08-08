<?php

// Test webhook with simpler plan configuration
echo "Testing webhook with simpler plan configuration...\n";

// Test the test webhook endpoint with minimal data
$url = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 13,
    'plan_id' => 1,
    'reference' => 'SIMPLE_TEST_' . time(),
    'amount' => 100.00, // Make sure this matches the plan price
    'currency' => 'MWK',
    'status' => 'pending'
];

echo "Testing with minimal data:\n";
print_r($testData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
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
    echo "\n✅ Test webhook processed successfully!\n";
    
    // Check if the webhook response shows success
    if (isset($responseData['webhook_response']['original']['success'])) {
        echo "✅ Webhook processing worked!\n";
        echo "The subscription should now be activated for user_id=13\n";
    } else {
        echo "⚠️  Webhook processing may have failed\n";
        echo "Check the webhook_response for details\n";
    }
    
} else {
    echo "\n❌ Test webhook failed!\n";
}

echo "\n=== Possible Issues ===\n";
echo "The webhook is still failing with a 500 error. Possible causes:\n";
echo "1. ❌ Plan price mismatch - plan_id=1 might not have price=100 MWK\n";
echo "2. ❌ Database connection issues during transaction processing\n";
echo "3. ❌ Missing plan fields (text_sessions, voice_calls, video_calls, duration)\n";
echo "4. ❌ Subscription table structure issues\n";
echo "5. ❌ Database transaction rollback issues\n\n";

echo "SOLUTION:\n";
echo "1. Check the plan price for plan_id=1 in your database\n";
echo "2. Make sure plan_id=1 has all required fields (text_sessions, voice_calls, etc.)\n";
echo "3. Check if the subscription table structure is correct\n";
echo "4. Test a real payment through the app\n\n";

echo "The webhook processing logic might have an issue with the plan data or database structure.\n"; 