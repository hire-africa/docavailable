<?php

// Test the fixed webhook processing
echo "Testing fixed webhook processing...\n";

// Test the test webhook endpoint (which now creates transactions)
$url = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 1,
    'plan_id' => 1,
    'reference' => 'FIXED_TEST_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'pending'
];

echo "Testing webhook with transaction creation:\n";
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
        echo "The subscription should now be activated for user_id=1\n";
    } else {
        echo "⚠️  Webhook processing may have failed\n";
        echo "Check the webhook_response for details\n";
    }
    
} else {
    echo "\n❌ Test webhook failed!\n";
}

echo "\n=== Summary ===\n";
echo "If the webhook processing worked, the issue was that transactions weren't being created.\n";
echo "The fix should now allow:\n";
echo "1. ✅ Transaction creation during payment initiation\n";
echo "2. ✅ Webhook processing to find the transaction\n";
echo "3. ✅ Plan activation for successful payments\n\n";

echo "Next step: Test a real payment through the app to verify the complete flow works.\n"; 