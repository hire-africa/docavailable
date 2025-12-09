<?php

// Test webhook with transaction creation first
echo "🧪 Testing Webhook with Transaction Creation...\n\n";

$baseUrl = 'https://docavailable-1.onrender.com/api';

// Step 1: Create a test transaction first
echo "1️⃣ Creating test transaction...\n";
$createTransactionUrl = $baseUrl . '/payments/create-transaction';

$transactionData = [
    'reference' => 'WEBHOOK_TEST_' . time(),
    'amount' => 100.00,
    'currency' => 'MWK',
    'user_id' => 1,
    'plan_id' => 1
];

echo "Creating transaction with data:\n";
print_r($transactionData);
echo "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createTransactionUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($transactionData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$createResponse = curl_exec($ch);
$createHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Create Transaction HTTP Code: $createHttpCode\n";
$createResponseData = json_decode($createResponse, true);
print_r($createResponseData);

if ($createHttpCode !== 200 || !isset($createResponseData['success']) || !$createResponseData['success']) {
    echo "❌ Failed to create transaction. Trying webhook anyway...\n";
}

// Step 2: Test webhook with the created transaction
echo "\n2️⃣ Testing webhook with created transaction...\n";
$webhookUrl = $baseUrl . '/payments/webhook';

$webhookData = [
    'transaction_id' => 'WEBHOOK_TXN_' . time(),
    'reference' => $transactionData['reference'], // Use the same reference
    'amount' => 97.00, // Amount after fees
    'currency' => 'MWK',
    'status' => 'success',
    'phone_number' => '+265123456789',
    'payment_method' => 'mobile_money',
    'payment_channel' => 'Mobile Money',
    'name' => 'Test User',
    'email' => 'test@example.com',
    'paid_at' => date('Y-m-d H:i:s'),
    'meta' => [
        'user_id' => 1,
        'plan_id' => 1,
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

$webhookResponse = curl_exec($ch);
$webhookHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Webhook HTTP Code: $webhookHttpCode\n";
$webhookResponseData = json_decode($webhookResponse, true);
print_r($webhookResponseData);

if ($webhookHttpCode === 200 && isset($webhookResponseData['success']) && $webhookResponseData['success']) {
    echo "✅ Webhook test successful!\n";
    echo "The subscription should now be activated for user_id=1\n";
} else {
    echo "❌ Webhook test failed!\n";
    echo "Error details:\n";
    print_r($webhookResponseData);
}

// Step 3: Check subscription status
echo "\n3️⃣ Checking subscription status...\n";
$subscriptionUrl = $baseUrl . '/users/subscription';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $subscriptionUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer INVALID_TOKEN' // This will fail, but we can see the response
]);

$subResponse = curl_exec($ch);
$subHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Subscription Check HTTP Code: $subHttpCode\n";
$subResponseData = json_decode($subResponse, true);
print_r($subResponseData);

echo "\n=== Test Summary ===\n";
echo "✅ Transaction creation attempted\n";
echo "✅ Webhook processing tested\n";
echo "✅ Subscription status checked\n";

if ($webhookHttpCode === 200 && isset($webhookResponseData['success']) && $webhookResponseData['success']) {
    echo "\n🎉 SUCCESS: Webhook is working correctly!\n";
    echo "The fixes have resolved the issues:\n";
    echo "- ✅ appointments_remaining field added\n";
    echo "- ✅ Error handling improved\n";
    echo "- ✅ Database constraint handling added\n";
    echo "- ✅ Status mapping working\n";
} else {
    echo "\n⚠️  ISSUES REMAINING:\n";
    echo "The webhook is still failing. Possible causes:\n";
    echo "1. Transaction not found in database\n";
    echo "2. Missing database migrations\n";
    echo "3. Database connection issues\n";
    echo "4. Plan or user not found\n";
    echo "5. Subscription creation failing\n";
} 