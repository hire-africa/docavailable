<?php

// Test core webhook functionality after deployment
echo "🔍 TESTING CORE WEBHOOK AFTER DEPLOYMENT\n";
echo "=========================================\n\n";

// Test 1: Check if the main webhook endpoint works
echo "1. Testing main webhook endpoint...\n";
$webhookUrl = 'https://docavailable-1.onrender.com/api/payments/webhook';

$webhookData = [
    'transaction_id' => 'DEPLOY_TEST_' . time(),
    'reference' => 'DEPLOY_REF_' . time(),
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

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "Webhook HTTP Code: $httpCode\n";
echo "Curl Error: " . ($curlError ?: 'None') . "\n";
$responseData = json_decode($response, true);
echo "Response:\n";
print_r($responseData);

// Test 2: Check if subscription was created
echo "\n2. Checking if subscription was created...\n";
$subscriptionUrl = 'https://docavailable-1.onrender.com/api/users/11/subscription';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $subscriptionUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Subscription Check HTTP Code: $httpCode\n";
$subscriptionData = json_decode($response, true);

if ($httpCode === 200 && isset($subscriptionData['subscription'])) {
    echo "✅ Subscription created successfully!\n";
    $subscription = $subscriptionData['subscription'];
    echo "- ID: " . $subscription['id'] . "\n";
    echo "- Plan ID: " . $subscription['plan_id'] . "\n";
    echo "- Is Active: " . ($subscription['is_active'] ? 'Yes' : 'No') . "\n";
    echo "- Text Sessions Remaining: " . $subscription['text_sessions_remaining'] . "\n";
} else {
    echo "❌ No subscription found\n";
    if (isset($subscriptionData['error'])) {
        echo "Error: " . $subscriptionData['error'] . "\n";
    }
}

// Test 3: Check if payment initiation works
echo "\n3. Testing payment initiation endpoint...\n";
$initiateUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 5
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $initiateUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Payment Initiation HTTP Code: $httpCode\n";
$responseData = json_decode($response, true);

if ($httpCode === 401) {
    echo "✅ Payment initiation endpoint exists (requires authentication)\n";
} else {
    echo "❌ Payment initiation endpoint not accessible\n";
}

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 DEPLOYMENT ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

if ($httpCode === 200 && isset($responseData['success']) && $responseData['success']) {
    echo "🎉 SUCCESS! Webhook is working and creating subscriptions!\n";
    echo "The Buy Now button should now work perfectly!\n";
} else {
    echo "❌ Webhook is still failing\n";
    echo "Possible issues:\n";
    echo "1. Database migration not applied\n";
    echo "2. Plans table missing required fields\n";
    echo "3. Webhook processing logic still has issues\n";
    echo "4. Database connection problems\n";
}

echo "\n🎯 NEXT STEPS:\n";
echo "1. Test the Buy Now button in your app\n";
echo "2. Complete a real payment through PayChangu\n";
echo "3. Check if subscription is created after payment\n";
echo "4. If still failing, check the database structure\n"; 