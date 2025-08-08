<?php

// Test webhook script
$url = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

// Test data - you can modify these values
$testData = [
    'user_id' => 1, // Replace with actual user ID
    'plan_id' => 1, // Replace with actual plan ID
    'reference' => 'PLAN_7fe13f9b-7e01-442e-a55b-0534e7faec51' // Use the reference from your transaction
];

echo "Testing webhook with data:\n";
print_r($testData);
echo "\n";

// Make the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
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
    echo "\n✅ Webhook test successful!\n";
} else {
    echo "\n❌ Webhook test failed!\n";
} 