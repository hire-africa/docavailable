<?php

// Debug live payment system
echo "🔍 LIVE PAYMENT SYSTEM DEBUG\n";
echo "============================\n\n";

// Test 1: Check if the fixes are deployed
echo "1. Testing if fixes are deployed...\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

// Create a test transaction first
$reference = 'DEBUG_TEST_' . time();
$testData = [
    'transaction_id' => 'DEBUG_TXN_' . time(),
    'reference' => $reference,
    'amount' => 50.00,
    'currency' => 'USD',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Debug Test User',
    'email' => 'debug@test.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 11,
        'plan_id' => 5,
    ]
];

echo "Testing webhook with data:\n";
print_r($testData);
echo "\n";

// Test webhook
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Curl Error: " . ($curlError ?: 'None') . "\n";
echo "Response:\n";
$responseData = json_decode($response, true);
print_r($responseData);

// Test 2: Check if the transaction was created
echo "\n2. Checking if transaction was created...\n";
$checkUrl = 'https://docavailable-1.onrender.com/api/payments/status?transaction_id=' . $testData['transaction_id'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $checkUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$statusResponse = curl_exec($ch);
$statusHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Status Check HTTP Code: $statusHttpCode\n";
echo "Status Response:\n";
$statusData = json_decode($statusResponse, true);
print_r($statusData);

// Test 3: Check if subscription was created
echo "\n3. Checking if subscription was created...\n";
$subscriptionUrl = 'https://docavailable-1.onrender.com/api/users/11/subscription';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $subscriptionUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$subResponse = curl_exec($ch);
$subHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Subscription Check HTTP Code: $subHttpCode\n";
echo "Subscription Response:\n";
$subData = json_decode($subResponse, true);
print_r($subData);

// Test 4: Check backend logs (if accessible)
echo "\n4. Checking backend logs...\n";
$logsUrl = 'https://docavailable-1.onrender.com/api/debug/logs';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $logsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$logsResponse = curl_exec($ch);
$logsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($logsHttpCode === 200) {
    echo "Logs Response:\n";
    $logsData = json_decode($logsResponse, true);
    print_r($logsData);
} else {
    echo "Logs endpoint not accessible (HTTP $logsHttpCode)\n";
}

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "✅ Webhook processed successfully\n";
} else {
    echo "❌ Webhook failed\n";
    echo "Possible issues:\n";
    echo "1. Transaction not found in database\n";
    echo "2. Missing required fields in subscription creation\n";
    echo "3. Database constraint violations\n";
    echo "4. Plan not found (plan_id=5)\n";
    echo "5. User not found (user_id=11)\n";
}

if ($subHttpCode === 200 && isset($subData['subscription'])) {
    echo "✅ Subscription exists\n";
    $subscription = $subData['subscription'];
    echo "Subscription details:\n";
    echo "- ID: " . $subscription['id'] . "\n";
    echo "- Plan ID: " . $subscription['plan_id'] . "\n";
    echo "- Is Active: " . ($subscription['is_active'] ? 'Yes' : 'No') . "\n";
    echo "- Text Sessions Remaining: " . $subscription['text_sessions_remaining'] . "\n";
} else {
    echo "❌ No subscription found for user 11\n";
}

echo "\n🎯 RECOMMENDED ACTIONS:\n";
echo "1. Check if the fixes are deployed on the live server\n";
echo "2. Run the database migration: php artisan migrate\n";
echo "3. Check if plan_id=5 exists in the database\n";
echo "4. Check if user_id=11 exists in the database\n";
echo "5. Check backend logs for specific error messages\n";
echo "6. Test with a real payment instead of simulated data\n";

echo "\n🔧 IF STILL FAILING:\n";
echo "1. The fixes might not be deployed yet\n";
echo "2. Database migration might not be run\n";
echo "3. There might be a different error in the webhook processing\n";
echo "4. The transaction might not be found in the database\n";
echo "5. There might be a database connection issue\n"; 