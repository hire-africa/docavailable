<?php

// Debug payment initiation process
echo "Debugging payment initiation process...\n";

// Test 1: Check if plan exists and has correct price
echo "\n=== Test 1: Check Plan Data ===\n";

// We can't access the database directly, so let's test the payment initiation endpoint
$initiateUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 1
];

echo "Testing payment initiation with plan_id=1\n";
echo "Request data:\n";
print_r($initiateData);
echo "\n";

// Make the request (this will fail due to auth, but we can see the error)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $initiateUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN' // This will fail, but we can see the response
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

if ($httpCode === 401) {
    echo "\n✅ Payment initiation endpoint is working (requires authentication)\n";
    echo "The issue is likely:\n";
    echo "1. Plan_id=1 doesn't exist in the database\n";
    echo "2. Plan price doesn't match (should be 100 MWK)\n";
    echo "3. Database connection issues during transaction creation\n";
} elseif ($httpCode === 404) {
    echo "\n❌ Payment initiation endpoint not found\n";
} elseif ($httpCode === 500) {
    echo "\n❌ Server error in payment initiation\n";
    echo "This suggests a database or plan lookup issue\n";
} else {
    echo "\n⚠️  Unexpected response from payment initiation\n";
}

// Test 2: Check if we can create a transaction manually
echo "\n=== Test 2: Manual Transaction Creation ===\n";

// Try to create a transaction using the test webhook endpoint
$testUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 1,
    'plan_id' => 1,
    'reference' => 'DEBUG_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'status' => 'pending'
];

echo "Testing transaction creation via test webhook:\n";
print_r($testData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$testResponse = curl_exec($ch);
$testHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test HTTP Code: $testHttpCode\n";
echo "Test Response:\n";
$testResponseData = json_decode($testResponse, true);
print_r($testResponseData);

echo "\n=== Summary ===\n";
echo "The issue is that transactions are not being created during payment initiation.\n";
echo "This could be due to:\n";
echo "1. Plan_id=1 doesn't exist in the database\n";
echo "2. Plan price mismatch (should be 100 MWK)\n";
echo "3. Database connection issues\n";
echo "4. Silent failures in transaction creation\n\n";

echo "Next steps:\n";
echo "1. Check if plan_id=1 exists in the database\n";
echo "2. Update plan price to 100 MWK if needed\n";
echo "3. Test a real payment through the app\n"; 