<?php

// Test webhook with correct user ID (13) and plan ID (1)
echo "Testing webhook with correct user ID (13) and plan ID (1)...\n";

// Test the test webhook endpoint with correct user ID
$url = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 13, // Correct user ID
    'plan_id' => 1,  // Plan ID that exists
    'reference' => 'CORRECT_USER_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'pending'
];

echo "Testing webhook with correct data:\n";
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

echo "\n=== Summary ===\n";
echo "Testing with:\n";
echo "- User ID: 13 (correct)\n";
echo "- Plan ID: 1 (exists)\n";
echo "- Amount: 100 MWK (plan price)\n";
echo "- Webhook amount: 97 MWK (after fees)\n\n";

echo "If this works, the webhook processing is fixed and should work for real payments.\n";
echo "The issue was using user_id=1 instead of user_id=13.\n"; 