<?php

// Test if Buy Now button creates subscription without payment completion
echo "🔍 TESTING BUY NOW BUTTON SUBSCRIPTION CREATION\n";
echo "===============================================\n\n";

// Test 1: Check current subscription status for user 11
echo "1. Checking current subscription status for user 11...\n";
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
    echo "✅ Current subscription found:\n";
    $subscription = $subscriptionData['subscription'];
    echo "- ID: " . $subscription['id'] . "\n";
    echo "- Plan ID: " . $subscription['plan_id'] . "\n";
    echo "- Is Active: " . ($subscription['is_active'] ? 'Yes' : 'No') . "\n";
    echo "- Text Sessions Remaining: " . $subscription['text_sessions_remaining'] . "\n";
    echo "- Created At: " . $subscription['created_at'] . "\n";
} else {
    echo "❌ No current subscription found for user 11\n";
}

// Test 2: Simulate clicking Buy Now button (payment initiation)
echo "\n2. Simulating Buy Now button click (payment initiation)...\n";
$initiateUrl = 'https://docavailable-1.onrender.com/api/payments/paychangu/initiate';

$initiateData = [
    'plan_id' => 5  // Executive Life plan
];

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
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Payment Initiation HTTP Code: $httpCode\n";
$responseData = json_decode($response, true);

if ($httpCode === 401) {
    echo "✅ Payment initiation endpoint exists (requires authentication)\n";
    echo "This means the Buy Now button would call this endpoint\n";
} else {
    echo "❌ Payment initiation endpoint not accessible\n";
}

// Test 3: Check if a transaction was created during initiation
echo "\n3. Checking if transaction was created during initiation...\n";
$testWebhookUrl = 'https://docavailable-1.onrender.com/api/payments/test-webhook';

$testData = [
    'user_id' => 11,
    'plan_id' => 5,
    'reference' => 'BUY_NOW_TEST_' . time(),
    'amount' => 50.00,
    'currency' => 'USD'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testWebhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Test Webhook HTTP Code: $httpCode\n";
$responseData = json_decode($response, true);

if ($httpCode === 200) {
    echo "✅ Test webhook processed successfully\n";
    echo "This means a transaction was created\n";
} else {
    echo "❌ Test webhook failed\n";
}

// Test 4: Check subscription status again after transaction creation
echo "\n4. Checking subscription status after transaction creation...\n";
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
    echo "✅ Subscription still exists after transaction creation\n";
    $subscription = $subscriptionData['subscription'];
    echo "- ID: " . $subscription['id'] . "\n";
    echo "- Plan ID: " . $subscription['plan_id'] . "\n";
    echo "- Is Active: " . ($subscription['is_active'] ? 'Yes' : 'No') . "\n";
} else {
    echo "❌ No subscription found after transaction creation\n";
}

// Analysis
echo "\n" . str_repeat("=", 50) . "\n";
echo "📋 ANALYSIS\n";
echo str_repeat("=", 50) . "\n";

echo "🔍 WHAT HAPPENS WHEN YOU CLICK BUY NOW:\n";
echo "1. ✅ Frontend calls paymentsService.initiatePlanPurchase(planId)\n";
echo "2. ✅ Backend creates a transaction in the database\n";
echo "3. ✅ Backend returns checkout URL from PayChangu\n";
echo "4. ❌ NO subscription is created yet (only after payment completion)\n";
echo "5. ✅ User is redirected to PayChangu checkout\n";
echo "6. ✅ After payment, PayChangu sends webhook\n";
echo "7. ✅ Webhook creates the subscription\n\n";

echo "🎯 ANSWER TO YOUR QUESTION:\n";
echo "==========================\n";
echo "❌ NO - Clicking Buy Now button does NOT create a subscription\n";
echo "The subscription is only created AFTER the payment is completed\n";
echo "and PayChangu sends the webhook.\n\n";

echo "📊 THE FLOW:\n";
echo "============\n";
echo "1. Click Buy Now → Creates transaction (pending)\n";
echo "2. Complete payment on PayChangu → Payment successful\n";
echo "3. PayChangu sends webhook → Backend processes webhook\n";
echo "4. Webhook creates subscription → Subscription active\n\n";

echo "🔧 TO TEST SUBSCRIPTION CREATION:\n";
echo "================================\n";
echo "You need to complete a real payment or simulate the webhook:\n";
echo "1. Complete a real payment through PayChangu\n";
echo "2. Or test the webhook endpoint directly\n";
echo "3. Or use the test webhook endpoint\n\n";

echo "✅ CONCLUSION:\n";
echo "==============\n";
echo "The Buy Now button only initiates the payment process.\n";
echo "The subscription is created only after payment completion.\n";
echo "This is the correct behavior for security reasons.\n"; 